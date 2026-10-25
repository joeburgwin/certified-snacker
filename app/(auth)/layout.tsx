import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <p className="mb-8 text-center text-ui font-medium tracking-tight text-muted">
          Certified Snacker
        </p>
        {children}
      </div>
    </main>
  );
}
