import { Prisma } from "@/generated/prisma/client";
import { db } from "@/server/db";

async function serializable<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try { return await db.$transaction(fn, { isolationLevel: "Serializable" }); }
    catch (error) { if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2034" || attempt === 2) throw error; }
  }
  throw new Error("Transaction retry limit reached.");
}

export async function changeMemberRole(businessId: string, targetUserId: string, role: "OWNER" | "MANAGER" | "STAFF") {
  return serializable(async (tx) => {
    const target = await tx.membership.findUnique({ where: { userId_businessId: { userId: targetUserId, businessId } } });
    if (!target) return { error: "NOT_FOUND" as const };
    if (target.role === "OWNER" && role !== "OWNER") {
      const owners = await tx.membership.count({ where: { businessId, role: "OWNER" } });
      if (owners === 1) return { error: "LAST_OWNER" as const };
    }
    await tx.membership.update({ where: { userId_businessId: { userId: targetUserId, businessId } }, data: { role } });
    return { ok: true as const };
  });
}

export async function removeMember(businessId: string, targetUserId: string) {
  return serializable(async (tx) => {
    const target = await tx.membership.findUnique({ where: { userId_businessId: { userId: targetUserId, businessId } } });
    if (!target) return { error: "NOT_FOUND" as const };
    if (target.role === "OWNER") {
      const owners = await tx.membership.count({ where: { businessId, role: "OWNER" } });
      if (owners === 1) return { error: "LAST_OWNER" as const };
    }
    await tx.membership.delete({ where: { userId_businessId: { userId: targetUserId, businessId } } });
    await tx.staff.updateMany({ where: { businessId, userId: targetUserId }, data: { userId: null } });
    return { ok: true as const };
  });
}
