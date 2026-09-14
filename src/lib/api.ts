import axios, { AxiosError } from "axios";
import type {
  AdminUserListResponse,
  AdminUserResponse,
  ClipListResponse,
  ClipResponse,
  CreateClipResponse,
  RegistrationSettings,
  SystemStatus,
  UserResponse,
  UserStatus,
} from "./types";

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

// Minimal pub/sub for the "session expired" event; the route guard subscribes
// and redirects to /login?expired=1.
const sessionExpiredListeners = new Set<() => void>();
export const sessionEvents = {
  subscribe(listener: () => void): () => void {
    sessionExpiredListeners.add(listener);
    return () => {
      sessionExpiredListeners.delete(listener);
    };
  },
  emit(): void {
    for (const listener of [...sessionExpiredListeners]) {
      listener();
    }
  },
};

// 401s from these endpoints mean "wrong credentials" or "logged out", never
// an expired session mid-use.
const EXPIRED_EXCLUDED_PATHS = ["/auth/me", "/auth/login", "/setup", "/auth/register"];

const http = axios.create({ baseURL: "/api" });
http.interceptors.response.use(
  (res) => res,
  (err: unknown) => {
    const apiError = toApiError(err);
    const url = err instanceof AxiosError ? (err.config?.url ?? "") : "";
    if (apiError.status === 401 && !EXPIRED_EXCLUDED_PATHS.some((p) => url.startsWith(p))) {
      sessionEvents.emit();
    }
    return Promise.reject(apiError);
  },
);

function toApiError(err: unknown): ApiError {
  if (axios.isAxiosError(err)) {
    if (err.response) {
      const data = err.response.data as
        | { error?: { code?: string; message?: string } }
        | undefined;
      return new ApiError(
        err.response.status,
        data?.error?.code ?? "INTERNAL_ERROR",
        data?.error?.message ?? "请求失败",
      );
    }
    return new ApiError(0, "NETWORK_ERROR", "网络异常，请重试");
  }
  return new ApiError(0, "NETWORK_ERROR", "网络异常，请重试");
}

type QueryParams = Record<string, string | number | undefined>;

async function get<T>(url: string, params?: QueryParams): Promise<T> {
  const res = await http.get<T>(url, { params });
  return res.data;
}

async function post<T>(url: string, body?: unknown): Promise<T> {
  const res = await http.post<T>(url, body);
  return res.data;
}

async function put<T>(url: string, body: unknown): Promise<T> {
  const res = await http.put<T>(url, body);
  return res.data;
}

async function patch<T>(url: string, body: unknown): Promise<T> {
  const res = await http.patch<T>(url, body);
  return res.data;
}

async function del(url: string): Promise<void> {
  await http.delete(url);
}

export const api = {
  system: {
    status: () => get<SystemStatus>("/system/status"),
  },
  auth: {
    me: () => get<UserResponse>("/auth/me"),
    login: (username: string, password: string) =>
      post<UserResponse>("/auth/login", { username, password }),
    register: (username: string, password: string, inviteCode: string) =>
      post<UserResponse>("/auth/register", { username, password, inviteCode }),
    setup: (username: string, password: string, initCode: string) =>
      post<UserResponse>("/setup", { username, password, initCode }),
    logout: () => post<void>("/auth/logout"),
    changePassword: (currentPassword: string, newPassword: string) =>
      put<void>("/auth/password", { currentPassword, newPassword }),
  },
  clips: {
    list: (params: { cursor?: string; q?: string; limit?: number }) =>
      get<ClipListResponse>("/clips", params),
    pinned: () => get<ClipListResponse>("/clips", { pinned: "true" }),
    create: (content: string) => post<CreateClipResponse>("/clips", { content }),
    update: (id: string, body: { content?: string; pinned?: boolean }) =>
      patch<ClipResponse>(`/clips/${id}`, body),
    remove: (id: string) => del(`/clips/${id}`),
    restore: (id: string) => post<ClipResponse>(`/clips/${id}/restore`),
  },
  admin: {
    users: () => get<AdminUserListResponse>("/admin/users"),
    setUserStatus: (id: string, status: UserStatus) =>
      patch<AdminUserResponse>(`/admin/users/${id}`, { status }),
    resetPassword: (id: string, password: string) =>
      put<void>(`/admin/users/${id}/password`, { password }),
    deleteUser: (id: string) => del(`/admin/users/${id}`),
    settings: () => get<RegistrationSettings>("/admin/settings"),
    updateSettings: (body: { registrationEnabled?: boolean; inviteCode?: string }) =>
      patch<RegistrationSettings>("/admin/settings", body),
    regenerateInviteCode: () => post<RegistrationSettings>("/admin/settings/invite-code"),
  },
};
