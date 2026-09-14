import { PlusIcon } from "lucide-react";
import { strings } from "@/lib/strings";
import { Button } from "@/components/ui/button";

// Mobile-only create shortcut; desktop uses the header button.
export function NewClipFab({ onClick }: { onClick: () => void }) {
  return (
    <Button
      size="icon-lg"
      aria-label={strings.clips.new}
      onClick={onClick}
      className="fixed right-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-40 rounded-full shadow-lg md:hidden"
    >
      <PlusIcon />
    </Button>
  );
}
