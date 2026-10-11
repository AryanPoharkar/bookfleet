"use client";
import { useState, useTransition } from "react";
import { startCheckoutAction, openPortalAction } from "../actions";
import { billingMessage } from "../messages";
export function BillingActionButton({ slug, plan, label }: { slug: string; plan?: "PRO" | "BUSINESS"; label: string }) {
 const [pending, startTransition] = useTransition(); const [error, setError] = useState("");
 return <div><button type="button" disabled={pending} className="rounded-md border px-3 py-2 text-sm disabled:opacity-50" onClick={() => startTransition(async () => { setError(""); const result = plan ? await startCheckoutAction(slug, { plan }) : await openPortalAction(slug); if (result && "message" in result) setError(billingMessage(result.error)); })}>{pending ? "Please wait…" : label}</button>{error ? <p role="alert" className="mt-2 text-sm text-destructive">{error}</p> : null}</div>;
}
