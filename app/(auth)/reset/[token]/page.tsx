import { loadToken } from "@/server/actions/household";
import { ResetPasswordForm } from "@/ui/token-forms";

export const metadata = { title: "Reset password" };

export default async function ResetPage(props: PageProps<"/reset/[token]">) {
  const { token } = await props.params;
  const row = await loadToken(token, "reset");
  if (!row) {
    return (
      <div className="flex flex-col gap-3 text-center">
        <h1 className="text-title font-semibold tracking-tight">
          This link has expired
        </h1>
        <p className="text-ui text-muted">
          Ask the household manager for a new reset link.
        </p>
      </div>
    );
  }
  return (
    <ResetPasswordForm token={token} personName={row.person.displayName} />
  );
}
