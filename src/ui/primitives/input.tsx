"use client";

import { Input as BaseInput } from "@base-ui/react/input";
import type * as React from "react";
import { cn } from "@/lib/utils";

export type InputProps = React.ComponentProps<typeof BaseInput>;

export function Input({ className, ...props }: InputProps) {
  return (
    <BaseInput
      data-slot="input"
      className={cn(
        "h-9 w-full min-w-0 rounded-control border border-border bg-raised px-3 text-ui text-text placeholder:text-muted outline-none transition-[border-color,box-shadow] focus:border-accent focus:ring-2 focus:ring-accent/25 disabled:opacity-50 aria-invalid:border-rose",
        className,
      )}
      {...props}
    />
  );
}
