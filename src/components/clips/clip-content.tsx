import { useEffect, useRef, useState } from "react";
import { cn } from "cn";
import { renderRichText } from "@/lib/rich-text";
import { strings } from "@/lib/strings";

// D11: the full text stays in memory (copy needs it synchronously); only the
// collapsed rendering is truncated.
const PREVIEW_CHARS = 3000;

export function ClipContent({
  content,
  keyword,
  expanded,
  onToggle,
}: {
  content: string;
  keyword?: string;
  expanded: boolean;
  onToggle: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [overflowing, setOverflowing] = useState(false);

  const shown = expanded ? content : Array.from(content).slice(0, PREVIEW_CHARS).join("");

  useEffect(() => {
    const el = ref.current;
    if (el) {
      setOverflowing(el.scrollHeight > el.clientHeight + 1);
    }
  }, [shown, expanded]);

  return (
    <div className="flex flex-col gap-1">
      <div className="relative">
        <div
          ref={ref}
          className={cn(
            "text-sm whitespace-pre-wrap break-words",
            expanded ? "max-h-[60vh] overflow-y-auto" : "line-clamp-8",
          )}
        >
          {renderRichText(shown, keyword)}
        </div>
        {!expanded && overflowing ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-card via-card/80 to-transparent" />
        ) : null}
      </div>
      {overflowing || expanded ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          className="self-start text-xs text-primary hover:underline"
        >
          {expanded ? strings.clips.collapse : strings.clips.expand}
        </button>
      ) : null}
    </div>
  );
}
