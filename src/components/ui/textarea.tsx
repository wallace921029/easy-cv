import * as React from "react"
import { cn } from "cn"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-16 w-full min-w-0 max-w-full rounded-xl border border-white/40 dark:border-white/10 bg-white/40 dark:bg-white/5 backdrop-blur-md px-3 py-2 text-sm transition-all outline-none placeholder:text-muted-foreground/70 overflow-y-auto [overflow-wrap:anywhere]",
        "focus-visible:border-primary/50 dark:focus-visible:border-primary/45",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary/45 dark:focus-visible:outline-primary/40",
        "disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50",
        "aria-invalid:border-destructive/80 aria-invalid:outline aria-invalid:outline-2 aria-invalid:outline-offset-2 aria-invalid:outline-destructive/40 dark:aria-invalid:border-destructive/60 dark:aria-invalid:outline-destructive/50",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
