 "use client";

import Link from "next/link";
import { useActionState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import { signupSchema } from "@/features/auth/schemas";
import { signupAction, googleSignInAction } from "@/features/auth/actions";

type SignupValues = z.infer<typeof signupSchema>;

export function SignupForm({ callbackUrl }: { callbackUrl: string }) {
  const [state, action, pending] = useActionState(signupAction, { error: undefined });
  const form = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    mode: "onBlur",
    defaultValues: { name: "", email: "", password: "" },
  });

  return (
    <div className="rounded-2xl border border-border bg-card p-7 shadow-sm">
      <div className="mb-7">
        <p className="text-sm font-medium text-primary">Get started</p>
        <h1 className="mt-2 font-heading text-3xl font-semibold tracking-tight">
          Create your account
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Start organizing your service business with Bookfleet.
        </p>
      </div>

      {state?.error && (
        <p className="mb-5 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive" role="alert">
          {state.error}
        </p>
      )}

      <form action={action} className="space-y-5">
        <input type="hidden" name="callbackUrl" value={callbackUrl} />
        <Form {...form}>
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input {...field} autoComplete="name" placeholder="Your name" />
                </FormControl>
                <FormMessage>{form.formState.errors.name?.message}</FormMessage>
              </FormItem>
            )}
          />
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
                  <Input {...field} type="password" autoComplete="new-password" />
                </FormControl>
                <FormMessage>{form.formState.errors.password?.message}</FormMessage>
              </FormItem>
            )}
          />
        </Form>

        <Button className="w-full" type="submit" disabled={pending}>
          {pending ? "Creating account…" : "Create account"}
        </Button>
      </form>

      <form action={async (formData) => { await googleSignInAction(formData); }} className="mt-3">
        <input type="hidden" name="callbackUrl" value={callbackUrl} />
        <Button type="submit" variant="outline" className="w-full" disabled={pending}>
          Continue with Google
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link className="font-medium text-primary hover:underline" href={`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`}>
          Sign in
        </Link>
      </p>
    </div>
  );
}
