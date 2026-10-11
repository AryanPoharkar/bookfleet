import type { TenantDb } from "@/server/tenancy/types";
import { buildBookingWhere, type BookingScope } from "./scope";
import type { BookingFilters } from "./filters";
import { getPageInfo, PAGE_SIZE } from "./paginate";
export async function loadBookingList({db,scope,filters,now,pageSize=PAGE_SIZE}:{db:TenantDb;scope:BookingScope;filters:BookingFilters;now:Date;pageSize?:number}) {
 const where=buildBookingWhere({scope,filters,now}); const total=await db.booking.count({where}); const pageInfo=getPageInfo(total,filters.page,pageSize);
 const [rows,staffOptions,serviceOptions]=await Promise.all([
  db.booking.findMany({where,skip:pageInfo.skip,take:pageInfo.take,orderBy:[{startsAt:filters.when==="upcoming"?"asc":"desc"},{id:"asc"}],select:{id:true,startsAt:true,endsAt:true,status:true,customer:{select:{name:true,email:true}},service:{select:{name:true}},staff:{select:{id:true,name:true}}}}),
  scope.kind==="own"?Promise.resolve([]):db.staff.findMany({where:{isActive:true},select:{id:true,name:true},orderBy:[{name:"asc"},{id:"asc"}]}),
  db.service.findMany({select:{id:true,name:true},orderBy:[{name:"asc"},{id:"asc"}]})
 ]);
 return {rows:rows.map(r=>({id:r.id,startsAt:r.startsAt,endsAt:r.endsAt,status:r.status,customerName:r.customer.name,customerEmail:r.customer.email,serviceName:r.service.name,staffId:r.staff.id,staffName:r.staff.name})),total,pageInfo,staffOptions,serviceOptions};
}
