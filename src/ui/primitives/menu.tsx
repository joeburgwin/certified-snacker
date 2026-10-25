"use client";

import { Menu as BaseMenu } from "@base-ui/react/menu";
import type * as React from "react";
import { cn } from "@/lib/utils";

export const Menu = BaseMenu.Root;
export const MenuTrigger = BaseMenu.Trigger;
export const MenuGroup = BaseMenu.Group;

export function MenuContent({
  className,
  side = "bottom",
  align = "start",
  sideOffset = 6,
  ...props
}: React.ComponentProps<typeof BaseMenu.Popup> &
  Pick<
    React.ComponentProps<typeof BaseMenu.Positioner>,
    "side" | "align" | "sideOffset"
  >) {
  return (
    <BaseMenu.Portal>
      <BaseMenu.Positioner
        side={side}
        align={align}
        sideOffset={sideOffset}
        className="z-50"
      >
        <BaseMenu.Popup
          data-slot="menu-content"
          className={cn(
            "min-w-44 rounded-card border border-border bg-raised p-1 text-ui text-text shadow-[0_8px_24px_rgba(0,0,0,0.12)] outline-none transition-[opacity,transform] duration-(--dur-micro) ease-(--ease-out) data-[ending-style]:scale-[0.98] data-[ending-style]:opacity-0 data-[starting-style]:scale-[0.98] data-[starting-style]:opacity-0",
            className,
          )}
          {...props}
        />
      </BaseMenu.Positioner>
    </BaseMenu.Portal>
  );
}

export function MenuItem({
  className,
  ...props
}: React.ComponentProps<typeof BaseMenu.Item>) {
  return (
    <BaseMenu.Item
      className={cn(
        "flex cursor-default select-none items-center gap-2 rounded-control px-2 py-1.5 outline-none data-[disabled]:opacity-50 data-[highlighted]:bg-surface [&_svg]:size-4 [&_svg]:text-muted",
        className,
      )}
      {...props}
    />
  );
}

export function MenuLinkItem({
  className,
  ...props
}: React.ComponentProps<typeof BaseMenu.LinkItem>) {
  return (
    <BaseMenu.LinkItem
      className={cn(
        "flex cursor-default select-none items-center gap-2 rounded-control px-2 py-1.5 outline-none data-[highlighted]:bg-surface [&_svg]:size-4 [&_svg]:text-muted",
        className,
      )}
      {...props}
    />
  );
}

export function MenuSeparator({
  className,
  ...props
}: React.ComponentProps<typeof BaseMenu.Separator>) {
  return (
    <BaseMenu.Separator
      className={cn("my-1 h-px bg-border", className)}
      {...props}
    />
  );
}

export function MenuGroupLabel({
  className,
  ...props
}: React.ComponentProps<typeof BaseMenu.GroupLabel>) {
  return (
    <BaseMenu.GroupLabel
      className={cn("px-2 py-1 text-meta text-muted", className)}
      {...props}
    />
  );
}
