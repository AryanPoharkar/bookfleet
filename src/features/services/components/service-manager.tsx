"use client";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/layout/empty-state";
import { Scissors } from "lucide-react";
import { DURATIONS, BUFFERS } from "../options";
import { serviceSchema, type ServiceInput } from "../schemas";
import { createServiceAction, setServiceActiveAction, updateServiceAction } from "../actions";
import { centsToPrice, formatMoney } from "../money";

type Row = { id: string; name: string; durationMin: number; bufferMinutes: number; priceCents: number; isActive: boolean };
export function ServiceManager({ slug, currency, services }: { slug: string; currency: string; services: Row[] }) {
 const [open,setOpen]=useState(false); const [editing,setEditing]=useState<Row|null>(null); const [pending,start]=useTransition();
 const form=useForm<ServiceInput>({ resolver:zodResolver(serviceSchema), defaultValues:{name:"",durationMinutes:30,bufferMinutes:0,price:"0.00"} });
 const begin=(row?:Row)=>{setEditing(row??null);form.reset(row?{name:row.name,durationMinutes:row.durationMin,bufferMinutes:row.bufferMinutes,price:centsToPrice(row.priceCents)}:{name:"",durationMinutes:30,bufferMinutes:0,price:"0.00"});setOpen(true)};
 const submit=(values:ServiceInput)=>start(async()=>{const result=editing?await updateServiceAction(slug,editing.id,values):await createServiceAction(slug,values);if("error" in result){toast.error(result.error);return;}toast.success(editing?"Service updated":"Service created");setOpen(false);window.location.reload();});
 return <div className="space-y-4">{services.length===0?<EmptyState icon={Scissors} title="No services yet" description="Add your first bookable service." action={<Button onClick={()=>begin()}>Add service</Button>}/>:<><div className="flex justify-end"><Button onClick={()=>begin()}>Add service</Button></div><div className="overflow-x-auto rounded-xl border border-border"><table className="w-full min-w-[720px] text-sm"><thead><tr className="border-b border-border text-left text-muted-foreground"><th className="p-4">Name</th><th className="p-4">Duration</th><th className="p-4">Buffer</th><th className="p-4">Price</th><th className="p-4">Status</th><th className="p-4">Actions</th></tr></thead><tbody>{services.map((s)=><tr key={s.id} className={`border-b border-border last:border-0 ${!s.isActive?"text-muted-foreground":""}`}><td className="p-4 font-medium">{s.name}</td><td className="p-4">{s.durationMin} min</td><td className="p-4">{s.bufferMinutes} min</td><td className="p-4">{formatMoney(s.priceCents,currency)}</td><td className="p-4"><Badge variant={s.isActive?"accent":"outline"}>{s.isActive?"Active":"Archived"}</Badge></td><td className="p-4"><div className="flex gap-2"><Button variant="outline" size="sm" onClick={()=>begin(s)}>Edit</Button><Button variant="ghost" size="sm" disabled={pending} onClick={()=>start(async()=>{const r=await setServiceActiveAction(slug,s.id,!s.isActive);if("error"in r)toast.error(r.error);else{toast.success(s.isActive?"Service archived":"Service restored");window.location.reload();}})}>{s.isActive?"Archive":"Restore"}</Button></div></td></tr>)}</tbody></table></div></>}
 <Dialog open={open} onOpenChange={setOpen}><DialogContent><DialogHeader><DialogTitle>{editing?"Edit service":"Add service"}</DialogTitle></DialogHeader><form onSubmit={form.handleSubmit(submit)} className="space-y-4"><div><Label>Name</Label><Input {...form.register("name")} />{form.formState.errors.name&&<p role="alert" className="mt-1 text-xs text-destructive">{form.formState.errors.name.message}</p>}</div><div className="grid grid-cols-2 gap-4"><div><Label>Duration</Label><Select value={String(form.watch("durationMinutes"))} onValueChange={v=>form.setValue("durationMinutes",Number(v),{shouldValidate:true})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{DURATIONS.map(v=><SelectItem key={v} value={String(v)}>{v} min</SelectItem>)}</SelectContent></Select></div><div><Label>Buffer</Label><Select value={String(form.watch("bufferMinutes"))} onValueChange={v=>form.setValue("bufferMinutes",Number(v),{shouldValidate:true})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{BUFFERS.map(v=><SelectItem key={v} value={String(v)}>{v} min</SelectItem>)}</SelectContent></Select></div></div><div><Label>Price</Label><Input inputMode="decimal" {...form.register("price")} />{form.formState.errors.price&&<p role="alert" className="mt-1 text-xs text-destructive">{form.formState.errors.price.message}</p>}</div><Button type="submit" disabled={pending}>{pending?"Saving…":"Save service"}</Button></form></DialogContent></Dialog></div>;
}
