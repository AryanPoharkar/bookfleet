import type { TenantTx } from "@/server/tenancy/types";
import { lockBusinessRow } from "@/server/tenancy/lock-business";
import { checkStaffLimit, staffLimitMessage } from "./rules";

export async function ensureStaffCapacity(
  tx: TenantTx,
  businessId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  await lockBusinessRow(tx, businessId);
  const business = await tx.business.findFirst({ where: {}, select: { plan: true } });
  if (!business) throw new Error("Business not found in tenant transaction.");
  const count = await tx.staff.count({ where: { isActive: true } });
  return checkStaffLimit(business.plan, count).allowed
    ? { ok: true }
    : { ok: false, message: staffLimitMessage(business.plan) };
}
