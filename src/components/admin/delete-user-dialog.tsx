import { useEffect, useState } from "react";
import { strings } from "@/lib/strings";
import type { AdminUser } from "@/lib/types";
import { useDeleteUser } from "@/queries/admin";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";

export function DeleteUserDialog({
  user,
  open,
  onOpenChange,
}: {
  user: AdminUser | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const deleteUser = useDeleteUser();
  const [confirmation, setConfirmation] = useState("");

  useEffect(() => {
    if (open) {
      setConfirmation("");
    }
  }, [open, user]);

  const matches = user !== null && confirmation === user.username;

  const submit = () => {
    if (!user || !matches || deleteUser.isPending) {
      return;
    }
    deleteUser.mutate(user.id, {
      onSuccess: () => {
        toast.add({ title: strings.admin.userDeleted, type: "success" });
        onOpenChange(false);
      },
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{strings.admin.deleteUserTitle}</AlertDialogTitle>
          <AlertDialogDescription>
            {strings.admin.deleteUserHint(user?.clipCount ?? 0)}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">
            {user ? strings.admin.deleteUserConfirmHint(user.username) : ""}
          </p>
          <Input
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            autoComplete="off"
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>{strings.common.cancel}</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={!matches || deleteUser.isPending}
            onClick={submit}
          >
            {strings.common.delete}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
