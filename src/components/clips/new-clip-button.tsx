import { PlusIcon } from "lucide-react";
import { strings } from "@/lib/strings";
import { Button } from "@/components/ui/button";

export function NewClipButton({ onClick }: { onClick: () => void }) {
  return (
    <Button variant="ghost" size="icon" aria-label={strings.clips.new} title={strings.clips.new} onClick={onClick} className="shrink-0 hover:bg-transparent">
      <PlusIcon />
    </Button>
  );
}
