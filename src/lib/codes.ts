// "K7XM4QPA" -> "K7XM-4QPA"
export function formatInviteCode(code: string): string {
  return code.replace(/(.{4})(?=.)/g, "$1-");
}
