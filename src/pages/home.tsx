import { useCallback, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/components/ui/toast";
import { errorMessage, strings } from "@/lib/strings";
import type { Clip } from "@/lib/types";
import {
  clipsKeys,
  insertClipIntoListCache,
  useClipList,
  useCreateClip,
  useDeleteClip,
  usePinnedClips,
  useRestoreClip,
} from "@/queries/clips";
import { useSystemStatus } from "@/queries/system";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useNow } from "@/hooks/use-now";
import { usePasteToCreate } from "@/hooks/use-paste-to-create";
import { AppHeader } from "@/components/app/app-header";
import { ClipEditor } from "@/components/clips/clip-editor";
import { ClipList } from "@/components/clips/clip-list";
import { NewClipButton } from "@/components/clips/new-clip-button";
import { NewClipFab } from "@/components/clips/new-clip-fab";
import { SearchBox } from "@/components/clips/search-box";
import { makePendingClip, type PendingClip } from "@/components/clips/pending-clips";

export default function HomePage() {
  const now = useNow();
  const queryClient = useQueryClient();
  const [searchInput, setSearchInput] = useState("");
  const q = useDebouncedValue(searchInput.trim(), 300);
  const searching = q.length > 0;
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const highlightTimer = useRef<number | undefined>(undefined);
  const [pending, setPending] = useState<PendingClip[]>([]);
  const [editor, setEditor] = useState<{ open: boolean; clip: Clip | null; initialContent: string }>({
    open: false,
    clip: null,
    initialContent: "",
  });

  const statusQuery = useSystemStatus();
  const maxTextBytes = statusQuery.data?.maxTextBytes ?? Number.MAX_SAFE_INTEGER;
  const pinnedQuery = usePinnedClips(!searching);
  const listQuery = useClipList(q);
  const createClip = useCreateClip();
  const deleteClip = useDeleteClip();
  const restoreClip = useRestoreClip();

  const flashHighlight = useCallback((id: string) => {
    setHighlightId(id);
    window.clearTimeout(highlightTimer.current);
    highlightTimer.current = window.setTimeout(() => setHighlightId(null), 1500);
  }, []);

  // The undo toast must live here, not in the card: deleting unmounts the card
  // and TanStack drops mutate() callbacks of unmounted observers.
  const handleDelete = useCallback(
    (clip: Clip) => {
      toast.add({
        title: strings.common.deleted,
        timeout: 5000,
        actionProps: {
          children: strings.common.undo,
          onClick: () =>
            restoreClip.mutate(clip.id, { onSuccess: () => flashHighlight(clip.id) }),
        },
      });
      deleteClip.mutate(clip.id);
    },
    [deleteClip.mutate, restoreClip.mutate, flashHighlight],
  );

  const submitContent = useCallback(
    async (content: string, name: string | null, tempId?: number) => {
      if (new TextEncoder().encode(content).length > maxTextBytes) {
        toast.add({
          title: strings.clips.textTooLarge(maxTextBytes / (1024 * 1024)),
          type: "error",
        });
        if (tempId !== undefined) {
          setPending((prev) => prev.filter((p) => p.tempId !== tempId));
        }
        return;
      }
      const pendingItem = makePendingClip(content, name);
      const id = tempId ?? pendingItem.tempId;
      setPending((prev) => {
        if (tempId !== undefined) {
          return prev.map((p) => (p.tempId === id ? { ...p, status: "saving" } : p));
        }
        return [pendingItem, ...prev];
      });
      try {
        const res = await createClip.mutateAsync({ content, name });
        setPending((prev) => prev.filter((p) => p.tempId !== id));
        if (res.deduplicated) {
          await queryClient.invalidateQueries({ queryKey: clipsKeys.all });
          flashHighlight(res.clip.id);
          toast.add({ title: strings.clips.alreadyExists, type: "info" });
        } else {
          insertClipIntoListCache(queryClient, res.clip);
          flashHighlight(res.clip.id);
          toast.add({
            title: strings.common.saved,
            type: "success",
            timeout: 5000,
            actionProps: {
              children: strings.common.undo,
              // Undoing a fresh save deletes that clip; undoing a dedup hit
              // would delete the pre-existing clip, so that toast has no undo.
              onClick: () => deleteClip.mutate(res.clip.id),
            },
          });
        }
      } catch (err) {
        setPending((prev) =>
          prev.map((p) =>
            p.tempId === id ? { ...p, status: "failed", error: errorMessage(err) } : p,
          ),
        );
      }
    },
    [maxTextBytes, createClip.mutateAsync, deleteClip.mutate, queryClient, flashHighlight],
  );

  const openEditorWithPaste = useCallback(
    (text: string) => setEditor({ open: true, clip: null, initialContent: text }),
    [],
  );
  usePasteToCreate(openEditorWithPaste);

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-3xl px-4 pt-4 sm:pt-6 pb-24 md:pb-10">
        <div className="mb-4 sm:mb-6 flex items-center gap-2 sm:gap-3">
          <div className="min-w-0 flex-1">
            <SearchBox value={searchInput} onChange={setSearchInput} />
          </div>
          <NewClipButton
            onClick={() => setEditor({ open: true, clip: null, initialContent: "" })}
          />
        </div>
        <ClipList
          q={q}
          searching={searching}
          now={now}
          pinnedItems={pinnedQuery.data}
          pinnedLoading={pinnedQuery.isPending}
          listQuery={listQuery}
          pending={pending}
          onRetryPending={(item) => void submitContent(item.content, item.name, item.tempId)}
          onRemovePending={(tempId) =>
            setPending((prev) => prev.filter((p) => p.tempId !== tempId))
          }
          highlightId={highlightId}
          onEdit={(clip) => setEditor({ open: true, clip, initialContent: "" })}
          onDelete={handleDelete}
        />
      </main>
      <NewClipFab onClick={() => setEditor({ open: true, clip: null, initialContent: "" })} />
      <ClipEditor
        open={editor.open}
        onOpenChange={(open) => setEditor((prev) => ({ ...prev, open }))}
        clip={editor.clip}
        initialContent={editor.initialContent}
        onSubmitNew={(content, name) => void submitContent(content, name)}
      />
    </div>
  );
}
