import Link from "next/link";
import { redirect } from "next/navigation";
import { isIsoDate, isoDate, todayIn, weekStartFor } from "@/domain/dates";
import { requireCtx } from "@/server/ctx";
import { EmptyState } from "@/ui/empty-state";
import { WeekGrid } from "@/ui/planner/week-grid";
import { Button } from "@/ui/primitives/button";

export const metadata = { title: "Week" };

export default async function WeekPage(
  props: PageProps<"/week/[[...weekStart]]">,
) {
  const ctx = await requireCtx();
  const { weekStart: segments } = await props.params;
  const today = todayIn(ctx.household.timezone);
  const requested = segments?.[0];

  let weekStart = weekStartFor(today, ctx.household.weekStartsOn);
  if (requested !== undefined) {
    if (!isIsoDate(requested)) redirect("/week");
    const canonical = weekStartFor(
      isoDate(requested),
      ctx.household.weekStartsOn,
    );
    if (canonical !== requested) redirect(`/week/${canonical}`);
    weekStart = canonical;
  }

  return (
    <div className="flex flex-col gap-6">
      <WeekGrid weekStart={weekStart} today={today} />
      <EmptyState
        title="Your week is empty."
        hint="Paste a recipe link or drop a set breakfast onto a day. Recipes, drag-and-drop and the shopping list arrive in the next milestone."
        actions={
          <>
            <Button variant="primary" render={<Link href="/import" />}>
              Paste a recipe link
            </Button>
            <Button variant="secondary" render={<Link href="/household" />}>
              Add a set breakfast
            </Button>
          </>
        }
      />
    </div>
  );
}
