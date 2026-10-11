import type { TenantDb } from "@/server/tenancy/types";
import type { BookingActor } from "../bookings/authorize";
import { checkBookingAccess } from "../bookings/authorize";
import { getAvailability } from "../availability/get-availability";
import type { slotsQuerySchema } from "./schemas";
import type { z } from "zod";
export async function loadSlotsForDashboard({db,timezone,actor,input,now}:{db:TenantDb;timezone:string;actor:Extract<BookingActor,{kind:"member"}>;input:z.output<typeof slotsQuerySchema>;now:Date}):Promise<{ok:true;slots:string[]}|{ok:false;error:string}> {
 let serviceId=input.kind==="new"?input.serviceId:""; let staffId=input.kind==="new"?input.staffId:null; let excludeBookingId:string|undefined;
 if(input.kind==="reschedule") { const booking=await db.booking.findFirst({where:{id:input.bookingId},select:{id:true,serviceId:true,staffId:true,startsAt:true,status:true}}); if(!booking)return {ok:false,error:"BOOKING_NOT_FOUND"}; const access=checkBookingAccess(actor,{staffId:booking.staffId,startsAt:booking.startsAt},now); if(access!=="OK")return {ok:false,error:access}; if(booking.status!=="CONFIRMED")return {ok:false,error:"NOT_CONFIRMED"}; serviceId=booking.serviceId;staffId=booking.staffId;excludeBookingId=booking.id; }
 const result=await getAvailability({db,timezone,serviceId,staffId,date:input.date,now,...(excludeBookingId?{excludeBookingId}:{})}); if(!result.ok)return {ok:false,error:result.error}; return {ok:true,slots:result.slots.map(s=>s.startsAt.toISOString())};
}
