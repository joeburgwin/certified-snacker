"use client";

import { Toggle as BaseToggle } from "@base-ui/react/toggle";
import type * as React from "react";
import { cn } from "@/lib/utils";

/** A pressable chip: gym day, dietary toggle, filters. */
export function Toggle({
  className,
  ...props
}: React.ComponentProps<typeof BaseToggle>) {
  return (
    <BaseToggle
      data-slot="toggle"
      className={cn(
        "inline-flex h-8 select-none items-center gap-1.5 rounded-full border border-border bg-raised px-3 text-ui text-muted outline-none transition-colors duration-(--dur-micro) hover:text-text data-[pressed]:border-accent data-[pressed]:bg-accent-soft data-[pressed]:text-text [&_svg]:size-4",
        className,
      )}
      {...props}
    />
  );
}
