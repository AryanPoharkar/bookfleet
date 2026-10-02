import crypto from "node:crypto";
import { db } from "@/server/db";

function token() { return crypto.randomBytes(32).toString("base64url"); }
function hash(value: string) { return crypto.createHash("sha256").update(value).digest("hex"); }

export async function createInvite(businessId: string, email: string, role: "MANAGER" | "STAFF") {
  const normalized = email.trim().toLowerCase();
  await db.invite.deleteMany({ where: { businessId, email: normalized } });
  const raw = token();
  await db.invite.create({ data: { businessId, email: normalized, role, tokenHash: hash(raw), expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) } });
  return raw;
}

export async function getInvitePreview(rawToken: string) {
  const invite = await db.invite.findUnique({ where: { tokenHash: hash(rawToken) }, include: { business: true } });
  if (!invite) return { status: "INVALID" as const };
  if (invite.expiresAt <= new Date()) return { status: "EXPIRED" as const, business: invite.business, email: invite.email, role: invite.role };
  return { status: "OK" as const, business: invite.business, email: invite.email, role: invite.role };
}

export async function acceptInvite(userId: string, rawToken: string) {
  return db.$transaction(async (tx) => {
    const invite = await tx.invite.findUnique({ where: { tokenHash: hash(rawToken) }, include: { business: true } });
    if (!invite) return { status: "INVALID" as const };
    if (invite.expiresAt <= new Date()) return { status: "EXPIRED" as const };
    const user = await tx.user.findUnique({ where: { id: userId }, select: { email: true } });
    if (!user || user.email.toLowerCase() !== invite.email.toLowerCase()) return { status: "WRONG_EMAIL" as const };
    await tx.membership.upsert({ where: { userId_businessId: { userId, businessId: invite.businessId } }, create: { userId, businessId: invite.businessId, role: invite.role }, update: {} });
    await tx.invite.delete({ where: { id: invite.id } });
    return { status: "OK" as const, slug: invite.business.slug };
  });
}
