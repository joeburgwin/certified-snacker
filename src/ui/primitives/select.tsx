"use client";

import { Select as BaseSelect } from "@base-ui/react/select";
import { Check, ChevronDown } from "lucide-react";
import type * as React from "react";
import { cn } from "@/lib/utils";

export const Select = BaseSelect.Root;
export const SelectValue = BaseSelect.Value;
export const SelectGroup = BaseSelect.Group;
export const SelectGroupLabel = BaseSelect.GroupLabel;

export function SelectTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<typeof BaseSelect.Trigger>) {
  return (
    <BaseSelect.Trigger
      className={cn(
        "inline-flex h-9 min-w-36 items-center justify-between gap-2 rounded-control border border-border bg-raised px-3 text-ui text-text outline-none transition-colors hover:bg-surface focus-visible:border-accent data-[popup-open]:bg-surface",
        className,
      )}
      {...props}
    >
      {children}
      <BaseSelect.Icon className="text-muted">
        <ChevronDown size={16} strokeWidth={1.5} />
      </BaseSelect.Icon>
    </BaseSelect.Trigger>
  );
}

export function SelectContent({
  className,
  ...props
}: React.ComponentProps<typeof BaseSelect.Popup>) {
  return (
    <BaseSelect.Portal>
      <BaseSelect.Positioner sideOffset={6} className="z-50">
        <BaseSelect.Popup
          className={cn(
            "min-w-(--anchor-width) rounded-card border border-border bg-raised p-1 text-ui text-text shadow-[0_8px_24px_rgba(0,0,0,0.12)] outline-none transition-[opacity,transform] duration-(--dur-micro) data-[ending-style]:opacity-0 data-[starting-style]:opacity-0",
            className,
          )}
          {...props}
        />
      </BaseSelect.Positioner>
    </BaseSelect.Portal>
  );
}

export function SelectItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof BaseSelect.Item>) {
  return (
    <BaseSelect.Item
      className={cn(
        "grid cursor-default select-none grid-cols-[1rem_1fr] items-center gap-2 rounded-control py-1.5 pr-3 pl-2 outline-none data-[highlighted]:bg-surface",
        className,
      )}
      {...props}
    >
      <BaseSelect.ItemIndicator className="col-start-1 text-accent">
        <Check size={14} strokeWidth={2} />
      </BaseSelect.ItemIndicator>
      <BaseSelect.ItemText className="col-start-2">
        {children}
      </BaseSelect.ItemText>
    </BaseSelect.Item>
  );
}
