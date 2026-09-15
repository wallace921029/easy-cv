import { Link } from "react-router";
import { ArrowLeftIcon } from "lucide-react";
import { strings } from "@/lib/strings";
import { Button } from "@/components/ui/button";

export function PageHeader({ title }: { title: string }) {
  return (
    <header className="sticky top-0 z-30 border-b border-white/20 dark:border-white/10 bg-background/65 dark:bg-background/60 backdrop-blur-2xl backdrop-saturate-180 shadow-[0_4px_20px_rgba(0,0,0,0.02)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.25)] transition-all">
      <div className="mx-auto flex h-14 max-w-3xl items-center gap-2 px-4">
        <Button variant="ghost" size="sm" render={<Link to="/" />}>
          <ArrowLeftIcon />
          {strings.common.backHome}
        </Button>
        <span className="font-medium">{title}</span>
      </div>
    </header>
  );
}
