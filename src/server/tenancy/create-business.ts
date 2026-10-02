import { Prisma } from "@/generated/prisma/client";
import { db } from "@/server/db";

export async function isSlugAvailable(slug: string) {
  const existing = await db.business.findUnique({ where: { slug }, select: { id: true } });
  return !existing;
}

export async function createBusiness(input: {
  userId: string;
  name: string;
  slug: string;
  timezone: string;
  currency: string;
}) {
  try {
    return await db.$transaction(async (tx) => {
      const business = await tx.business.create({ data: input });
      await tx.membership.create({
        data: { userId: input.userId, businessId: business.id, role: "OWNER" },
      });
      const user = await tx.user.findUnique({
        where: { id: input.userId },
        select: { name: true, email: true },
      });
      await tx.staff.create({
        data: {
          businessId: business.id,
          userId: input.userId,
          name: user?.name ?? user?.email.split("@")[0] ?? "Owner",
          email: user?.email,
          isActive: true,
        },
      });
      return business;
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { error: "SLUG_TAKEN" as const };
    }
    throw error;
  }
}
