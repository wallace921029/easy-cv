import { cn } from "cn";
import { strings } from "@/lib/strings";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

// Clipboard text created via paste lands here first; §0.3 forbids
// crypto.randomUUID over HTTP, so temp ids come from a plain counter.
export type PendingClip = {
  tempId: number;
  groupId: string | null;
  content: string;
  name: string | null;
  status: "saving" | "failed";
  error?: string;
};

let nextTempId = 1;

export function makePendingClip(content: string, name: string | null = null, groupId: string | null = null): PendingClip {
  return { tempId: nextTempId++, content, name, groupId, status: "saving" };
}

export function PendingClips({
  items,
  onRetry,
  onRemove,
}: {
  items: PendingClip[];
  onRetry: (item: PendingClip) => void;
  onRemove: (tempId: number) => void;
}) {
  if (items.length === 0) {
    return null;
  }
  return (
    <div className="flex flex-col gap-3">
      {items.map((item) => (
        <div
          key={item.tempId}
          className={cn("rounded-md border-b border-border/60 px-3 py-2", item.status === "failed" && "bg-destructive/10")}
        >
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1 truncate text-sm leading-snug font-medium">
              {item.name || strings.clips.untitled}
            </div>
            {item.status === "saving" ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Spinner />
                {strings.clips.saving}
              </div>
            ) : (
              <div className="flex shrink-0 items-center gap-2">
                <span className="text-xs text-destructive">
                  {strings.clips.saveFailed}
                  {item.error ? `：${item.error}` : ""}
                </span>
                <div className="flex shrink-0 gap-1">
                  <Button size="sm" variant="outline" onClick={() => onRetry(item)}>
                    {strings.common.retry}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => onRemove(item.tempId)}>
                    {strings.common.remove}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
