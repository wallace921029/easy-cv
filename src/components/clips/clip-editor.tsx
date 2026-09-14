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
import { FieldError } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";

export function ClipEditor({
  open,
  onOpenChange,
  clip,
  onSubmitNew,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // null = create mode; a clip = edit mode.
  clip: Clip | null;
  onSubmitNew: (content: string) => void;
}) {
  const isMobile = useIsMobile();
  const updateClip = useUpdateClip();
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [confirmClose, setConfirmClose] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) {
      setContent(clip?.content ?? "");
      setError(null);
    }
  }, [open, clip]);

  const original = clip?.content ?? "";
  const dirty = content !== original;
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
    if (clip) {
      try {
        await updateClip.mutateAsync({ id: clip.id, content });
        toast.add({ title: strings.common.saved, type: "success" });
        onOpenChange(false);
      } catch (err) {
        // Edit mode: keep the editor open and show the reason.
        setError(errorMessage(err));
      }
    } else {
      // Create mode: close immediately; the pending list shows the status.
      onSubmitNew(content);
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
    <div className="flex flex-col gap-3">
      <Textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => {
          setContent(e.target.value);
          setError(null);
        }}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
            e.preventDefault();
            void save();
          }
        }}
        placeholder={strings.clips.editorPlaceholder}
        rows={6}
        className="max-h-[50vh] resize-none"
        autoFocus
      />
      <div className="flex items-center justify-between">
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
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>{title}</DrawerTitle>
            </DrawerHeader>
            <div className="px-4">{body}</div>
            <DrawerFooter>{footer}</DrawerFooter>
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription className="sr-only">{title}</DialogDescription>
            </DialogHeader>
            {body}
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
