"use client";

import { Tabs as BaseTabs } from "@base-ui/react/tabs";
import type * as React from "react";
import { cn } from "@/lib/utils";

export const Tabs = BaseTabs.Root;
export const TabsPanel = BaseTabs.Panel;

export function TabsList({
  className,
  children,
  ...props
}: React.ComponentProps<typeof BaseTabs.List>) {
  return (
    <BaseTabs.List
      className={cn("relative flex gap-1 border-b border-border", className)}
      {...props}
    >
      {children}
      <BaseTabs.Indicator className="absolute bottom-0 left-(--active-tab-left) h-0.5 w-(--active-tab-width) bg-accent transition-[left,width] duration-(--dur-move) ease-(--ease-standard)" />
    </BaseTabs.List>
  );
}

export function Tab({
  className,
  ...props
}: React.ComponentProps<typeof BaseTabs.Tab>) {
  return (
    <BaseTabs.Tab
      className={cn(
        "-mb-px select-none px-2.5 py-2 text-ui text-muted outline-none transition-colors hover:text-text data-[selected]:text-text",
        className,
      )}
      {...props}
    />
  );
}
