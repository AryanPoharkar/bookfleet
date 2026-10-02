import { beforeAll, afterAll, describe, expect, it, vi } from "vitest";
import { db } from "@/server/db";
import { getTenantDb } from "@/server/tenancy/tenant-db";

const navigation = vi.hoisted(() => ({ notFound: vi.fn(() => { throw new Error("NOT_FOUND"); }) }));
vi.mock("next/navigation", () => navigation);
vi.mock("@/server/auth/session", () => ({ requireUser: vi.fn() }));
import { requireTenant } from "@/server/tenancy/require-tenant";
import { requireUser } from "@/server/auth/session";

let businessA: { id: string }; let businessB: { id: string }; let userA: { id: string }; let userB: { id: string }; let serviceA: { id: string }; let serviceB: { id: string }; let staffA: { id: string }; let customerA: { id: string };
beforeAll(async () => {
  await db.business.deleteMany({ where: { slug: { in: ["vitest-a", "vitest-b"] } } });
  userA = await db.user.create({ data: { name: "Vitest A", email: `vitest-a-${Date.now()}@test.local` } });
  userB = await db.user.create({ data: { name: "Vitest B", email: `vitest-b-${Date.now()}@test.local` } });
  businessA = await db.business.create({ data: { name: "Vitest A", slug: "vitest-a", timezone: "UTC", currency: "USD" } });
  businessB = await db.business.create({ data: { name: "Vitest B", slug: "vitest-b", timezone: "UTC", currency: "USD" } });
  await db.membership.createMany({ data: [{ userId: userA.id, businessId: businessA.id, role: "OWNER" }, { userId: userB.id, businessId: businessB.id, role: "OWNER" }] });
  staffA = await db.staff.create({ data: { businessId: businessA.id, name: "Staff A", isActive: true } });
  customerA = await db.customer.create({ data: { businessId: businessA.id, name: "Customer A", email: `customer-a-${Date.now()}@test.local` } });
  serviceA = await db.service.create({ data: { businessId: businessA.id, name: "Service A", durationMin: 30, priceCents: 1000 } });
  serviceB = await db.service.create({ data: { businessId: businessB.id, name: "Service B", durationMin: 30, priceCents: 1000 } });
});
afterAll(async () => { await db.business.deleteMany({ where: { slug: { in: ["vitest-a", "vitest-b"] } } }); await db.user.deleteMany({ where: { id: { in: [userA.id, userB.id] } } }); await db.$disconnect(); });

describe("tenancy", () => {
  it("rejects a business B user asking for business A slug", async () => {
    vi.mocked(requireUser).mockResolvedValue(userB as never);
    await expect(requireTenant("vitest-a")).rejects.toThrow("NOT_FOUND");
  });
  it("scopes tenant db reads and writes", async () => {
    const tenant = getTenantDb(businessA.id);
    const services = await tenant.service.findMany();
    expect(services.map((s) => s.id)).toEqual([serviceA.id]);
    expect(await tenant.service.findUnique({ where: { id: serviceB.id } })).toBeNull();
    await expect(tenant.service.update({ where: { id: serviceB.id }, data: { name: "blocked" } })).rejects.toThrow();
    await expect(tenant.service.create({ data: { businessId: businessB.id, name: "bad", durationMin: 30, priceCents: 1 } })).rejects.toThrow();
  });
  it("rejects a cross-business raw booking insert", async () => {
    await expect(db.booking.create({ data: { businessId: businessA.id, serviceId: serviceB.id, staffId: staffA.id, customerId: customerA.id, startsAt: new Date(Date.now()+86400000), endsAt: new Date(Date.now()+88200000), status: "CONFIRMED", cancelToken: `vitest-${Date.now()}` } })).rejects.toMatchObject({ code: "P2003" });
  });
});
