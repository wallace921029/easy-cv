export type Role = "admin" | "user";
export type UserStatus = "active" | "disabled";

export type User = {
  id: string;
  username: string;
  role: Role;
};

export type Clip = {
  id: string;
  // Optional user-chosen label; null when unset.
  name: string | null;
  content: string;
  pinnedAt: number | null;
  createdAt: number;
  // Bumped only on content edits; updatedAt > createdAt means "edited".
  updatedAt: number;
  activeAt: number;
};

export type AdminUser = {
  id: string;
  username: string;
  role: Role;
  status: UserStatus;
  clipCount: number;
  createdAt: number;
  lastLoginAt: number | null;
};

export type RegistrationSettings = {
  registrationEnabled: boolean;
  inviteCode: string | null;
};

export type SystemStatus = {
  initialized: boolean;
  registrationOpen: boolean;
  maxTextBytes: number;
};

export type UserResponse = { user: User };
export type ClipListResponse = { items: Clip[]; nextCursor?: string | null };
export type ClipResponse = { clip: Clip };
export type CreateClipResponse = { clip: Clip; deduplicated: boolean };
export type AdminUserListResponse = { items: AdminUser[] };
export type AdminUserResponse = { user: AdminUser };
