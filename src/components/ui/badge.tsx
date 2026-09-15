import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

const badgeVariants = cva(
  "group/badge inline-flex h-5.5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border border-white/40 dark:border-white/10 backdrop-blur-md px-2.5 py-0.5 text-xs font-medium whitespace-nowrap transition-all focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default: "bg-primary/90 text-primary-foreground [a]:hover:bg-primary",
        secondary:
          "bg-white/40 dark:bg-white/10 text-secondary-foreground [a]:hover:bg-white/60 dark:[a]:hover:bg-white/15",
        destructive:
          "bg-destructive/15 text-destructive border-destructive/20 focus-visible:ring-destructive/20 dark:bg-destructive/25 dark:focus-visible:ring-destructive/40 [a]:hover:bg-destructive/25",
        outline:
          "border-white/40 dark:border-white/15 bg-white/20 dark:bg-white/5 text-foreground [a]:hover:bg-white/40 dark:[a]:hover:bg-white/10",
        ghost:
          "hover:bg-white/40 dark:hover:bg-white/10 hover:text-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  render,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant }), className),
      },
      props
    ),
    render,
    state: {
      slot: "badge",
      variant,
    },
  })
}

export { Badge, badgeVariants }
