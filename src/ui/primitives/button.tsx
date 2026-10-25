"use client";

import { Button as BaseButton } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "inline-flex shrink-0 select-none items-center justify-center gap-2 whitespace-nowrap rounded-control font-medium transition-[background-color,color,box-shadow,opacity] duration-(--dur-micro) ease-(--ease-out) disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "bg-accent text-accent-fg hover:brightness-[1.05] active:brightness-95",
        secondary: "border border-border bg-raised text-text hover:bg-surface",
        ghost: "text-text hover:bg-surface",
        subtle: "bg-surface text-text hover:bg-border/60",
        danger: "text-rose hover:bg-rose-soft",
        link: "text-accent underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-8 px-2.5 text-ui [&_svg]:size-4",
        md: "h-9 px-3 text-ui [&_svg]:size-4",
        lg: "h-10 px-4 text-body [&_svg]:size-5",
        icon: "size-9 [&_svg]:size-5",
        "icon-sm": "size-8 [&_svg]:size-4",
      },
    },
    defaultVariants: { variant: "secondary", size: "md" },
  },
);

export type ButtonProps = React.ComponentProps<typeof BaseButton> &
  VariantProps<typeof buttonVariants>;

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return (
    <BaseButton
      data-slot="button"
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}
