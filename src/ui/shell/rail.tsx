"use client";

import { BookOpen, CalendarDays, Plus, ShoppingBasket } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/ui/primitives/tooltip";

const NAV = [
  { href: "/week", label: "Week", icon: CalendarDays },
  { href: "/recipes", label: "Recipes", icon: BookOpen },
  { href: "/shop", label: "Shop", icon: ShoppingBasket },
] as const;

function NavLink({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: typeof CalendarDays;
  active: boolean;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Link
            href={href}
            aria-label={label}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative inline-flex size-10 items-center justify-center rounded-control text-muted transition-colors duration-(--dur-micro) hover:bg-surface hover:text-text",
              active && "text-text",
            )}
          />
        }
      >
        <Icon size={20} strokeWidth={1.5} aria-hidden />
        {active ? (
          <span
            className="absolute left-0 h-5 w-0.5 rounded-full bg-accent"
            aria-hidden
          />
        ) : null}
      </TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}

/** 56 px left rail on laptop, bottom tab bar on phone. `footer` holds theme + account controls. */
export function Rail({ footer }: { footer: ReactNode }) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    <TooltipProvider delay={400}>
      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-30 flex h-14 items-center justify-around border-t border-border bg-raised/95 px-2 backdrop-blur md:inset-y-0 md:left-0 md:h-auto md:w-14 md:flex-col md:justify-start md:gap-1 md:border-t-0 md:border-r md:py-3"
      >
        <Link
          href="/week"
          aria-label="Certified Snacker"
          className="hidden size-10 items-center justify-center rounded-control text-accent md:mb-3 md:inline-flex"
        >
          <span className="size-2.5 rounded-full bg-accent" aria-hidden />
        </Link>
        {NAV.map((item) => (
          <NavLink key={item.href} {...item} active={isActive(item.href)} />
        ))}
        <Tooltip>
          <TooltipTrigger
            render={
              <Link
                href="/import"
                aria-label="Add a recipe"
                className="inline-flex size-10 items-center justify-center rounded-control text-muted transition-colors hover:bg-surface hover:text-text md:mt-2"
              />
            }
          >
            <Plus size={20} strokeWidth={1.5} aria-hidden />
          </TooltipTrigger>
          <TooltipContent side="right">Add a recipe</TooltipContent>
        </Tooltip>
        <div className="flex items-center gap-1 md:mt-auto md:flex-col">
          {footer}
        </div>
      </nav>
    </TooltipProvider>
  );
}
