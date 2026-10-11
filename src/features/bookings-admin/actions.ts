"use server";

import { revalidatePath } from "next/cache";
import { requireTenant } from "@/server/tenancy/require-tenant";
import { requirePermission } from "@/server/rbac/require-permission";
import { createBookingSchema } from "../bookings/schemas";
import { cancelBooking } from "../bookings/cancel-booking";
import { markBooking } from "../bookings/mark-booking";
import { rescheduleBooking } from "../bookings/reschedule-booking";
import { createBooking } from "../bookings/create-booking";
import { cancelReasonSchema, markStatusSchema, slotsQuerySchema } from "./schemas";
import { loadSlotsForDashboard } from "./load-slots";

function paths(slug: string) { revalidatePath(`/app/${slug}/bookings`); revalidatePath(`/app/${slug}`); }
function actionError(error: string) { return { error, message: error } as const; }
export async function cancelBookingAction(input: { slug: string; bookingId: string; reason?: string }) {
  const tenant = await requireTenant(input.slug); const actor = { kind: "member" as const, role: tenant.role, staffId: tenant.staffId }; requirePermission(tenant, "booking:view_own");
  const reason = cancelReasonSchema.safeParse(input.reason ?? ""); if (!reason.success) return actionError("INVALID_INPUT");
  const result = await cancelBooking({ db: tenant.db, actor, ref: { bookingId: input.bookingId }, ...(reason.data === undefined ? {} : { reason: reason.data }) });
  if (!result.ok) return actionError(result.error); paths(input.slug); return { success: true as const };
}
export async function markBookingAction(input: { slug: string; bookingId: string; status: "COMPLETED" | "NO_SHOW" }) {
  const tenant = await requireTenant(input.slug); const actor = { kind: "member" as const, role: tenant.role, staffId: tenant.staffId }; requirePermission(tenant, "booking:view_own");
  const parsed = markStatusSchema.safeParse({ bookingId: input.bookingId, status: input.status }); if (!parsed.success) return actionError("INVALID_INPUT");
  const result = await markBooking({ db: tenant.db, actor, ...parsed.data }); if (!result.ok) return actionError(result.error); paths(input.slug); return { success: true as const };
}
export async function rescheduleBookingAction(input: { slug: string; bookingId: string; newStartsAt: string }) {
  const tenant = await requireTenant(input.slug); const actor = { kind: "member" as const, role: tenant.role, staffId: tenant.staffId }; requirePermission(tenant, "booking:view_own");
  const parsed = createBookingSchema.shape.startsAt.safeParse(input.newStartsAt); if (!parsed.success) return actionError("INVALID_INPUT");
  const result = await rescheduleBooking({ db: tenant.db, businessId: tenant.business.id, actor, ref: { bookingId: input.bookingId }, newStartsAt: parsed.data }); if (!result.ok) return actionError(result.error); paths(input.slug); return { success: true as const };
}
export async function listSlotsAction(slug: string, input: unknown) {
  const tenant = await requireTenant(slug); const actor = { kind: "member" as const, role: tenant.role, staffId: tenant.staffId }; const parsed = slotsQuerySchema.safeParse(input); if (!parsed.success) return actionError("INVALID_INPUT");
  if (parsed.data.kind === "new") requirePermission(tenant, "booking:cancel_all");
  const result = await loadSlotsForDashboard({ db: tenant.db, timezone: tenant.business.timezone, actor, input: parsed.data, now: new Date() }); return result.ok ? result : actionError(result.error);
}
export async function createManualBookingAction(slug: string, input: unknown) {
  const tenant = await requireTenant(slug); requirePermission(tenant, "booking:cancel_all");
  const result = await createBooking({ db: tenant.db, businessId: tenant.business.id, input }); if (!result.ok) return actionError(result.error); paths(slug); return { success: true as const, bookingId: result.booking.id };
}
