import { Link } from "react-router";
import { ArrowLeftIcon } from "lucide-react";
import { strings } from "@/lib/strings";
import { Button } from "@/components/ui/button";

export function PageHeader({ title }: { title: string }) {
  return (
    <header className="border-b">
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
