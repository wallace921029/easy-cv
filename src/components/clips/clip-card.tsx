import { useEffect, useRef, useState } from "react";
import {
  CheckIcon,
  CopyIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PinIcon,
  PinOffIcon,
  Trash2Icon,
} from "lucide-react";
import { cn } from "cn";
import { copyText } from "@/lib/clipboard";
import { highlightText } from "@/lib/rich-text";
import { strings } from "@/lib/strings";
import { formatClipTime, formatFullTime } from "@/lib/time";
import type { Clip } from "@/lib/types";
import { useUpdateClip } from "@/queries/clips";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "@/components/ui/toast";
import { ClipContent } from "./clip-content";

export function ClipCard({
  clip,
  keyword,
  highlighted,
  now,
  onEdit,
  onDelete,
}: {
  clip: Clip;
  keyword?: string;
  highlighted: boolean;
  now: number;
  onEdit: (clip: Clip) => void;
  onDelete: (clip: Clip) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const updateClip = useUpdateClip();

  useEffect(() => {
    if (highlighted) {
      ref.current?.scrollIntoView({ block: "nearest" });
    }
  }, [highlighted]);

  const handleCopy = () => {
    // Called synchronously from the click handler on purpose (Safari gesture rule).
    void copyText(clip.content).then((ok) => {
      if (ok) {
        setCopied(true);
        toast.add({ title: strings.common.copied, type: "success" });
        window.setTimeout(() => setCopied(false), 1500);
      } else {
        toast.add({ title: strings.errors.copyFailed, type: "error" });
      }
    });
  };

  const handleCardClick = (e: React.MouseEvent) => {
    if (window.getSelection()?.toString()) {
      return;
    }
    if ((e.target as HTMLElement).closest("a, button, [role='menuitem']")) {
      return;
    }
    handleCopy();
  };

  const edited = clip.updatedAt > clip.createdAt;
  const pinned = clip.pinnedAt !== null;

  return (
    <Card
      ref={ref}
      onClick={handleCardClick}
      className={cn(
        "cursor-pointer transition-shadow hover:shadow-sm",
        highlighted && "border-primary/60 ring-2 ring-primary/30",
      )}
    >
      <CardContent className="flex flex-col gap-2">
        {clip.name ? (
          <div className="text-sm leading-snug font-medium break-words">
            {highlightText(clip.name, keyword)}
          </div>
        ) : null}
        <ClipContent
          content={clip.content}
          keyword={keyword}
          expanded={expanded}
          onToggle={() => setExpanded((v) => !v)}
        />
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
            {pinned ? <PinIcon className="size-3.5 shrink-0" aria-label={strings.clips.pin} /> : null}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger
                  render={<span className="cursor-default" />}
                >
                  {formatClipTime(clip.activeAt, now)}
                </TooltipTrigger>
                <TooltipContent>{formatFullTime(clip.activeAt)}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <span>{strings.clips.charCount(Array.from(clip.content).length)}</span>
            {edited ? <span>{strings.clips.edited}</span> : null}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={strings.clips.copy}
              onClick={handleCopy}
            >
              {copied ? <CheckIcon className="text-green-600" /> : <CopyIcon />}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={<Button variant="ghost" size="icon-sm" aria-label="更多操作" />}
              >
                <MoreHorizontalIcon />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => updateClip.mutate({ id: clip.id, pinned: !pinned })}
                >
                  {pinned ? <PinOffIcon /> : <PinIcon />}
                  {pinned ? strings.clips.unpin : strings.clips.pin}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onEdit(clip)}>
                  <PencilIcon />
                  {strings.common.edit}
                </DropdownMenuItem>
                <DropdownMenuItem variant="destructive" onClick={() => onDelete(clip)}>
                  <Trash2Icon />
                  {strings.common.delete}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
