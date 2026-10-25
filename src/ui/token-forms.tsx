"use client";

import { useActionState } from "react";
import type { ActionResult } from "@/server/action-result";
import {
  acceptInviteForm,
  resetPasswordForm,
} from "@/server/actions/household";
import { Button } from "@/ui/primitives/button";
import { Field, FieldError, FieldLabel } from "@/ui/primitives/field";
import { Input } from "@/ui/primitives/input";

type State = ActionResult<undefined> | null;

export function InviteJoinForm({
  token,
  personName,
}: {
  token: string;
  personName: string;
}) {
  const [state, action, pending] = useActionState<State, FormData>(
    acceptInviteForm,
    null,
  );
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="token" value={token} />
      <Button
        type="submit"
        variant="primary"
        size="lg"
        className="w-full"
        disabled={pending}
      >
        {pending ? "Joining…" : `Join as ${personName}`}
      </Button>
      {state && !state.ok ? <FieldError match>{state.error}</FieldError> : null}
    </form>
  );
}

export function ResetPasswordForm({
  token,
  personName,
}: {
  token: string;
  personName: string;
}) {
  const [state, action, pending] = useActionState<State, FormData>(
    resetPasswordForm,
    null,
  );
  const fieldError =
    state && !state.ok ? state.fieldErrors?.password?.[0] : undefined;
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="token" value={token} />
      <h1 className="text-title font-semibold tracking-tight">
        New password for {personName}
      </h1>
      <Field>
        <FieldLabel>New password</FieldLabel>
        <Input
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={10}
          required
        />
        {fieldError ? <FieldError match>{fieldError}</FieldError> : null}
      </Field>
      {state && !state.ok && !fieldError ? (
        <FieldError match>{state.error}</FieldError>
      ) : null}
      <Button type="submit" variant="primary" size="lg" disabled={pending}>
        {pending ? "Saving…" : "Set password"}
      </Button>
    </form>
  );
}
