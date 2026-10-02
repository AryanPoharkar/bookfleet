import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/layout/container";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center py-16">
      <Container>
        <div className="max-w-xl space-y-6">
          <p className="text-small font-medium text-primary">404</p>
          <h1 className="text-display font-semibold tracking-tight">That page isn&apos;t here</h1>
          <p className="max-w-md text-body text-muted-foreground">
            The page you requested may have moved or may not exist.
          </p>
          <Button render={<Link href="/" />}>
            <ArrowLeftIcon />
            Back home
          </Button>
        </div>
      </Container>
    </main>
  );
}
