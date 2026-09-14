import { hash, verify } from "@node-rs/argon2";

// Generated once at module load so that a login attempt for a non-existent
// user pays the same argon2 cost as a real one and the timing stays uniform.
export const DUMMY_HASH = await hash("dummy-password");

export async function hashPassword(password: string): Promise<string> {
  // @node-rs/argon2 defaults to argon2id.
  return hash(password);
}

export async function verifyPassword(passwordHash: string, password: string): Promise<boolean> {
  try {
    return await verify(passwordHash, password);
  } catch {
    return false;
  }
}
