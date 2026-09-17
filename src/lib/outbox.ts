"use client";

export type QueuedMutation = {
  id: string;
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string;
  createdAt: number;
};

const databaseName = "honey-chain-outbox";
const storeName = "mutations";

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(storeName, { keyPath: "id" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getPendingMutations(): Promise<QueuedMutation[]> {
  if (typeof indexedDB === "undefined") return [];
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const request = database.transaction(storeName, "readonly").objectStore(storeName).getAll();
    request.onsuccess = () => resolve((request.result as QueuedMutation[]).sort((a, b) => a.createdAt - b.createdAt));
    request.onerror = () => reject(request.error);
  });
}

export async function pendingMutationCount() {
  if (typeof indexedDB === "undefined") return 0;
  const database = await openDatabase();
  return new Promise<number>((resolve, reject) => {
    const request = database.transaction(storeName, "readonly").objectStore(storeName).count();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function enqueueMutation(mutation: Omit<QueuedMutation, "id" | "createdAt">) {
  if (typeof indexedDB === "undefined") return;
  const database = await openDatabase();
  const id = await mutationIdentity(mutation);
  const existing = await new Promise<QueuedMutation | undefined>((resolve, reject) => {
    const request = database.transaction(storeName, "readonly").objectStore(storeName).get(id);
    request.onsuccess = () => resolve(request.result as QueuedMutation | undefined);
    request.onerror = () => reject(request.error);
  });
  const queued: QueuedMutation = { ...mutation, id, createdAt: existing?.createdAt ?? Date.now() };
  await new Promise<void>((resolve, reject) => {
    const request = database.transaction(storeName, "readwrite").objectStore(storeName).put(queued);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function removeMutation(id: string) {
  const database = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const request = database.transaction(storeName, "readwrite").objectStore(storeName).delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function mutationIdentity(mutation: Omit<QueuedMutation, "id" | "createdAt">) {
  const identity = `${mutation.method}\n${mutation.url}\n${mutation.body}`;
  if (globalThis.crypto?.subtle) {
    const bytes = new TextEncoder().encode(identity);
    const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
    return `mutation-${Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
  }

  let hash = 2166136261;
  for (let index = 0; index < identity.length; index += 1) {
    hash ^= identity.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `mutation-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

export async function replayOutbox() {
  const mutations = await getPendingMutations();
  let replayed = 0;
  for (const mutation of mutations) {
    try {
      const response = await fetch(mutation.url, { method: mutation.method, headers: mutation.headers, body: mutation.body });
      if (response.ok) {
        await removeMutation(mutation.id);
        replayed += 1;
      } else break;
    } catch {
      break;
    }
  }
  return replayed;
}

export async function submitMutation(url: string, payload: unknown) {
  const mutation = { url, method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) };
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    await enqueueMutation(mutation);
    return { queued: true, response: null };
  }
  try {
    const response = await fetch(url, mutation);
    return { queued: false, response };
  } catch {
    await enqueueMutation(mutation);
    return { queued: true, response: null };
  }
}
