import { redirect } from "next/navigation";
import { auth } from "@/server/auth";
import { AuthShell } from "@/features/auth/components/auth-shell";
import { LoginForm } from "@/features/auth/components/login-form";

type LoginPageProps = {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
};

function safeCallbackUrl(value: string | undefined) {
  if (!value || !/^\/(?!\/)/.test(value)) {
    return "/app";
  }

  if (value === "/onboarding" || value.startsWith("/onboarding/")) {
    return "/app";
  }

  return value;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const session = await auth();

  if (session?.user?.id) {
    redirect("/app");
  }

  const params = await searchParams;
  const callbackUrl = safeCallbackUrl(params.callbackUrl);

  return (
    <AuthShell>
      <LoginForm callbackUrl={callbackUrl} oauthError={params.error} />
    </AuthShell>
  );
}
