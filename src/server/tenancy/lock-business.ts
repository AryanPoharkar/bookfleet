import type { TenantTx } from "./types";

export async function lockBusinessRow(tx: TenantTx, businessId: string): Promise<void> {
  // This makes the limit check for one business run one at a time.
  await tx.$queryRaw`SELECT "id" FROM "Business" WHERE "id" = ${businessId} FOR UPDATE`;
}
