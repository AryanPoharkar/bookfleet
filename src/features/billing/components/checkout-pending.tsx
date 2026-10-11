"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
export function CheckoutPending() {
 const router = useRouter(); const [attempts, setAttempts] = useState(0);
 useEffect(() => { if (attempts >= 8) return; const timer = setTimeout(() => { router.refresh(); setAttempts((n) => n + 1); }, 2000); return () => clearTimeout(timer); }, [attempts, router]);
 return attempts >= 8 ? <p className="text-sm text-muted-foreground">Still waiting for Stripe. Refresh this page in a minute.</p> : null;
}
