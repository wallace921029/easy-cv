import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center border border-transparent bg-clip-padding font-medium whitespace-nowrap transition-all outline-none select-none active:not-aria-[haspopup]:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary/50 dark:focus-visible:outline-primary/40 aria-invalid:border-destructive/80 aria-invalid:outline aria-invalid:outline-2 aria-invalid:outline-offset-2 aria-invalid:outline-destructive/40 dark:aria-invalid:border-destructive/60 dark:aria-invalid:outline-destructive/50",
  {
    variants: {
      variant: {
        default:
          "bg-primary/95 text-primary-foreground backdrop-blur-md hover:bg-primary shadow-xs hover:shadow-sm",
        outline:
          "border-white/40 dark:border-white/10 bg-white/40 dark:bg-white/5 backdrop-blur-md text-foreground hover:bg-white/70 dark:hover:bg-white/10 hover:text-foreground hover:border-white/60 dark:hover:border-white/20 shadow-xs aria-expanded:bg-white/60 dark:aria-expanded:bg-white/10",
        secondary:
          "bg-secondary/70 backdrop-blur-md text-secondary-foreground hover:bg-secondary/90 aria-expanded:bg-secondary/90",
        ghost:
          "hover:bg-white/50 dark:hover:bg-white/10 hover:text-foreground backdrop-blur-xs aria-expanded:bg-white/50 dark:aria-expanded:bg-white/10",
        destructive:
          "border border-destructive/20 bg-destructive/10 backdrop-blur-md text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:outline-destructive/40 dark:bg-destructive/20 dark:hover:bg-destructive/30",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default:
          "h-9 gap-1.5 px-3.5 rounded-xl text-sm has-data-[icon=inline-end]:pr-2.5 has-data-[icon=inline-start]:pl-2.5 [&_svg:not([class*='size-'])]:size-4",
        sm: "h-8 gap-1.5 px-2.5 rounded-lg text-xs font-medium in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-3.5",
        xs: "h-7 gap-1 px-2 rounded-md text-xs in-data-[slot=button-group]:rounded-md has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        lg: "h-10 gap-2 px-4 rounded-xl text-base has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3 [&_svg:not([class*='size-'])]:size-4.5",
        icon: "size-9 rounded-xl [&_svg:not([class*='size-'])]:size-4",
        "icon-sm":
          "size-8 rounded-lg in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3.5",
        "icon-xs":
          "size-7 rounded-md in-data-[slot=button-group]:rounded-md [&_svg:not([class*='size-'])]:size-3",
        "icon-lg": "size-10 rounded-xl [&_svg:not([class*='size-'])]:size-5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
