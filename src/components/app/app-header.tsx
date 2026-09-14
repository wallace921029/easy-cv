import { PlusIcon } from "lucide-react";
import { strings } from "@/lib/strings";
import { Button } from "@/components/ui/button";
import { Logo } from "./logo";
import { UserMenu } from "./user-menu";
import { SearchBox } from "@/components/clips/search-box";

export function AppHeader({
  searchValue,
  onSearchChange,
  onNewClip,
}: {
  searchValue: string;
  onSearchChange: (value: string) => void;
  onNewClip: () => void;
}) {
  return (
    <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex max-w-3xl flex-col gap-2 px-4 py-2 md:h-14 md:flex-row md:items-center md:gap-3 md:py-0">
        <div className="flex items-center justify-between md:contents">
          <Logo />
          <div className="md:hidden">
            <UserMenu />
          </div>
        </div>
        <div className="md:min-w-0 md:flex-1">
          <SearchBox value={searchValue} onChange={onSearchChange} />
        </div>
        <div className="hidden items-center gap-2 md:flex">
          <Button size="sm" onClick={onNewClip}>
            <PlusIcon />
            {strings.clips.new}
          </Button>
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
