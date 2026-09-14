import crypto from "node:crypto";

// Codes are compared after stripping whitespace/hyphens and uppercasing.
export function normalizeCode(input: string): string {
  return input.replace(/[\s-]+/g, "").toUpperCase();
}

// Excludes ambiguous characters: 0/O, 1/I/L.
const INVITE_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function generateInviteCode(): string {
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += INVITE_CODE_ALPHABET[crypto.randomInt(INVITE_CODE_ALPHABET.length)];
  }
  return code;
}
