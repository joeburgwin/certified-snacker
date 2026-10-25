"use client";

import { Dialog as BaseDialog } from "@base-ui/react/dialog";
import { X } from "lucide-react";
import type * as React from "react";
import { cn } from "@/lib/utils";

/** A right-side panel built on Dialog: recipe sheet, filters, settings. */
export const Sheet = BaseDialog.Root;
export const SheetTrigger = BaseDialog.Trigger;
export const SheetClose = BaseDialog.Close;
export const SheetTitle = BaseDialog.Title;
export const SheetDescription = BaseDialog.Description;

export function SheetContent({
  className,
  children,
  side = "right",
  ...props
}: React.ComponentProps<typeof BaseDialog.Popup> & {
  side?: "right" | "bottom";
}) {
  return (
    <BaseDialog.Portal>
      <BaseDialog.Backdrop className="fixed inset-0 z-40 bg-black/25 transition-opacity duration-(--dur-sheet) ease-(--ease-sheet) data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
      <BaseDialog.Popup
        data-slot="sheet-content"
        className={cn(
          "fixed z-50 flex flex-col border-border bg-raised text-text shadow-[0_16px_48px_rgba(0,0,0,0.18)] outline-none transition-transform duration-(--dur-sheet) ease-(--ease-sheet)",
          side === "right"
            ? "inset-y-0 right-0 w-[min(100vw,30rem)] border-l data-[ending-style]:translate-x-full data-[starting-style]:translate-x-full"
            : "inset-x-0 bottom-0 max-h-[90dvh] rounded-t-sheet border-t data-[ending-style]:translate-y-full data-[starting-style]:translate-y-full",
          className,
        )}
        {...props}
      >
        {children}
        <BaseDialog.Close
          aria-label="Close"
          className="absolute top-3 right-3 inline-flex size-8 items-center justify-center rounded-control text-muted hover:bg-surface hover:text-text"
        >
          <X size={16} strokeWidth={1.5} />
        </BaseDialog.Close>
      </BaseDialog.Popup>
    </BaseDialog.Portal>
  );
}
