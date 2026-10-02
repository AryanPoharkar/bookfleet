"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { acceptInviteAction } from "@/features/members/actions";
import { Button } from "@/components/ui/button";
export function AcceptInviteForm({ token }: { token: string }) { const [error,setError]=useState(""); const [pending,start]=useTransition(); const router=useRouter(); return <form className="mt-8" action={(fd) => start(async()=>{ const r=await acceptInviteAction(fd); if(r.error) setError(r.error); else if(r.slug) router.push(`/app/${r.slug}`); })}><input type="hidden" name="token" value={token}/>{error && <p role="alert" className="mb-4 text-sm text-destructive">{error}</p>}<Button disabled={pending}>Accept invite</Button></form>; }
