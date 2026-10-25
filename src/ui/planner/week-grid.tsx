import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { addDays, formatDay, type IsoDate, weekDays } from "@/domain/dates";
import { cn } from "@/lib/utils";
import { Button } from "@/ui/primitives/button";

export const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"] as const;
export type MealType = (typeof MEAL_TYPES)[number];
const MEAL_LABEL: Record<MealType, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snacks",
};

/** The hero: 7 days × 4 meals as a real table. M0 renders empty slots; M1 fills them with components. */
export function WeekGrid({
  weekStart,
  today,
}: {
  weekStart: IsoDate;
  today: IsoDate;
}) {
  const days = weekDays(weekStart);
  const last = days[6] as IsoDate;
  const label = `${formatDay(weekStart, { day: "numeric", month: "short" })} – ${formatDay(
    last,
    {
      day: "numeric",
      month: "short",
      year: "numeric",
    },
  )}`;

  return (
    <section aria-label="Week planner" className="flex flex-col gap-4">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Previous week"
            render={<Link href={`/week/${addDays(weekStart, -7)}`} />}
          >
            <ChevronLeft />
          </Button>
          <h1 className="tnum min-w-48 text-center text-ui font-medium tracking-tight md:text-body">
            {label}
          </h1>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Next week"
            render={<Link href={`/week/${addDays(weekStart, 7)}`} />}
          >
            <ChevronRight />
          </Button>
        </div>
        <Button variant="ghost" size="sm" render={<Link href="/week" />}>
          Today
        </Button>
      </header>

      <div className="overflow-x-auto rounded-card border border-border">
        <table className="w-full min-w-[840px] table-fixed border-separate border-spacing-px bg-border text-left">
          <caption className="sr-only">
            Meals planned for the week of {formatDay(weekStart)}
          </caption>
          <thead>
            <tr>
              <th
                scope="col"
                className="w-[4.5rem] bg-surface"
                aria-label="Meal"
              />
              {days.map((d) => (
                <th
                  key={d}
                  scope="col"
                  className={cn(
                    "bg-surface px-2 py-2 text-center text-meta font-normal text-muted",
                    d === today && "text-text",
                  )}
                >
                  <span className="block">
                    {formatDay(d, { weekday: "short" })}
                  </span>
                  <span
                    className={cn(
                      "tnum mt-0.5 inline-flex size-6 items-center justify-center rounded-full text-ui",
                      d === today && "bg-accent text-accent-fg",
                    )}
                  >
                    {formatDay(d, { day: "numeric" })}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MEAL_TYPES.map((meal) => (
              <tr key={meal}>
                <th
                  scope="row"
                  className="bg-surface px-2 py-2 align-top text-meta font-normal text-muted"
                >
                  {MEAL_LABEL[meal]}
                </th>
                {days.map((d) => (
                  <td
                    key={`${d}-${meal}`}
                    className={cn(
                      "group h-24 bg-bg p-1.5 align-top",
                      d < today && "bg-surface/60",
                    )}
                  >
                    <button
                      type="button"
                      className="flex h-full min-h-20 w-full items-center justify-center rounded-control text-muted/0 transition-colors duration-(--dur-micro) hover:bg-surface group-hover:text-muted/70"
                      aria-label={`Add to ${MEAL_LABEL[meal]} on ${formatDay(d)}`}
                    >
                      <span className="text-title font-light">+</span>
                    </button>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
