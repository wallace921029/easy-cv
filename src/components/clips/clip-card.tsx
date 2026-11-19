import { useEffect, useRef, useState } from "react";
import {
  CheckIcon,
  CopyIcon,
  EyeIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PinIcon,
  PinOffIcon,
  Trash2Icon,
} from "lucide-react";
import { cn } from "cn";
import { copyText } from "@/lib/clipboard";
import { highlightText } from "@/lib/rich-text";
import { errorMessage, strings } from "@/lib/strings";
import { formatClipTime, formatFullTime } from "@/lib/time";
import type { Clip } from "@/lib/types";
import { useGroups } from "@/queries/groups";
import { useUpdateClip } from "@/queries/clips";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "@/components/ui/toast";

export function ClipCard({
  clip,
  keyword,
  highlighted,
  now,
  onEdit,
  onDelete,
  onSelect,
  selected,
  onDragClip,
}: {
  clip: Clip;
  keyword?: string;
  highlighted: boolean;
  now: number;
  onEdit: (clip: Clip) => void;
  onDelete: (clip: Clip) => void;
  onSelect: (clip: Clip) => void;
  selected: boolean;
  onDragClip: (clip: Clip | null) => void;
}) {
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const updateClip = useUpdateClip();
  const groups = useGroups();

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

  const edited = clip.updatedAt > clip.createdAt;
  const pinned = clip.pinnedAt !== null;

  return (
    <div
      ref={ref}
      draggable
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("application/x-easy-cv-clip", clip.id);
        onDragClip(clip);
      }}
      onDragEnd={() => onDragClip(null)}
      className={cn(
        "cursor-grab active:cursor-grabbing rounded-md border-b border-border/60 px-3 py-2 transition-colors hover:bg-muted/60",
        (highlighted || selected) && "bg-accent text-accent-foreground",
      )}
    >
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1 truncate text-sm leading-snug font-medium">
          {clip.name ? highlightText(clip.name, keyword) : strings.clips.untitled}
        </div>
        <div className="flex shrink-0 items-center gap-1 sm:gap-3">
          <div className="hidden items-center gap-2 text-xs text-muted-foreground sm:flex">
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
            {edited ? <span>{strings.clips.edited}</span> : null}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={strings.clips.copy}
              onClick={handleCopy}
            >
              {copied ? <CheckIcon className="text-emerald-500 dark:text-emerald-400" /> : <CopyIcon />}
            </Button>
            <Button variant="ghost" size="icon-sm" aria-label={strings.clips.view} onClick={() => onSelect(clip)}>
              <EyeIcon />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={<Button variant="ghost" size="icon-sm" aria-label={strings.common.moreActions} />}
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
                {clip.groupId !== null ? (
                  <DropdownMenuItem onClick={() => updateClip.mutate({ id: clip.id, groupId: null }, { onError: (err) => toast.add({ title: errorMessage(err), type: "error" }) })}>
                    {strings.groups.moveToRoot}
                  </DropdownMenuItem>
                ) : null}
                {groups.data?.filter((group) => group.id !== clip.groupId).map((group) => (
                  <DropdownMenuItem key={group.id} onClick={() => updateClip.mutate({ id: clip.id, groupId: group.id }, { onError: (err) => toast.add({ title: errorMessage(err), type: "error" }) })}>
                    {strings.groups.moveTo(group.name)}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuItem variant="destructive" onClick={() => onDelete(clip)}>
                  <Trash2Icon />
                  {strings.common.delete}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </div>
  );
}
