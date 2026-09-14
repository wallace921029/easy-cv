import { useEffect, useState } from "react";
import { strings, errorMessage } from "@/lib/strings";
import { copyText } from "@/lib/clipboard";
import { generatePassword } from "@/lib/codes";
import type { AdminUser } from "@/lib/types";
import { useResetUserPassword } from "@/queries/admin";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FieldError } from "@/components/ui/field";
import { PasswordInput } from "@/components/app/password-input";
import { toast } from "@/components/ui/toast";
import { CopyIcon } from "lucide-react";

export function ResetPasswordDialog({
  user,
  open,
  onOpenChange,
}: {
  user: AdminUser | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const resetPassword = useResetUserPassword();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  // After a successful reset the new password is shown exactly once.
  const [revealedPassword, setRevealedPassword] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setPassword("");
      setError(null);
      setRevealedPassword(null);
    }
  }, [open, user]);

  const valid = password.length >= 8 && password.length <= 128;

  const submit = async () => {
    if (!user || !valid || resetPassword.isPending) {
      return;
    }
    try {
      await resetPassword.mutateAsync({ id: user.id, password });
      setRevealedPassword(password);
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const copy = () => {
    if (!revealedPassword) {
      return;
    }
    void copyText(revealedPassword).then((ok) => {
      toast.add({
        title: ok ? strings.common.copied : strings.errors.copyFailed,
        type: ok ? "success" : "error",
      });
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {strings.admin.resetPasswordTitle}
            {user ? `：${user.username}` : ""}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {strings.admin.resetPasswordTitle}
          </DialogDescription>
        </DialogHeader>
        {revealedPassword === null ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <PasswordInput
                  aria-label={strings.admin.newPasswordLabel}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError(null);
                  }}
                  autoComplete="new-password"
                  autoFocus
                />
              </div>
              <Button variant="outline" onClick={() => setPassword(generatePassword())}>
                {strings.common.generate}
              </Button>
            </div>
            {error ? <FieldError>{error}</FieldError> : null}
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                {strings.common.cancel}
              </Button>
              <Button onClick={() => void submit()} disabled={!valid || resetPassword.isPending}>
                {strings.admin.resetPassword}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">{strings.admin.resetPasswordOnceHint}</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded-md border bg-muted px-3 py-2 font-mono text-sm">
                {revealedPassword}
              </code>
              <Button variant="outline" size="icon" aria-label={strings.common.copy} onClick={copy}>
                <CopyIcon />
              </Button>
            </div>
            <DialogFooter>
              <Button onClick={() => onOpenChange(false)}>{strings.common.confirm}</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
