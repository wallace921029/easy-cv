import { useEffect, useRef, useState } from "react";
import { canReadClipboard } from "@/lib/clipboard";
import { errorMessage, strings } from "@/lib/strings";
import type { Clip } from "@/lib/types";
import { useUpdateClip } from "@/queries/clips";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
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
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";

export function ClipEditor({
  open,
  onOpenChange,
  clip,
  initialContent = "",
  onSubmitNew,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // null = create mode; a clip = edit mode.
  clip: Clip | null;
  // Create-mode prefill from a paste: the pasted text is the dirty-baseline,
  // so closing without edits does not ask for confirmation.
  initialContent?: string;
  onSubmitNew: (content: string, name: string | null) => void;
}) {
  const isMobile = useIsMobile();
  const updateClip = useUpdateClip();
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [confirmClose, setConfirmClose] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) {
      setName(clip?.name ?? "");
      setContent(clip?.content ?? initialContent);
      setError(null);
      // Paste-confirm: content is already there, so focus the name field.
      const focusName = !clip && initialContent !== "";
      requestAnimationFrame(() => {
        (focusName ? nameRef.current : textareaRef.current)?.focus();
      });
    }
  }, [open, clip, initialContent]);

  const baseName = clip?.name ?? "";
  const baseContent = clip ? clip.content : initialContent;
  const dirty = name !== baseName || content !== baseContent;
  const canSave = /\S/.test(content) && (clip === null || dirty);
  const saving = updateClip.isPending;

  const handleOpenChange = (next: boolean) => {
    if (next) {
      onOpenChange(true);
      return;
    }
    if (dirty && open) {
      setConfirmClose(true);
      return;
    }
    onOpenChange(false);
  };

  const save = async () => {
    if (!canSave || saving) {
      return;
    }
    const normalizedName = name.trim() === "" ? null : name.trim();
    if (clip) {
      // Send only what changed: untouched content must not bump updatedAt.
      const patch: { content?: string; name?: string | null } = {};
      if (content !== baseContent) {
        patch.content = content;
      }
      if (normalizedName !== (clip.name ?? null)) {
        patch.name = normalizedName;
      }
      try {
        await updateClip.mutateAsync({ id: clip.id, ...patch });
        toast.add({ title: strings.common.saved, type: "success" });
        onOpenChange(false);
      } catch (err) {
        // Edit mode: keep the editor open and show the reason.
        setError(errorMessage(err));
      }
    } else {
      // Create mode: close immediately; the pending list shows the status.
      onSubmitNew(content, normalizedName);
      onOpenChange(false);
    }
  };

  const insertAtCursor = (text: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setContent((prev) => prev + text);
      return;
    }
    const start = textarea.selectionStart ?? content.length;
    const end = textarea.selectionEnd ?? content.length;
    const next = content.slice(0, start) + text + content.slice(end);
    setContent(next);
    setError(null);
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(start + text.length, start + text.length);
    });
  };

  const readClipboard = async () => {
    try {
      insertAtCursor(await navigator.clipboard.readText());
    } catch {
      toast.add({ title: strings.errors.readClipboardFailed, type: "error" });
    }
  };

  const body = (
    <div
      className="flex flex-col gap-3 min-w-0 w-full"
      onKeyDown={(e) => {
        if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
          e.preventDefault();
          void save();
        }
      }}
    >
      <Field className="w-full min-w-0">
        <FieldLabel htmlFor="clip-name">{strings.clips.nameLabel}</FieldLabel>
        <Input
          id="clip-name"
          ref={nameRef}
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setError(null);
          }}
          placeholder={strings.clips.namePlaceholder}
          autoComplete="off"
          maxLength={64}
          className="w-full min-w-0"
        />
      </Field>
      <Textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => {
          setContent(e.target.value);
          setError(null);
        }}
        placeholder={strings.clips.editorPlaceholder}
        rows={6}
        className="max-h-[42vh] min-h-28 w-full min-w-0 resize-none overflow-y-auto break-all [overflow-wrap:anywhere]"
      />
      <div className="flex items-center justify-between shrink-0">
        <span className="text-xs text-muted-foreground">
          {strings.clips.charCount(Array.from(content).length)}
        </span>
        {canReadClipboard() ? (
          <Button variant="outline" size="sm" onClick={() => void readClipboard()}>
            {strings.clips.readClipboard}
          </Button>
        ) : null}
      </div>
      {error ? <FieldError>{error}</FieldError> : null}
    </div>
  );

  const footer = (
    <>
      <Button variant="outline" onClick={() => handleOpenChange(false)}>
        {strings.common.cancel}
      </Button>
      <Button onClick={() => void save()} disabled={!canSave || saving}>
        {strings.common.save}
      </Button>
    </>
  );

  const title = clip ? strings.clips.editorEditTitle : strings.clips.editorNewTitle;

  return (
    <>
      {isMobile ? (
        <Drawer open={open} onOpenChange={handleOpenChange}>
          <DrawerContent className="max-h-[calc(100dvh-2rem)]">
            <DrawerHeader>
              <DrawerTitle>{title}</DrawerTitle>
            </DrawerHeader>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-1">{body}</div>
            <DrawerFooter>{footer}</DrawerFooter>
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription className="sr-only">{title}</DialogDescription>
            </DialogHeader>
            <div className="min-h-0 flex-1 overflow-y-auto -mr-1.5 pr-1.5">
              {body}
            </div>
            <DialogFooter>{footer}</DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      <AlertDialog open={confirmClose} onOpenChange={setConfirmClose}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{strings.clips.discardChanges}</AlertDialogTitle>
            <AlertDialogDescription>{strings.clips.discardChangesHint}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{strings.common.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmClose(false);
                onOpenChange(false);
              }}
            >
              {strings.common.confirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
