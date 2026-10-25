import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** One sentence, at most two actions. No illustrations, no carousel. */
export function EmptyState({
  title,
  hint,
  actions,
  className,
}: {
  title: string;
  hint?: string;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 px-6 py-16 text-center",
        className,
      )}
    >
      <p className="text-body text-text">{title}</p>
      {hint ? <p className="max-w-sm text-ui text-muted">{hint}</p> : null}
      {actions ? (
        <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
          {actions}
        </div>
      ) : null}
    </div>
  );
}
