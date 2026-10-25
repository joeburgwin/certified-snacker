import Link from "next/link";
import { loadToken } from "@/server/actions/household";
import { getCtxOrNull, getSession } from "@/server/ctx";
import { Button } from "@/ui/primitives/button";
import { InviteJoinForm } from "@/ui/token-forms";

export const metadata = { title: "Join household" };

export default async function InvitePage(props: PageProps<"/invite/[token]">) {
  const { token } = await props.params;
  const row = await loadToken(token, "invite");
  if (!row) {
    return (
      <div className="flex flex-col gap-3 text-center">
        <h1 className="text-title font-semibold tracking-tight">
          This invite has expired
        </h1>
        <p className="text-ui text-muted">
          Ask the household manager for a fresh link.
        </p>
      </div>
    );
  }
  const session = await getSession();
  const ctx = session ? await getCtxOrNull() : null;
  const here = `/invite/${token}`;

  return (
    <div className="flex flex-col gap-5 text-center">
      <div>
        <h1 className="text-title font-semibold tracking-tight">
          Join {row.household.name}
        </h1>
        <p className="mt-1 text-ui text-muted">
          You have been invited as{" "}
          <span className="font-medium text-text">
            {row.person.displayName}
          </span>
          .
        </p>
      </div>
      {ctx ? (
        <p className="text-ui text-muted">
          You already belong to a household, so this invite cannot be used with
          this account.
        </p>
      ) : session ? (
        <InviteJoinForm token={token} personName={row.person.displayName} />
      ) : (
        <div className="flex flex-col gap-2">
          <Button
            variant="primary"
            size="lg"
            render={<Link href={`/sign-up?next=${encodeURIComponent(here)}`} />}
          >
            Create an account to join
          </Button>
          <Button
            variant="ghost"
            size="md"
            render={<Link href={`/sign-in?next=${encodeURIComponent(here)}`} />}
          >
            I already have an account
          </Button>
        </div>
      )}
    </div>
  );
}
