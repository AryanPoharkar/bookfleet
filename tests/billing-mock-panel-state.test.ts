import { describe, expect, it } from "vitest";
import { getMockPanelState } from "@/features/billing/mock-panel-state";
describe("mock billing panel state", () => {
  it("offers start buttons without a live subscription", () => { expect(getMockPanelState({ plan: "FREE", subscriptionStatus: "canceled", hasSubscriptionIds: true })).toMatchObject({ hasLive: false, switchButtons: { PRO: "start", BUSINESS: "start" }, paymentFailed: false, paymentRecovered: false, cancel: false }); });
  it("offers current/switch and recovery actions for a live past-due subscription", () => { expect(getMockPanelState({ plan: "PRO", subscriptionStatus: "past_due", hasSubscriptionIds: true })).toMatchObject({ hasLive: true, switchButtons: { PRO: "current", BUSINESS: "switch" }, paymentFailed: true, paymentRecovered: true, cancel: true }); });
  it("does not treat live status without both ids as live", () => { expect(getMockPanelState({ plan: "PRO", subscriptionStatus: "active", hasSubscriptionIds: false }).hasLive).toBe(false); });
});
