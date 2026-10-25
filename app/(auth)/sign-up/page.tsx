import { SignUpForm } from "@/ui/auth-forms";

export const metadata = { title: "Create account" };

export default async function SignUpPage(props: PageProps<"/sign-up">) {
  const sp = await props.searchParams;
  const next = typeof sp.next === "string" ? sp.next : undefined;
  return <SignUpForm next={next} />;
}
