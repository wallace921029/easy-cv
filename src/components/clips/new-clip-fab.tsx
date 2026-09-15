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
      className="fixed right-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-40 rounded-full bg-primary/90 text-primary-foreground backdrop-blur-xl border border-white/30 dark:border-white/20 shadow-[0_10px_25px_rgba(0,0,0,0.18)] dark:shadow-[0_10px_25px_rgba(0,0,0,0.5)] transition-all hover:scale-105 active:scale-95 md:hidden"
    >
      <PlusIcon />
    </Button>
  );
}
