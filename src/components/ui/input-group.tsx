"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

import { Input as InputPrimitive } from "@base-ui/react/input"
import { Button } from "@/components/ui/button"

export type InputGroupProps = React.ComponentProps<"div"> & {
  size?: "default" | "sm" | "lg"
}

function InputGroup({ className, size = "default", ...props }: InputGroupProps) {
  return (
    <div
      data-slot="input-group"
      data-size={size}
      role="group"
      className={cn(
        "group/input-group relative flex w-full min-w-0 items-center border border-white/40 dark:border-white/10 bg-white/40 dark:bg-white/5 backdrop-blur-md transition-all shadow-xs outline-none",
        // Unified sizing
        "data-[size=default]:h-9 data-[size=default]:rounded-xl",
        "data-[size=sm]:h-8 data-[size=sm]:rounded-lg",
        "data-[size=lg]:h-10 data-[size=lg]:rounded-xl",
        "in-data-[slot=combobox-content]:focus-within:border-inherit in-data-[slot=combobox-content]:focus-within:ring-0",
        "has-disabled:bg-input/50 has-disabled:opacity-50 dark:has-disabled:bg-input/80",
        // Frosted glass focus state via 2px offset outline
        "has-[[data-slot=input-group-control]:focus-visible]:border-primary/50 dark:has-[[data-slot=input-group-control]:focus-visible]:border-primary/45",
        "has-[[data-slot=input-group-control]:focus-visible]:outline has-[[data-slot=input-group-control]:focus-visible]:outline-2 has-[[data-slot=input-group-control]:focus-visible]:outline-offset-2 has-[[data-slot=input-group-control]:focus-visible]:outline-primary/45 dark:has-[[data-slot=input-group-control]:focus-visible]:outline-primary/40",
        // Error state via outline
        "has-[[data-slot][aria-invalid=true]]:border-destructive/80 has-[[data-slot][aria-invalid=true]]:outline has-[[data-slot][aria-invalid=true]]:outline-2 has-[[data-slot][aria-invalid=true]]:outline-offset-2 has-[[data-slot][aria-invalid=true]]:outline-destructive/40 dark:has-[[data-slot][aria-invalid=true]]:border-destructive/60 dark:has-[[data-slot][aria-invalid=true]]:outline-destructive/50",
        // Layout modifiers
        "has-[>[data-align=block-end]]:h-auto has-[>[data-align=block-end]]:flex-col has-[>[data-align=block-start]]:h-auto has-[>[data-align=block-start]]:flex-col has-[>textarea]:h-auto",
        "has-[>[data-align=block-end]]:[&>input]:pt-3 has-[>[data-align=block-start]]:[&>input]:pb-3 has-[>[data-align=inline-end]]:[&>input]:pr-1.5 has-[>[data-align=inline-start]]:[&>input]:pl-1.5",
        className
      )}
      {...props}
    />
  )
}

const inputGroupAddonVariants = cva(
  "flex h-auto cursor-text items-center justify-center gap-2 py-1.5 text-sm font-medium text-muted-foreground select-none group-data-[disabled=true]/input-group:opacity-50 [&>kbd]:rounded-[calc(var(--radius)-5px)] [&>svg:not([class*='size-'])]:size-4",
  {
    variants: {
      align: {
        "inline-start":
          "order-first pl-2 has-[>button]:ml-[-0.3rem] has-[>kbd]:ml-[-0.15rem]",
        "inline-end":
          "order-last pr-2 has-[>button]:mr-[-0.3rem] has-[>kbd]:mr-[-0.15rem]",
        "block-start":
          "order-first w-full justify-start px-2.5 pt-2 group-has-[>input]/input-group:pt-2 [.border-b]:pb-2",
        "block-end":
          "order-last w-full justify-start px-2.5 pb-2 group-has-[>input]/input-group:pb-2 [.border-t]:pt-2",
      },
    },
    defaultVariants: {
      align: "inline-start",
    },
  }
)

function InputGroupAddon({
  className,
  align = "inline-start",
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof inputGroupAddonVariants>) {
  return (
    <div
      role="group"
      data-slot="input-group-addon"
      data-align={align}
      className={cn(inputGroupAddonVariants({ align }), className)}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest("button")) {
          return
        }
        e.currentTarget.parentElement?.querySelector("input")?.focus()
      }}
      {...props}
    />
  )
}

const inputGroupButtonVariants = cva(
  "flex items-center gap-1.5 text-sm shadow-none",
  {
    variants: {
      size: {
        xs: "h-6 gap-1 rounded-md px-1.5 text-xs [&>svg:not([class*='size-'])]:size-3",
        sm: "h-7 gap-1.5 rounded-lg px-2 text-xs [&>svg:not([class*='size-'])]:size-3.5",
        "icon-xs":
          "size-6 rounded-md p-0 has-[>svg]:p-0 [&>svg:not([class*='size-'])]:size-3.5",
        "icon-sm": "size-7 rounded-lg p-0 has-[>svg]:p-0 [&>svg:not([class*='size-'])]:size-4",
      },
    },
    defaultVariants: {
      size: "xs",
    },
  }
)

function InputGroupButton({
  className,
  type = "button",
  variant = "ghost",
  size = "xs",
  ...props
}: Omit<React.ComponentProps<typeof Button>, "size" | "type"> &
  VariantProps<typeof inputGroupButtonVariants> & {
    type?: "button" | "submit" | "reset"
  }) {
  return (
    <Button
      type={type}
      data-size={size}
      variant={variant}
      className={cn(inputGroupButtonVariants({ size }), className)}
      {...props}
    />
  )
}

function InputGroupText({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      className={cn(
        "flex items-center gap-2 text-sm text-muted-foreground [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    />
  )
}

export type InputGroupInputProps = Omit<React.ComponentProps<"input">, "size"> & {
  size?: "default" | "sm" | "lg"
}

function InputGroupInput({
  className,
  size: _size,
  ...props
}: InputGroupInputProps) {
  return (
    <InputPrimitive
      data-slot="input-group-control"
      className={cn(
        "h-full flex-1 min-w-0 border-0 bg-transparent px-2.5 py-1 text-sm shadow-none ring-0 outline-none placeholder:text-muted-foreground/70 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-transparent disabled:opacity-50 dark:bg-transparent dark:disabled:bg-transparent",
        className
      )}
      {...props}
    />
  )
}

function InputGroupTextarea({
  className,
  ...props
}: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="input-group-control"
      className={cn(
        "flex-1 min-w-0 resize-none border-0 bg-transparent px-2.5 py-2 text-sm shadow-none ring-0 outline-none placeholder:text-muted-foreground/70 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-transparent disabled:opacity-50 dark:bg-transparent dark:disabled:bg-transparent",
        className
      )}
      {...props}
    />
  )
}

export {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupText,
  InputGroupInput,
  InputGroupTextarea,
}
