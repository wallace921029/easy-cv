import { useEffect, useRef } from "react";
import { strings } from "@/lib/strings";
import { modKeyLabel } from "@/lib/platform";
import type { Clip } from "@/lib/types";
import type { useClipList } from "@/queries/clips";
import { useIsMobile } from "@/hooks/use-mobile";
import { Card, CardContent } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { ClipCard } from "./clip-card";
import { PendingClips, type PendingClip } from "./pending-clips";

type ClipListQuery = ReturnType<typeof useClipList>;

export function ClipList({
  q,
  searching,
  now,
  pinnedItems,
  pinnedLoading,
  listQuery,
  pending,
  onRetryPending,
  onRemovePending,
  highlightId,
  onEdit,
  onDelete,
}: {
  q: string;
  searching: boolean;
  now: number;
  pinnedItems: Clip[] | undefined;
  pinnedLoading: boolean;
  listQuery: ClipListQuery;
  pending: PendingClip[];
  onRetryPending: (item: PendingClip) => void;
  onRemovePending: (tempId: number) => void;
  highlightId: string | null;
  onEdit: (clip: Clip) => void;
  onDelete: (clip: Clip) => void;
}) {
  const isMobile = useIsMobile();
  const sentinelRef = useRef<HTMLDivElement>(null);
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = listQuery;

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) {
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting) && hasNextPage && !isFetchingNextPage) {
        void fetchNextPage();
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (listQuery.isPending || (!searching && pinnedLoading)) {
    return (
      <div className="flex flex-col gap-3">
        {[0, 1, 2].map((i) => (
          <Card key={i}>
            <CardContent className="flex flex-col gap-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (listQuery.isError) {
    return (
      <div className="flex flex-col items-center gap-3 py-16">
        <p className="text-sm text-muted-foreground">{strings.errors.loadFailed}</p>
        <Button variant="outline" onClick={() => void listQuery.refetch()}>
          {strings.common.retry}
        </Button>
      </div>
    );
  }

  const items = listQuery.data.pages.flatMap((page) => page.items);
  const cardProps = { now, onEdit, onDelete };

  if (searching) {
    if (items.length === 0) {
      return (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>{strings.clips.noSearchResults(q)}</EmptyTitle>
          </EmptyHeader>
        </Empty>
      );
    }
    return (
      <div className="flex flex-col gap-3">
        {items.map((clip) => (
          <ClipCard
            key={clip.id}
            clip={clip}
            keyword={q}
            highlighted={clip.id === highlightId}
            {...cardProps}
          />
        ))}
        <ListFooter query={listQuery} sentinelRef={sentinelRef} />
      </div>
    );
  }

  const pinned = pinnedItems ?? [];
  const empty = pinned.length === 0 && items.length === 0 && pending.length === 0;

  if (empty) {
    return (
      <Empty>
        <EmptyHeader>
          {isMobile ? (
            <EmptyTitle>{strings.clips.emptyMobileHint}</EmptyTitle>
          ) : (
            <>
              <EmptyTitle className="text-base">
                {strings.clips.press}{" "}
                <KbdGroup>
                  <Kbd>{modKeyLabel}</Kbd>
                  <Kbd>V</Kbd>
                </KbdGroup>{" "}
                {strings.clips.pasteToSave}
              </EmptyTitle>
              <EmptyDescription>{strings.clips.emptyDesktopHint}</EmptyDescription>
            </>
          )}
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {pinned.length > 0 ? (
        <section className="flex flex-col gap-2">
          <h2 className="text-xs font-medium text-muted-foreground">{strings.clips.pinnedGroup}</h2>
          <div className="flex flex-col gap-3">
            {pinned.map((clip) => (
              <ClipCard
                key={clip.id}
                clip={clip}
                highlighted={clip.id === highlightId}
                {...cardProps}
              />
            ))}
          </div>
        </section>
      ) : null}
      <section className="flex flex-col gap-2">
        {pinned.length > 0 ? (
          <h2 className="text-xs font-medium text-muted-foreground">{strings.clips.recentGroup}</h2>
        ) : null}
        <PendingClips items={pending} onRetry={onRetryPending} onRemove={onRemovePending} />
        <div className="flex flex-col gap-3">
          {items.map((clip) => (
            <ClipCard
              key={clip.id}
              clip={clip}
              highlighted={clip.id === highlightId}
              {...cardProps}
            />
          ))}
        </div>
      </section>
      <ListFooter query={listQuery} sentinelRef={sentinelRef} />
    </div>
  );
}

function ListFooter({
  query,
  sentinelRef,
}: {
  query: ClipListQuery;
  sentinelRef: React.RefObject<HTMLDivElement | null>;
}) {
  const pageCount = query.data?.pages.length ?? 0;
  return (
    <div ref={sentinelRef} className="flex justify-center py-4">
      {query.isFetchingNextPage ? (
        <Spinner />
      ) : !query.hasNextPage && pageCount > 1 ? (
        <span className="text-xs text-muted-foreground">{strings.common.noMore}</span>
      ) : null}
    </div>
  );
}
