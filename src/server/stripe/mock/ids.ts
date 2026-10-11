import type { PriceMap } from "../plan-mapping";

export const MOCK_PRICE_MAP: PriceMap = {
  PRO: "price_mock_pro",
  BUSINESS: "price_mock_business",
};

export function isMockId(id: string | null | undefined): boolean {
  return typeof id === "string" && (id.startsWith("cus_mock_") || id.startsWith("sub_mock_"));
}
