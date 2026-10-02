 "use client";

import Link from "next/link";
import { useActionState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { loginSchema } from "@/features/auth/schemas";
import { googleSignInAction, loginAction } from "@/features/auth/actions";
import { z } from "zod";

type LoginValues = z.infer<typeof loginSchema>;

export function LoginForm({
  callbackUrl,
  oauthError,
}: {
  callbackUrl: string;
  oauthError?: string;
}) {
  const [state, action, pending] = useActionState(loginAction, { error: undefined });
  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    mode: "onBlur",
    defaultValues: { email: "", password: "" },
  });

  return (
    <div className="rounded-2xl border border-border bg-card p-7 shadow-sm">
      <div className="mb-7">
        <p className="text-sm font-medium text-primary">Welcome back</p>
        <h1 className="mt-2 font-heading text-3xl font-semibold tracking-tight">
          Sign in to Bookfleet
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Manage your bookings and service operations.
        </p>
      </div>

      {(oauthError || state?.error) && (
        <p className="mb-5 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive" role="alert">
          {oauthError === "OAuthAccountNotLinked"
            ? "This email already has a password. Log in with it."
            : state?.error}
        </p>
      )}

      <form action={action} className="space-y-5">
        <input type="hidden" name="callbackUrl" value={callbackUrl} />
        <Form {...form}>
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input {...field} type="email" autoComplete="email" placeholder="you@example.com" />
                </FormControl>
                <FormMessage>{form.formState.errors.email?.message}</FormMessage>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <Input {...field} type="password" autoComplete="current-password" />
                </FormControl>
                <FormMessage>{form.formState.errors.password?.message}</FormMessage>
              </FormItem>
            )}
          />
        </Form>

        <Button className="w-full" type="submit" disabled={pending}>
          {pending ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <form action={async (formData) => { await googleSignInAction(formData); }} className="mt-3">
        <input type="hidden" name="callbackUrl" value={callbackUrl} />
        <Button type="submit" variant="outline" className="w-full" disabled={pending}>
          Continue with Google
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link className="font-medium text-primary hover:underline" href={`/signup?callbackUrl=${encodeURIComponent(callbackUrl)}`}>
          Create one
        </Link>
      </p>
    </div>
  );
}
