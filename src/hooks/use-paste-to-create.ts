import { useEffect } from "react";
import { toast } from "@/components/ui/toast";
import { strings } from "@/lib/strings";

// Global paste-to-create. Listens to the paste event (not keystrokes) so
// Cmd/Ctrl+V, the context menu and the browser menu all work, HTTPS or not.
export function usePasteToCreate(onCreate: (content: string) => void): void {
  useEffect(() => {
    const inEditable = (el: Element | null): boolean =>
      el instanceof HTMLElement &&
      (el.closest("input, textarea, select") !== null || el.isContentEditable);
    const handler = (event: ClipboardEvent) => {
      if (inEditable(event.target as Element | null) || inEditable(document.activeElement)) {
        return;
      }
      // Base UI gives toasts role="dialog", so match the actual modal content
      // slots instead of roles, or a visible toast would swallow pastes.
      if (
        document.querySelector(
          '[data-slot="dialog-content"], [data-slot="alert-dialog-content"], [data-slot="drawer-popup"]',
        )
      ) {
        return;
      }
      const data = event.clipboardData;
      if (!data) {
        return;
      }
      const text = data.getData("text/plain");
      if (/\S/.test(text)) {
        event.preventDefault();
        onCreate(text);
        return;
      }
      if (data.files.length > 0 || data.types.some((t) => t.startsWith("image/"))) {
        toast.add({ title: strings.clips.onlyTextSupported, type: "info" });
        return;
      }
      toast.add({ title: strings.clips.clipboardEmpty, type: "info" });
    };
    document.addEventListener("paste", handler);
    return () => document.removeEventListener("paste", handler);
  }, [onCreate]);
}
