import type { ReactNode } from "react";
import { Logo } from "@/components/brand/logo";
import { Container } from "@/components/layout/container";

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-background">
      <Container className="flex min-h-screen flex-col items-center justify-center py-12">
        <div className="mb-10">
          <Logo className="text-2xl" />
        </div>
        <div className="w-full max-w-md">{children}</div>
      </Container>
    </main>
  );
}
