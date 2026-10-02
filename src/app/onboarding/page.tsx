import { requireUser } from "@/server/auth/session";
import { OnboardingForm } from "@/features/onboarding/components/onboarding-form";

export default async function OnboardingPage() {
  await requireUser();
  return <main className="min-h-screen bg-background"><div className="mx-auto flex min-h-screen w-full max-w-[1120px] items-center justify-center px-5 py-12"><div className="w-full max-w-md"><h1 className="font-heading text-4xl font-semibold tracking-tight">Create your business</h1><p className="mt-2 text-muted-foreground">Set up your workspace in a minute.</p><div className="mt-8"><OnboardingForm /></div></div></div></main>;
}
