"use client";

import { Tooltip as BaseTooltip } from "@base-ui/react/tooltip";
import type * as React from "react";
import { cn } from "@/lib/utils";

export const TooltipProvider = BaseTooltip.Provider;
export const Tooltip = BaseTooltip.Root;
export const TooltipTrigger = BaseTooltip.Trigger;

export function TooltipContent({
  className,
  side = "top",
  sideOffset = 6,
  ...props
}: React.ComponentProps<typeof BaseTooltip.Popup> &
  Pick<
    React.ComponentProps<typeof BaseTooltip.Positioner>,
    "side" | "sideOffset"
  >) {
  return (
    <BaseTooltip.Portal>
      <BaseTooltip.Positioner
        side={side}
        sideOffset={sideOffset}
        className="z-50"
      >
        <BaseTooltip.Popup
          className={cn(
            "rounded-control bg-text px-2 py-1 text-meta text-bg shadow-sm transition-opacity duration-(--dur-micro) data-[ending-style]:opacity-0 data-[starting-style]:opacity-0",
            className,
          )}
          {...props}
        />
      </BaseTooltip.Positioner>
    </BaseTooltip.Portal>
  );
}
