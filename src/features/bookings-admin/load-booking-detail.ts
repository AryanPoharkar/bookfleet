import type { TenantDb } from "@/server/tenancy/types";
import type { BookingScope } from "./scope";
export async function loadBookingDetail({db,scope,id}:{db:TenantDb;scope:BookingScope;id:string}) {
 const where = scope.kind === "own" ? { id, staffId: scope.staffId } : { id };
 const row = await db.booking.findFirst({where,select:{id:true,status:true,startsAt:true,endsAt:true,notes:true,cancelReason:true,staffId:true,serviceId:true,customer:{select:{name:true,email:true,phone:true}},staff:{select:{name:true}},service:{select:{name:true}}}});
 if(!row)return null;
 return {id:row.id,status:row.status,startsAt:row.startsAt,endsAt:row.endsAt,notes:row.notes,cancelReason:row.cancelReason,staffId:row.staffId,serviceId:row.serviceId,staffName:row.staff.name,serviceName:row.service.name,customerName:row.customer.name,customerEmail:row.customer.email,customerPhone:row.customer.phone};
}
