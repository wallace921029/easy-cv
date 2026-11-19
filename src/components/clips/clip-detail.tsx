import { renderRichText } from "@/lib/rich-text";
import { strings } from "@/lib/strings";
import type { Clip } from "@/lib/types";
import { SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";

export function ClipDetail({ clip }: { clip: Clip }) {
  return (
    <>
      <SheetHeader className="pr-12">
        <SheetTitle className="break-words">{clip.name || strings.clips.untitled}</SheetTitle>
        <SheetDescription className="sr-only">{strings.clips.detail}</SheetDescription>
      </SheetHeader>
      <div className="min-h-0 flex-1 overflow-y-auto whitespace-pre-wrap break-words px-4 pb-4 text-sm">
        {renderRichText(clip.content)}
      </div>
    </>
  );
}
