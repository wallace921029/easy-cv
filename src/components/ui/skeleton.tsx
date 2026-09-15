import { cn } from "cn"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("animate-pulse rounded-lg bg-white/40 dark:bg-white/10 backdrop-blur-xs", className)}
      {...props}
    />
  )
}

export { Skeleton }
