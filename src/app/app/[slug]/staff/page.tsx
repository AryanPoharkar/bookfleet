import Link from "next/link";
import { Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Container } from "@/components/layout/container";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/layout/empty-state";
import { requireTenant } from "@/server/tenancy/require-tenant";
import { requirePermission } from "@/server/rbac/require-permission";
import { StaffManager } from "@/features/staff/components/staff-manager";
export default async function StaffPage({params}:{params:Promise<{slug:string}>}){const{slug}=await params;const tenant=await requireTenant(slug);requirePermission(tenant,"staff:manage");const staff=await tenant.db.staff.findMany({include:{user:true,services:{include:{service:true}}},orderBy:{name:"asc"}});return <Container className="py-8"><PageHeader title="Staff" description="Manage your team and their services." actions={<Button render={<Link href={`/app/${slug}/staff/new`} />}>Add staff</Button>}/>{staff.length===0?<div className="mt-8"><EmptyState icon={Users} title="No staff yet" description="Add a staff profile to start scheduling work." action={<Button render={<Link href={`/app/${slug}/staff/new`} />}>Add staff</Button>}/></div>:<div className="mt-8"><StaffManager slug={slug} staff={staff.map(s=>({id:s.id,name:s.name,user:s.user?{name:s.user.name,email:s.user.email}:null,services:s.services.map(x=>x.service.name),isActive:s.isActive}))}/></div>}</Container>}
