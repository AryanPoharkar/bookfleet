"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { startCheckoutAction, openPortalAction } from "../actions";
import { runMockAction } from "../mock-actions";
import type { BillingMode } from "@/server/stripe/billing-mode";

export function BillingActionButton({
  slug,
  plan,
  label,
  mode,
}: {
  slug: string;
  plan?: "PRO" | "BUSINESS";
  label: string;
  mode: BillingMode;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const router = useRouter();
  const unavailable = mode === "unavailable" && Boolean(plan);

  return (
    <div className="min-w-0">
      <button
        type="button"
        disabled={pending || unavailable}
        className="rounded-md border px-3 py-2 text-sm disabled:opacity-50"
        onClick={() => startTransition(async () => {
          setError("");
          if (mode === "mock" && plan) {
            const result = await runMockAction(slug, { kind: "checkout", plan });
            if (result && "message" in result) {
              setError(result.message ?? "The billing action failed. Please try again.");
              return;
            }
            toast.success("Mock payment applied");
            router.refresh();
            return;
          }
          const result = plan
            ? await startCheckoutAction(slug, { plan })
            : await openPortalAction(slug);
          if (result && "message" in result) setError(result.message ?? "The billing action failed. Please try again.");
        })}
      >
        {pending ? "Please wait..." : label}
      </button>
      {unavailable ? <p className="mt-2 text-xs text-muted-foreground">Paid plans aren&apos;t available on this server yet.</p> : null}
      {error ? <p role="alert" className="mt-2 text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
