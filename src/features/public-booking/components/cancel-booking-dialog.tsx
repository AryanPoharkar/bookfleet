"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { cancelPublicBookingAction } from "../actions";
export function CancelBookingDialog({slug,cancelToken}:{slug:string;cancelToken:string}) { const [open,setOpen]=useState(false); const [error,setError]=useState(""); const router=useRouter(); async function cancel(){const result=await cancelPublicBookingAction({slug,cancelToken}); if("message" in result){setError(result.message ?? "Something went wrong. Please try again.");return;} setOpen(false);router.refresh();} return <Dialog open={open} onOpenChange={setOpen}><DialogTrigger render={<Button variant="outline"/>}>Cancel booking</DialogTrigger><DialogContent><DialogHeader><DialogTitle>Cancel this booking?</DialogTitle><DialogDescription>This action will release your appointment time.</DialogDescription></DialogHeader>{error?<p role="alert" className="text-sm text-destructive">{error}</p>:null}<DialogFooter><Button variant="outline" onClick={()=>setOpen(false)}>Keep booking</Button><Button variant="destructive" onClick={()=>void cancel()}>Cancel booking</Button></DialogFooter></DialogContent></Dialog>; }
