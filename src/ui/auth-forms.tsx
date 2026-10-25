"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/ui/primitives/button";
import { Field, FieldError, FieldLabel } from "@/ui/primitives/field";
import { Input } from "@/ui/primitives/input";

function safeNext(next: string | undefined): string {
  return next?.startsWith("/") && !next.startsWith("//") ? next : "/week";
}

export function SignInForm({
  next,
  notice,
}: {
  next?: string;
  notice?: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const { error } = await authClient.signIn.email({
      email: String(form.get("email")),
      password: String(form.get("password")),
    });
    setPending(false);
    if (error) return setError(error.message ?? "Could not sign in");
    router.push(safeNext(next));
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <h1 className="text-title font-semibold tracking-tight">Sign in</h1>
      {notice ? (
        <p className="rounded-control bg-accent-soft px-3 py-2 text-ui">
          {notice}
        </p>
      ) : null}
      <Field>
        <FieldLabel>Email</FieldLabel>
        <Input name="email" type="email" autoComplete="email" required />
      </Field>
      <Field>
        <FieldLabel>Password</FieldLabel>
        <Input
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </Field>
      {error ? <FieldError match>{error}</FieldError> : null}
      <Button type="submit" variant="primary" size="lg" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </Button>
      <p className="text-center text-ui text-muted">
        New here?{" "}
        <Link
          className="text-accent underline-offset-4 hover:underline"
          href={`/sign-up?next=${encodeURIComponent(safeNext(next))}`}
        >
          Create an account
        </Link>
      </p>
    </form>
  );
}

export function SignUpForm({ next }: { next?: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const { error } = await authClient.signUp.email({
      name: String(form.get("name")),
      email: String(form.get("email")),
      password: String(form.get("password")),
    });
    setPending(false);
    if (error) return setError(error.message ?? "Could not create the account");
    router.push(next?.startsWith("/invite/") ? next : "/onboarding");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <h1 className="text-title font-semibold tracking-tight">
        Create your account
      </h1>
      <Field>
        <FieldLabel>Your name</FieldLabel>
        <Input name="name" autoComplete="given-name" required />
      </Field>
      <Field>
        <FieldLabel>Email</FieldLabel>
        <Input name="email" type="email" autoComplete="email" required />
      </Field>
      <Field>
        <FieldLabel>Password</FieldLabel>
        <Input
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={10}
          required
        />
      </Field>
      {error ? <FieldError match>{error}</FieldError> : null}
      <Button type="submit" variant="primary" size="lg" disabled={pending}>
        {pending ? "Creating…" : "Create account"}
      </Button>
      <p className="text-center text-ui text-muted">
        Already have one?{" "}
        <Link
          className="text-accent underline-offset-4 hover:underline"
          href={`/sign-in?next=${encodeURIComponent(safeNext(next))}`}
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}
