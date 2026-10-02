"use client";
/* eslint-disable react-hooks/incompatible-library */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { staffSchema, type StaffInput } from "../schemas";
import { createStaffAction, updateStaffAction } from "../actions";
import { EmptyState } from "@/components/layout/empty-state";
import { Scissors } from "lucide-react";
type Service={id:string;name:string}; type Member={userId:string;name:string|null;email:string;role:string}; type Initial={id?:string;name:string;bio:string;userId:string;serviceIds:string[]};
export function StaffForm({slug,services,members,initial}:{slug:string;services:Service[];members:Member[];initial:Initial}){const[,start]=useTransition();const router=useRouter();const form=useForm<StaffInput>({resolver:zodResolver(staffSchema),defaultValues:initial});const submit=(v:StaffInput)=>start(async()=>{const r=initial.id?await updateStaffAction(slug,initial.id,v):await createStaffAction(slug,v);if("error"in r){toast.error(r.error);return;}toast.success(initial.id?"Staff updated":"Staff created");router.push(`/app/${slug}/staff`);});return <form onSubmit={form.handleSubmit(submit)} className="max-w-2xl space-y-6"><div><Label>Name</Label><Input {...form.register("name")}/>{form.formState.errors.name&&<p role="alert" className="text-xs text-destructive">{form.formState.errors.name.message}</p>}</div><div><Label>Bio</Label><textarea className="min-h-28 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" {...form.register("bio")}/>{form.formState.errors.bio&&<p role="alert" className="text-xs text-destructive">{form.formState.errors.bio.message}</p>}</div><div><Label>Linked team member</Label><Select value={form.watch("userId")||"none"} onValueChange={v=>form.setValue("userId",!v||v==="none"?"":v,{shouldValidate:true})}><SelectTrigger><SelectValue placeholder="Not linked"/></SelectTrigger><SelectContent><SelectItem value="none">Not linked</SelectItem>{members.map(m=><SelectItem key={m.userId} value={m.userId}>{m.name??"Unnamed"} ({m.email}) - {m.role}</SelectItem>)}</SelectContent></Select></div><div><Label>Active services</Label>{services.length===0?<EmptyState icon={Scissors} title="No active services" description="Create a service before assigning it to staff." action={<Button variant="outline" render={<Link href={`/app/${slug}/services`} />}>Go to Services</Button>}/>:<div className="mt-3 grid gap-3 sm:grid-cols-2">{services.map(s=><label key={s.id} className="flex items-center gap-3 rounded-lg border border-border p-3"><Checkbox checked={form.watch("serviceIds").includes(s.id)} onCheckedChange={checked=>{const ids=form.getValues("serviceIds");form.setValue("serviceIds",checked?[...ids,s.id]:ids.filter(id=>id!==s.id),{shouldValidate:true})}}/><span>{s.name}</span></label>)}</div>}</div><div className="flex gap-2"><Button type="submit">Save staff</Button><Button type="button" variant="outline" render={<Link href={`/app/${slug}/staff`} />}>Cancel</Button></div></form>}
