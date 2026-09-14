// "K7XM4QPA" -> "K7XM-4QPA"
export function formatInviteCode(code: string): string {
  return code.replace(/(.{4})(?=.)/g, "$1-");
}

export function normalizeCode(input: string): string {
  return input.replace(/[\s-]+/g, "").toUpperCase();
}

const PASSWORD_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";

// crypto.getRandomValues also works in non-secure contexts (unlike randomUUID).
export function generatePassword(length = 12): string {
  const buf = new Uint32Array(length);
  crypto.getRandomValues(buf);
  return Array.from(buf, (n) => PASSWORD_ALPHABET[n % PASSWORD_ALPHABET.length]).join("");
}
