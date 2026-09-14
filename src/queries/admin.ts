import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/components/ui/toast";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/strings";
import type { UserStatus } from "@/lib/types";

const adminKeys = {
  users: ["admin", "users"] as const,
  settings: ["admin", "settings"] as const,
};

export function useAdminUsers() {
  return useQuery({
    queryKey: adminKeys.users,
    queryFn: () => api.admin.users(),
    select: (data) => data.items,
  });
}

export function useAdminSettings() {
  return useQuery({
    queryKey: adminKeys.settings,
    queryFn: () => api.admin.settings(),
  });
}

function useInvalidatingMutation<TVars, TResult>(
  mutationFn: (vars: TVars) => Promise<TResult>,
  extraKeys: readonly (readonly unknown[])[] = [],
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.users });
      void queryClient.invalidateQueries({ queryKey: adminKeys.settings });
      for (const key of extraKeys) {
        void queryClient.invalidateQueries({ queryKey: key });
      }
    },
    onError: (err) => toast.add({ title: errorMessage(err), type: "error" }),
  });
}

export function useSetUserStatus() {
  return useInvalidatingMutation(({ id, status }: { id: string; status: UserStatus }) =>
    api.admin.setUserStatus(id, status),
  );
}

export function useResetUserPassword() {
  return useInvalidatingMutation(({ id, password }: { id: string; password: string }) =>
    api.admin.resetPassword(id, password),
  );
}

export function useDeleteUser() {
  return useInvalidatingMutation((id: string) => api.admin.deleteUser(id));
}

export function useUpdateRegistrationSettings() {
  return useInvalidatingMutation(
    (patch: { registrationEnabled?: boolean; inviteCode?: string }) =>
      api.admin.updateSettings(patch),
    // registrationOpen lives on the public status endpoint too.
    [["system"]],
  );
}

export function useRegenerateInviteCode() {
  return useInvalidatingMutation(() => api.admin.regenerateInviteCode(), [["system"]]);
}
