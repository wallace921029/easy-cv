import { useState } from "react";
import { CopyIcon, PencilIcon, RefreshCwIcon } from "lucide-react";
import { strings } from "@/lib/strings";
import { copyText } from "@/lib/clipboard";
import { formatInviteCode, normalizeCode } from "@/lib/codes";
import {
  useAdminSettings,
  useRegenerateInviteCode,
  useUpdateRegistrationSettings,
} from "@/queries/admin";
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
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/toast";

const INVITE_CODE_RE = /^[A-Z0-9]{6,32}$/;

export function RegistrationSettings() {
  const settingsQuery = useAdminSettings();
  const updateSettings = useUpdateRegistrationSettings();
  const regenerateCode = useRegenerateInviteCode();
  const [confirmRefresh, setConfirmRefresh] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState("");
  const [editError, setEditError] = useState<string | null>(null);

  const settings = settingsQuery.data;

  const toggleRegistration = (enabled: boolean) => {
    updateSettings.mutate(
      { registrationEnabled: enabled },
      { onSuccess: () => toast.add({ title: strings.admin.registrationSaved, type: "success" }) },
    );
  };

  const copyCode = (code: string) => {
    void copyText(formatInviteCode(code)).then((ok) => {
      toast.add({
        title: ok ? strings.common.copied : strings.errors.copyFailed,
        type: ok ? "success" : "error",
      });
    });
  };

  const copyRegisterLink = (code: string) => {
    void copyText(`${location.origin}/register?code=${code}`).then((ok) => {
      toast.add({
        title: ok ? strings.common.copied : strings.errors.copyFailed,
        type: ok ? "success" : "error",
      });
    });
  };

  const saveEdit = () => {
    const normalized = normalizeCode(editValue);
    if (!INVITE_CODE_RE.test(normalized)) {
      setEditError(strings.validation.inviteCodeFormat);
      return;
    }
    updateSettings.mutate(
      { inviteCode: normalized },
      {
        onSuccess: () => {
          toast.add({ title: strings.admin.registrationSaved, type: "success" });
          setEditing(false);
          setEditError(null);
        },
      },
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{strings.admin.registrationTab}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <label className="flex items-center gap-3 text-sm">
          <Switch
            checked={settings?.registrationEnabled ?? false}
            onCheckedChange={(checked) => toggleRegistration(checked)}
            disabled={!settings || updateSettings.isPending}
          />
          {strings.admin.registrationOpen}
        </label>

        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium">{strings.admin.inviteCode}</span>
          {settings && !settings.registrationEnabled ? (
            <p className="text-xs text-muted-foreground">{strings.admin.inviteCodeUnavailable}</p>
          ) : null}
          {!settings?.inviteCode ? (
            <p className="text-sm text-muted-foreground">{strings.admin.inviteCodeEmpty}</p>
          ) : editing ? (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Input
                  size="sm"
                  className="max-w-xs"
                  value={editValue}
                  onChange={(e) => {
                    setEditValue(e.target.value);
                    setEditError(null);
                  }}
                  autoComplete="off"
                  autoFocus
                />
                <Button size="sm" onClick={saveEdit} disabled={updateSettings.isPending}>
                  {strings.common.save}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                  {strings.common.cancel}
                </Button>
              </div>
              {editError ? <FieldError>{editError}</FieldError> : null}
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <code className="rounded-xl border border-white/40 dark:border-white/10 bg-white/40 dark:bg-white/5 backdrop-blur-md px-3 py-1.5 font-mono text-sm tracking-wider shadow-xs">
                {formatInviteCode(settings.inviteCode)}
              </code>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyCode(settings.inviteCode ?? "")}
              >
                <CopyIcon />
                {strings.admin.copyInviteCode}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyRegisterLink(settings.inviteCode ?? "")}
              >
                <CopyIcon />
                {strings.admin.copyRegisterLink}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setConfirmRefresh(true)}>
                <RefreshCwIcon />
                {strings.admin.refreshCode}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setEditValue(formatInviteCode(settings.inviteCode ?? ""));
                  setEditing(true);
                }}
              >
                <PencilIcon />
                {strings.admin.editCode}
              </Button>
            </div>
          )}
        </div>
      </CardContent>

      <AlertDialog open={confirmRefresh} onOpenChange={setConfirmRefresh}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{strings.admin.refreshConfirmTitle}</AlertDialogTitle>
            <AlertDialogDescription>{strings.admin.refreshConfirmHint}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{strings.common.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                // AlertDialogAction is a plain Button here; close explicitly.
                setConfirmRefresh(false);
                regenerateCode.mutate(undefined, {
                  onSuccess: () =>
                    toast.add({ title: strings.admin.registrationSaved, type: "success" }),
                });
              }}
            >
              {strings.common.confirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
