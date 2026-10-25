import { requireCtx } from "@/server/ctx";
import { AccountMenu } from "@/ui/shell/account-menu";
import { Rail } from "@/ui/shell/rail";
import { ThemeToggle } from "@/ui/theme-toggle";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const ctx = await requireCtx();
  return (
    <div className="min-h-dvh pb-14 md:pb-0 md:pl-14">
      <Rail
        footer={
          <>
            <ThemeToggle />
            <AccountMenu
              name={ctx.person.displayName}
              householdName={ctx.household.name}
            />
          </>
        }
      />
      <main className="mx-auto w-full max-w-[1400px] px-4 py-4 md:px-6 md:py-6">
        {children}
      </main>
    </div>
  );
}
