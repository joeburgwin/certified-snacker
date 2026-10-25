"use client";

import { Switch as BaseSwitch } from "@base-ui/react/switch";
import type * as React from "react";
import { cn } from "@/lib/utils";

export function Switch({
  className,
  ...props
}: React.ComponentProps<typeof BaseSwitch.Root>) {
  return (
    <BaseSwitch.Root
      data-slot="switch"
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border border-border bg-surface p-0.5 outline-none transition-colors duration-(--dur-micro) data-[checked]:border-accent data-[checked]:bg-accent disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <BaseSwitch.Thumb className="size-3.5 rounded-full bg-raised shadow-sm transition-transform duration-(--dur-micro) ease-(--ease-out) data-[checked]:translate-x-4" />
    </BaseSwitch.Root>
  );
}
