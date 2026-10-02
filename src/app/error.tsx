"use client";

import { Button } from "@/components/ui/button";
import { Container } from "@/components/layout/container";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="flex min-h-screen items-center py-16">
      <Container>
        <div className="max-w-xl space-y-6">
          <p className="text-small font-medium text-destructive">Error</p>
          <h1 className="text-display font-semibold tracking-tight">Something broke on our side</h1>
          <p className="max-w-md text-body text-muted-foreground">
            Please try again. If the problem continues, come back a little later.
          </p>
          <Button onClick={() => reset()}>Try again</Button>
        </div>
      </Container>
    </main>
  );
}
