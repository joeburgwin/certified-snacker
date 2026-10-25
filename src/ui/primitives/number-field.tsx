"use client";

import { NumberField as BaseNumberField } from "@base-ui/react/number-field";
import { Minus, Plus } from "lucide-react";
import type * as React from "react";
import { cn } from "@/lib/utils";

/** Compact stepper used for portions and quantities. */
export function NumberStepper({
  className,
  inputClassName,
  "aria-label": ariaLabel,
  ...props
}: React.ComponentProps<typeof BaseNumberField.Root> & {
  inputClassName?: string;
  "aria-label"?: string;
}) {
  return (
    <BaseNumberField.Root className={cn("inline-flex", className)} {...props}>
      <BaseNumberField.Group className="inline-flex h-8 items-stretch overflow-hidden rounded-control border border-border bg-raised">
        <BaseNumberField.Decrement
          aria-label="Decrease"
          className="inline-flex w-8 items-center justify-center text-muted transition-colors hover:bg-surface hover:text-text disabled:opacity-40"
        >
          <Minus size={14} strokeWidth={1.75} />
        </BaseNumberField.Decrement>
        <BaseNumberField.Input
          aria-label={ariaLabel}
          className={cn(
            "tnum w-10 border-x border-border bg-transparent text-center text-ui text-text outline-none",
            inputClassName,
          )}
        />
        <BaseNumberField.Increment
          aria-label="Increase"
          className="inline-flex w-8 items-center justify-center text-muted transition-colors hover:bg-surface hover:text-text disabled:opacity-40"
        >
          <Plus size={14} strokeWidth={1.75} />
        </BaseNumberField.Increment>
      </BaseNumberField.Group>
    </BaseNumberField.Root>
  );
}
