import { useState } from "react";
import { MoreHorizontalIcon } from "lucide-react";
import { strings } from "@/lib/strings";
import type { AdminUser } from "@/lib/types";
import { useAdminUsers, useSetUserStatus } from "@/queries/admin";
import { formatFullTime } from "@/lib/time";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { toast } from "@/components/ui/toast";
import { ResetPasswordDialog } from "./reset-password-dialog";
import { DeleteUserDialog } from "./delete-user-dialog";

export function UsersTable() {
  const usersQuery = useAdminUsers();
  const setUserStatus = useSetUserStatus();
  const [disableTarget, setDisableTarget] = useState<AdminUser | null>(null);
  const [resetTarget, setResetTarget] = useState<AdminUser | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);

  const confirmDisable = () => {
    if (!disableTarget) {
      return;
    }
    setUserStatus.mutate(
      { id: disableTarget.id, status: "disabled" },
      {
        onSuccess: () => {
          toast.add({ title: strings.admin.userDisabled, type: "success" });
          setDisableTarget(null);
        },
      },
    );
  };

  const enable = (user: AdminUser) => {
    setUserStatus.mutate(
      { id: user.id, status: "active" },
      { onSuccess: () => toast.add({ title: strings.admin.userEnabled, type: "success" }) },
    );
  };

  return (
    <div className="overflow-x-auto rounded-2xl border border-white/60 dark:border-white/10 bg-card backdrop-blur-xl p-1 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.25)]">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{strings.admin.username}</TableHead>
            <TableHead>{strings.admin.role}</TableHead>
            <TableHead>{strings.admin.status}</TableHead>
            <TableHead className="text-right">{strings.admin.clipCount}</TableHead>
            <TableHead>{strings.admin.createdAt}</TableHead>
            <TableHead>{strings.admin.lastLoginAt}</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {(usersQuery.data ?? []).map((user) => {
            const isAdmin = user.role === "admin";
            return (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.username}</TableCell>
                <TableCell>
                  <Badge variant={isAdmin ? "default" : "secondary"}>
                    {isAdmin ? strings.admin.roleAdmin : strings.admin.roleUser}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={user.status === "disabled" ? "destructive" : "outline"}>
                    {user.status === "disabled"
                      ? strings.admin.statusDisabled
                      : strings.admin.statusActive}
                  </Badge>
                </TableCell>
                <TableCell className="text-right tabular-nums">{user.clipCount}</TableCell>
                <TableCell>{formatFullTime(user.createdAt)}</TableCell>
                <TableCell>
                  {user.lastLoginAt ? formatFullTime(user.lastLoginAt) : strings.common.never}
                </TableCell>
                <TableCell>
                  {!isAdmin ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={<Button variant="ghost" size="icon-sm" aria-label={strings.common.moreActions} />}
                      >
                        <MoreHorizontalIcon />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {user.status === "active" ? (
                          <DropdownMenuItem onClick={() => setDisableTarget(user)}>
                            {strings.admin.disable}
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onClick={() => enable(user)}>
                            {strings.admin.enable}
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => setResetTarget(user)}>
                          {strings.admin.resetPassword}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => setDeleteTarget(user)}
                        >
                          {strings.admin.deleteUser}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : null}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <AlertDialog
        open={disableTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDisableTarget(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{strings.admin.disableConfirmTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {strings.admin.disableConfirmHint}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{strings.common.cancel}</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={confirmDisable}>
              {strings.admin.disable}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ResetPasswordDialog
        user={resetTarget}
        open={resetTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setResetTarget(null);
          }
        }}
      />
      <DeleteUserDialog
        user={deleteTarget}
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
          }
        }}
      />
    </div>
  );
}
