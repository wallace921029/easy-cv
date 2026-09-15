import { cn } from "cn";
import { strings } from "@/lib/strings";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";

// Clipboard text created via paste lands here first; §0.3 forbids
// crypto.randomUUID over HTTP, so temp ids come from a plain counter.
export type PendingClip = {
  tempId: number;
  content: string;
  name: string | null;
  status: "saving" | "failed";
  error?: string;
};

let nextTempId = 1;

export function makePendingClip(content: string, name: string | null = null): PendingClip {
  return { tempId: nextTempId++, content, name, status: "saving" };
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
        <Card
          key={item.tempId}
          className={cn(item.status === "failed" && "border-destructive/60 ring-1 ring-destructive/20")}
        >
          <CardContent className="flex flex-col gap-2">
            {item.name ? (
              <div className="text-sm leading-snug font-medium break-words">{item.name}</div>
            ) : null}
            <div className="line-clamp-2 text-sm whitespace-pre-wrap break-words">
              {item.content}
            </div>
            {item.status === "saving" ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Spinner />
                {strings.clips.saving}
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2">
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
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
