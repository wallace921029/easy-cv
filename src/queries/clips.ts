import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
  type QueryClient,
} from "@tanstack/react-query";
import { toast } from "@/components/ui/toast";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/strings";
import type { Clip, ClipListResponse } from "@/lib/types";

export const clipsKeys = {
  all: ["clips"] as const,
  pinned: (groupId: string | null) => ["clips", "pinned", groupId] as const,
  list: (q: string, groupId: string | null) => ["clips", "list", { q, groupId }] as const,
};

export function usePinnedClips(enabled: boolean, groupId: string | null) {
  return useQuery({
    queryKey: clipsKeys.pinned(groupId),
    queryFn: () => api.clips.pinned(groupId),
    enabled,
    select: (data) => data.items,
  });
}

export function useClipList(q: string, groupId: string | null) {
  return useInfiniteQuery({
    queryKey: clipsKeys.list(q, groupId),
    queryFn: ({ pageParam }) =>
      api.clips.list({ cursor: pageParam ?? undefined, q: q === "" ? undefined : q, groupId: groupId ?? undefined }),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
}

export function useCreateClip() {
  return useMutation({
    mutationFn: (vars: { content: string; name?: string | null; groupId: string | null }) =>
      api.clips.create(vars.content, vars.name, vars.groupId),
    // The default networkMode "online" would pause the request while offline,
    // but the PRD wants a visible failed card with a retry action instead.
    networkMode: "always",
  });
}

export function useUpdateClip() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; content?: string; pinned?: boolean; name?: string | null; groupId?: string | null }) =>
      api.clips.update(vars.id, {
        content: vars.content,
        pinned: vars.pinned,
        name: vars.name,
        groupId: vars.groupId,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: clipsKeys.all }),
  });
}

function removeClipFromData(data: unknown, id: string): unknown {
  if (!data || typeof data !== "object") {
    return data;
  }
  if ("pages" in data) {
    const infinite = data as InfiniteData<ClipListResponse>;
    return {
      ...infinite,
      pages: infinite.pages.map((page) => ({
        ...page,
        items: page.items.filter((clip) => clip.id !== id),
      })),
    };
  }
  if ("items" in data) {
    const list = data as ClipListResponse;
    return { ...list, items: list.items.filter((clip) => clip.id !== id) };
  }
  return data;
}

export function useDeleteClip() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.clips.remove(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: clipsKeys.all });
      queryClient.setQueriesData({ queryKey: clipsKeys.all }, (old) =>
        removeClipFromData(old, id),
      );
    },
    onError: async (err) => {
      await queryClient.invalidateQueries({ queryKey: clipsKeys.all });
      toast.add({ title: errorMessage(err), type: "error" });
    },
  });
}

export function useRestoreClip() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.clips.restore(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: clipsKeys.all }),
    onError: (err) => toast.add({ title: errorMessage(err), type: "error" }),
  });
}

// Inserts a freshly created clip at the top of the default list's first page;
// falls back to invalidation when the list is not cached yet.
export function insertClipIntoListCache(queryClient: QueryClient, clip: Clip): void {
  const key = clipsKeys.list("", clip.groupId);
  const existing = queryClient.getQueryData<InfiniteData<ClipListResponse>>(key);
  if (!existing || existing.pages.length === 0) {
    void queryClient.invalidateQueries({ queryKey: key });
    return;
  }
  queryClient.setQueryData<InfiniteData<ClipListResponse>>(key, (old) => {
    if (!old || old.pages.length === 0) {
      return old;
    }
    const [first, ...rest] = old.pages;
    return { ...old, pages: [{ ...first, items: [clip, ...first.items] }, ...rest] };
  });
}
