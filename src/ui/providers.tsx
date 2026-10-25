"use client";

import { MotionConfig } from "motion/react";
import type { ReactNode } from "react";
import { Toaster } from "sonner";

/** Client-side context: motion preferences and toasts. Keep this file tiny. */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      {children}
      <Toaster
        position="bottom-center"
        duration={3200}
        toastOptions={{
          unstyled: true,
          classNames: {
            toast:
              "flex items-center gap-3 rounded-card border border-border bg-raised px-4 py-3 text-ui text-text shadow-[0_8px_24px_rgba(0,0,0,0.12)]",
            description: "text-muted",
            actionButton:
              "ml-auto rounded-control bg-accent px-2 py-1 text-ui font-medium text-accent-fg",
          },
        }}
      />
    </MotionConfig>
  );
}
