import { SignInForm } from "@/ui/auth-forms";

export const metadata = { title: "Sign in" };

export default async function SignInPage(props: PageProps<"/sign-in">) {
  const sp = await props.searchParams;
  const next = typeof sp.next === "string" ? sp.next : undefined;
  const notice =
    sp.reset === "1"
      ? "Password updated. Sign in with the new one."
      : undefined;
  return <SignInForm next={next} notice={notice} />;
}
