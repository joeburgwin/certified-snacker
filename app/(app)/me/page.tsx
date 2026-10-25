import { EmptyState } from "@/ui/empty-state";

export const metadata = { title: "Me" };

export default function Page() {
  return (
    <EmptyState
      title="Me is coming in the next milestone."
      hint="The week grid is live; recipes, the shopping list and household settings land with M1."
    />
  );
}
