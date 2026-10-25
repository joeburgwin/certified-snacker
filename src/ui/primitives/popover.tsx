"use client";

import { Popover as BasePopover } from "@base-ui/react/popover";
import type * as React from "react";
import { cn } from "@/lib/utils";

export const Popover = BasePopover.Root;
export const PopoverTrigger = BasePopover.Trigger;
export const PopoverClose = BasePopover.Close;
export const PopoverTitle = BasePopover.Title;
export const PopoverDescription = BasePopover.Description;

export function PopoverContent({
  className,
  side = "bottom",
  align = "center",
  sideOffset = 6,
  ...props
}: React.ComponentProps<typeof BasePopover.Popup> &
  Pick<
    React.ComponentProps<typeof BasePopover.Positioner>,
    "side" | "align" | "sideOffset"
  >) {
  return (
    <BasePopover.Portal>
      <BasePopover.Positioner
        side={side}
        align={align}
        sideOffset={sideOffset}
        className="z-50"
      >
        <BasePopover.Popup
          data-slot="popover-content"
          className={cn(
            "w-72 rounded-card border border-border bg-raised p-3 text-ui text-text shadow-[0_8px_24px_rgba(0,0,0,0.12)] outline-none transition-[opacity,transform] duration-(--dur-micro) ease-(--ease-out) data-[ending-style]:scale-[0.98] data-[ending-style]:opacity-0 data-[starting-style]:scale-[0.98] data-[starting-style]:opacity-0",
            className,
          )}
          {...props}
        />
      </BasePopover.Positioner>
    </BasePopover.Portal>
  );
}
