import { signOutAction } from "@/features/auth/actions";
import { requireUser } from "@/server/auth/session";
import { Button } from "@/components/ui/button";

export default async function AppPage() {
  const user = await requireUser();

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen w-full max-w-[1120px] flex-col items-start justify-center px-5 py-12">
        <div className="max-w-xl">
          <p className="text-sm font-medium text-primary">Bookfleet</p>
          <h1 className="mt-2 font-heading text-4xl font-semibold tracking-tight">
            You&apos;re signed in.
          </h1>
          <p className="mt-3 text-muted-foreground">
            Signed in as <span className="font-medium text-foreground">{user.email}</span>.
          </p>
          <form action={signOutAction} className="mt-7">
            <Button type="submit">Sign out</Button>
          </form>
        </div>
      </div>
    </main>
  );
}
