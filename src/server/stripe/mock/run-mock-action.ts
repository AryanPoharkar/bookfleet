import { randomBytes, randomUUID } from "node:crypto";
import type { PrismaClient } from "@/generated/prisma/client";
import { applyBillingEvent } from "../apply-billing-event";
import { isMockBillingEnabled } from "./guard";
import { MOCK_PRICE_MAP } from "./ids";
import { buildMockEvent } from "./build-event";
import { mockActionSchema } from "@/features/billing/mock-schemas";

type MockError = "MOCK_DISABLED" | "INVALID_INPUT" | "UNKNOWN" | "NOT_MOCK_SUBSCRIPTION" | "ALREADY_SUBSCRIBED" | "NO_SUBSCRIPTION";
type Db = Pick<PrismaClient, "business" | "$transaction">;

export async function runMockBillingAction({
  db,
  businessId,
  input,
  env = process.env,
}: {
  db: Db;
  businessId: string;
  input: unknown;
  env?: Record<string, string | undefined>;
}): Promise<{ ok: true; result: "applied" | "duplicate" | "ignored"; eventId: string } | { ok: false; error: MockError }> {
  if (!isMockBillingEnabled(env)) return { ok: false, error: "MOCK_DISABLED" };
  const parsed = mockActionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "INVALID_INPUT" };

  const business = await db.business.findUnique({
    where: { id: businessId },
    select: { id: true, plan: true, stripeCustomerId: true, stripeSubscriptionId: true, subscriptionStatus: true },
  });
  if (!business) return { ok: false, error: "UNKNOWN" };

  const eventId = `evt_mock_${randomUUID()}`;
  const newCustomerId = `cus_mock_${randomBytes(8).toString("hex")}`;
  const newSubscriptionId = `sub_mock_${randomBytes(8).toString("hex")}`;
  const built = buildMockEvent({
    input: parsed.data,
    business,
    eventId,
    newCustomerId,
    newSubscriptionId,
  });
  if (!built.ok) return built;

  const result = await applyBillingEvent({ db, event: built.event, priceMap: MOCK_PRICE_MAP });
  return { ok: true, result, eventId };
}
