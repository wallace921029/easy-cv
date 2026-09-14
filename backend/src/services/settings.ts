import type { DbOrTx } from "../db/client.js";
import { settings } from "../db/schema.js";
import { generateInviteCode } from "../lib/codes.js";

export type RegistrationSettings = {
  registrationEnabled: boolean;
  // Normalized form (uppercase, no separators).
  inviteCode: string | null;
};

const KEY_REGISTRATION_ENABLED = "registration_enabled";
const KEY_INVITE_CODE = "invite_code";

export function getRegistrationSettings(db: DbOrTx): RegistrationSettings {
  const rows = db.select().from(settings).all();
  const map = new Map(rows.map((row) => [row.key, row.value]));
  return {
    registrationEnabled: map.get(KEY_REGISTRATION_ENABLED) === "true",
    inviteCode: map.get(KEY_INVITE_CODE) ?? null,
  };
}

function upsert(db: DbOrTx, key: string, value: string): void {
  db.insert(settings)
    .values({ key, value })
    .onConflictDoUpdate({ target: settings.key, set: { value } })
    .run();
}

export function updateRegistrationSettings(
  db: DbOrTx,
  patch: { registrationEnabled?: boolean; inviteCode?: string },
): RegistrationSettings {
  if (patch.inviteCode !== undefined) {
    upsert(db, KEY_INVITE_CODE, patch.inviteCode);
  }
  if (patch.registrationEnabled !== undefined) {
    upsert(db, KEY_REGISTRATION_ENABLED, patch.registrationEnabled ? "true" : "false");
  }
  let current = getRegistrationSettings(db);
  // Open registration must always have a usable invite code.
  if (current.registrationEnabled && current.inviteCode === null) {
    upsert(db, KEY_INVITE_CODE, generateInviteCode());
    current = getRegistrationSettings(db);
  }
  return current;
}

export function regenerateInviteCode(db: DbOrTx): RegistrationSettings {
  upsert(db, KEY_INVITE_CODE, generateInviteCode());
  return getRegistrationSettings(db);
}
