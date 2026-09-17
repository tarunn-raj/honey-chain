export const roles = [
  "BEEKEEPER",
  "COLLECTION_CENTER",
  "LAB",
  "PROCESSOR",
  "KVIC_OFFICER",
  "ADMIN",
] as const;

export type Role = (typeof roles)[number];

export function getRoleFromCookie(cookieHeader: string | null): Role | null {
  const value = cookieHeader?.match(/(?:^|;\s*)role=([^;]+)/)?.[1];
  return roles.includes(value as Role) ? (value as Role) : null;
}