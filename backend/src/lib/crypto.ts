import crypto from "node:crypto";

export function randomToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

export function sha256(text: string): string {
  return crypto.createHash("sha256").update(text, "utf8").digest("hex");
}

// Hashing both sides first keeps the comparison constant-time even when the
// lengths differ (timingSafeEqual throws on length mismatch).
export function safeEqual(a: string, b: string): boolean {
  const ha = crypto.createHash("sha256").update(a, "utf8").digest();
  const hb = crypto.createHash("sha256").update(b, "utf8").digest();
  return crypto.timingSafeEqual(ha, hb);
}
