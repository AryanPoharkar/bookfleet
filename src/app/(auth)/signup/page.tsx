import { redirect } from "next/navigation";
import { auth } from "@/server/auth";
import { AuthShell } from "@/features/auth/components/auth-shell";
import { SignupForm } from "@/features/auth/components/signup-form";

type SignupPageProps = {
  searchParams: Promise<{ callbackUrl?: string }>;
};

function safeCallbackUrl(value: string | undefined) {
  return value && /^\/(?!\/)/.test(value) ? value : "/app";
}

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const session = await auth();

  if (session?.user?.id) {
    redirect("/app");
  }

  const params = await searchParams;
  const callbackUrl = safeCallbackUrl(params.callbackUrl);

  return (
    <AuthShell>
      <SignupForm callbackUrl={callbackUrl} />
    </AuthShell>
  );
}
