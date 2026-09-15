import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"
import { cn } from "cn"

export type InputProps = Omit<React.ComponentProps<"input">, "size"> & {
  size?: "default" | "sm" | "lg"
}

function Input({ className, type, size = "default", ...props }: InputProps) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      data-size={size}
      className={cn(
        "w-full min-w-0 max-w-full border border-white/40 dark:border-white/10 bg-white/40 dark:bg-white/5 backdrop-blur-md transition-all outline-none",
        "placeholder:text-muted-foreground/70 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50",
        // Unified sizing
        "data-[size=default]:h-9 data-[size=default]:rounded-xl data-[size=default]:px-3 data-[size=default]:py-1.5 data-[size=default]:text-sm",
        "data-[size=sm]:h-8 data-[size=sm]:rounded-lg data-[size=sm]:px-2.5 data-[size=sm]:py-1 data-[size=sm]:text-xs",
        "data-[size=lg]:h-10 data-[size=lg]:rounded-xl data-[size=lg]:px-3.5 data-[size=lg]:py-2 data-[size=lg]:text-base",
        // Files
        "file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
        // Frosted glass focus state: 2px offset outline preserves glass translucency & specular borders
        "focus-visible:border-primary/50 dark:focus-visible:border-primary/45",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary/45 dark:focus-visible:outline-primary/40",
        // Error state via outline
        "aria-invalid:border-destructive/80 aria-invalid:outline aria-invalid:outline-2 aria-invalid:outline-offset-2 aria-invalid:outline-destructive/40 dark:aria-invalid:border-destructive/60 dark:aria-invalid:outline-destructive/50",
        className
      )}
      {...props}
    />
  )
}

export { Input }
