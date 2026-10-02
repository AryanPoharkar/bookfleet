 "use server";

import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { signIn, signOut } from "@/server/auth";
import { db } from "@/server/db";
import { loginSchema, signupSchema } from "@/features/auth/schemas";

function safeCallbackUrl(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !/^\/(?!\/)/.test(value)) {
    return "/app";
  }

  return value;
}

// RATE-LIMIT-PLACEHOLDER (chunk 12)
export async function loginAction(_previousState: { error?: string }, formData: FormData) {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: "Email or password is wrong." };
  }

  const callbackUrl = safeCallbackUrl(formData.get("callbackUrl"));

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: callbackUrl,
    });

    return { error: undefined };
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Email or password is wrong." };
    }

    throw error;
  }
}

// RATE-LIMIT-PLACEHOLDER (chunk 12)
export async function signupAction(_previousState: { error?: string }, formData: FormData) {
  const parsed = signupSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: "Please check your details and try again." };
  }

  const callbackUrl = safeCallbackUrl(formData.get("callbackUrl"));
  const existingUser = await db.user.findUnique({
    where: { email: parsed.data.email },
  });

  if (existingUser) {
    return { error: "An account with this email already exists." };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);

  await db.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      passwordHash,
    },
  });

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: callbackUrl,
    });

    return { error: undefined };
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Unable to sign you in. Please try logging in." };
    }

    throw error;
  }
}

export async function signOutAction() {
  await signOut({ redirectTo: "/login" });
}

export async function googleSignInAction(formData: FormData) {
  const callbackUrl = safeCallbackUrl(formData.get("callbackUrl"));

  try {
    await signIn("google", { redirectTo: callbackUrl });
    return { error: undefined };
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Google sign-in could not be started." };
    }

    throw error;
  }
}
