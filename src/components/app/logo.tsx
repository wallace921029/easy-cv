import { ClipboardListIcon } from "lucide-react";
import { cn } from "cn";
import { strings } from "@/lib/strings";

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <ClipboardListIcon className="size-6 text-primary" aria-hidden="true" />
      <span className="text-lg font-semibold tracking-tight">{strings.appName}</span>
    </div>
  );
}
