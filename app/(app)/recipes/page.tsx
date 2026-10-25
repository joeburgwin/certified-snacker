import { EmptyState } from "@/ui/empty-state";

export const metadata = { title: "Recipes" };

export default function Page() {
  return (
    <EmptyState
      title="Recipes is coming in the next milestone."
      hint="The week grid is live; recipes, the shopping list and household settings land with M1."
    />
  );
}
