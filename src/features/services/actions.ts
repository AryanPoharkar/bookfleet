"use server";
import { revalidatePath } from "next/cache";
import { requireTenant } from "@/server/tenancy/require-tenant";
import { requirePermission } from "@/server/rbac/require-permission";
import { serviceSchema } from "./schemas";
import { priceToCents } from "./money";

export async function createServiceAction(slug: string, input: unknown) { const tenant = await requireTenant(slug); requirePermission(tenant, "service:manage"); const parsed = serviceSchema.safeParse(input); if (!parsed.success) return { error: "Please check the service details." }; await tenant.db.service.create({ data: { businessId: tenant.business.id, name: parsed.data.name, durationMin: parsed.data.durationMinutes, bufferMinutes: parsed.data.bufferMinutes, priceCents: priceToCents(parsed.data.price) } }); revalidatePath(`/app/${slug}/services`); return { success: true }; }
export async function updateServiceAction(slug: string, serviceId: string, input: unknown) { const tenant = await requireTenant(slug); requirePermission(tenant, "service:manage"); const parsed = serviceSchema.safeParse(input); if (!parsed.success) return { error: "Please check the service details." }; const result = await tenant.db.service.updateMany({ where: { id: serviceId }, data: { name: parsed.data.name, durationMin: parsed.data.durationMinutes, bufferMinutes: parsed.data.bufferMinutes, priceCents: priceToCents(parsed.data.price) } }); if (result.count !== 1) return { error: "Service not found." }; revalidatePath(`/app/${slug}/services`); return { success: true }; }
export async function setServiceActiveAction(slug: string, serviceId: string, isActive: boolean) { const tenant = await requireTenant(slug); requirePermission(tenant, "service:manage"); const result = await tenant.db.service.updateMany({ where: { id: serviceId }, data: { isActive } }); if (result.count !== 1) return { error: "Service not found." }; revalidatePath(`/app/${slug}/services`); return { success: true }; }
