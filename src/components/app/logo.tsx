import { cn } from "cn";
import { strings } from "@/lib/strings";

export function Logo({
  className,
  size = "default",
}: {
  className?: string;
  size?: "default" | "lg";
}) {
  const isLg = size === "lg";
  return (
    <div className={cn("flex items-center gap-2.5 select-none", className)}>
      <div
        className={cn(
          "flex shrink-0 items-center justify-center overflow-hidden border border-white/60 dark:border-white/15 bg-white/50 dark:bg-white/10 backdrop-blur-md shadow-xs transition-transform",
          isLg ? "size-11 rounded-2xl p-1.5" : "size-8 rounded-xl p-1"
        )}
      >
        <img
          src="/apple-touch-icon.png"
          alt={strings.appName}
          className="size-full object-contain dark:invert"
        />
      </div>
      <span
        className={cn(
          "font-semibold tracking-tight",
          isLg ? "text-xl" : "text-lg"
        )}
      >
        {strings.appName}
      </span>
    </div>
  );
}
