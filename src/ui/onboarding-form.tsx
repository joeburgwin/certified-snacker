"use client";

import { useActionState } from "react";
import {
  createHousehold,
  type OnboardingState,
} from "@/server/actions/household";
import { Button } from "@/ui/primitives/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/ui/primitives/field";
import { Input } from "@/ui/primitives/input";

export function OnboardingForm({ defaultName }: { defaultName: string }) {
  const [state, action, pending] = useActionState<OnboardingState, FormData>(
    createHousehold,
    null,
  );
  const errors = state && !state.ok ? state.fieldErrors : undefined;

  return (
    <form action={action} className="flex flex-col gap-5">
      <div>
        <h1 className="text-title font-semibold tracking-tight">
          Name your household
        </h1>
        <p className="mt-1 text-ui text-muted">
          Two adults by default. You can add or rename people any time.
        </p>
      </div>
      <Field>
        <FieldLabel>Household</FieldLabel>
        <Input name="householdName" defaultValue="Home" required />
        {errors?.householdName ? (
          <FieldError match>{errors.householdName[0]}</FieldError>
        ) : null}
      </Field>
      <Field>
        <FieldLabel>You</FieldLabel>
        <Input name="yourName" defaultValue={defaultName} required />
        {errors?.yourName ? (
          <FieldError match>{errors.yourName[0]}</FieldError>
        ) : null}
      </Field>
      <Field>
        <FieldLabel>Partner</FieldLabel>
        <Input name="partnerName" defaultValue="Partner" />
        <FieldDescription>
          They can get their own login later from an invite link. Leave blank if
          it is just you.
        </FieldDescription>
      </Field>
      {state && !state.ok && !errors ? (
        <FieldError match>{state.error}</FieldError>
      ) : null}
      <Button type="submit" variant="primary" size="lg" disabled={pending}>
        {pending ? "Creating…" : "Create household"}
      </Button>
    </form>
  );
}
