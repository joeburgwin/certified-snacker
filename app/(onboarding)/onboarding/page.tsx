import { redirect } from "next/navigation";
import { getCtxOrNull, getSession } from "@/server/ctx";
import { OnboardingForm } from "@/ui/onboarding-form";

export const metadata = { title: "Name your household" };

export default async function OnboardingPage() {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  if (await getCtxOrNull()) redirect("/week");
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <OnboardingForm defaultName={session.user.name} />
      </div>
    </main>
  );
}
