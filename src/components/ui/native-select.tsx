import * as React from "react"
import { cn } from "cn"
import { ChevronDownIcon } from "lucide-react"

type NativeSelectProps = Omit<React.ComponentProps<"select">, "size"> & {
  size?: "sm" | "default" | "lg"
}

function NativeSelect({
  className,
  size = "default",
  ...props
}: NativeSelectProps) {
  return (
    <div
      className={cn(
        "group/native-select relative w-fit has-[select:disabled]:opacity-50",
        className
      )}
      data-slot="native-select-wrapper"
      data-size={size}
    >
      <select
        data-slot="native-select"
        data-size={size}
        className={cn(
          "w-full min-w-0 appearance-none border border-white/40 dark:border-white/10 bg-white/40 dark:bg-white/5 backdrop-blur-md transition-all outline-none select-none selection:bg-primary selection:text-primary-foreground placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed",
          // Unified sizing
          "data-[size=default]:h-9 data-[size=default]:rounded-xl data-[size=default]:pr-8 data-[size=default]:pl-3 data-[size=default]:py-1.5 data-[size=default]:text-sm",
          "data-[size=sm]:h-8 data-[size=sm]:rounded-lg data-[size=sm]:pr-7 data-[size=sm]:pl-2.5 data-[size=sm]:py-1 data-[size=sm]:text-xs",
          "data-[size=lg]:h-10 data-[size=lg]:rounded-xl data-[size=lg]:pr-9 data-[size=lg]:pl-3.5 data-[size=lg]:py-2 data-[size=lg]:text-base",
          // Frosted glass focus state via 2px offset outline
          "focus-visible:border-primary/50 dark:focus-visible:border-primary/45",
          "focus-visible:bg-white/50 dark:focus-visible:bg-white/10",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary/45 dark:focus-visible:outline-primary/40",
          // Error state via outline
          "aria-invalid:border-destructive/80 aria-invalid:outline aria-invalid:outline-2 aria-invalid:outline-offset-2 aria-invalid:outline-destructive/40 dark:aria-invalid:border-destructive/60 dark:aria-invalid:outline-destructive/50"
        )}
        {...props}
      />
      <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-muted-foreground select-none" aria-hidden="true" data-slot="native-select-icon" />
    </div>
  )
}

function NativeSelectOption({
  className,
  ...props
}: React.ComponentProps<"option">) {
  return (
    <option
      data-slot="native-select-option"
      className={cn("bg-[Canvas] text-[CanvasText]", className)}
      {...props}
    />
  )
}

function NativeSelectOptGroup({
  className,
  ...props
}: React.ComponentProps<"optgroup">) {
  return (
    <optgroup
      data-slot="native-select-optgroup"
      className={cn("bg-[Canvas] text-[CanvasText]", className)}
      {...props}
    />
  )
}

export { NativeSelect, NativeSelectOptGroup, NativeSelectOption }
