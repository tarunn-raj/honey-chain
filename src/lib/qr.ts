import { createHmac } from "node:crypto";
import QRCode from "qrcode";

function secret() {
  const value = process.env.QR_SECRET;
  if (!value) throw new Error("QR_SECRET is required for QR signing.");
  return value;
}

export function makeUnitCode(batchCode: string, bottleNo: number): string {
  const normalizedBatch = batchCode.replace(/^HC-/, "").replace(/[^A-Za-z0-9-]/g, "");
  return `HC-${normalizedBatch}-${String(bottleNo).padStart(4, "0")}`;
}

export function signUnit(code: string): string {
  return createHmac("sha256", secret()).update(code).digest("hex").slice(0, 12);
}

export function makeVerificationUrl(code: string, host = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000") {
  return `${host.replace(/\/$/, "")}/verify/${encodeURIComponent(code)}?s=${signUnit(code)}`;
}

export async function generatePNGDataUrl(url: string): Promise<string> {
  return QRCode.toDataURL(url, {
    errorCorrectionLevel: "H",
    margin: 1,
    width: 420,
    color: { dark: "#3c2415", light: "#fffdf5" },
  });
}
