export function isMockBillingEnabled(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return env.BILLING_MOCK === "true"
    && env.NODE_ENV === "development"
    && env.VERCEL === undefined
    && env.VERCEL_ENV === undefined;
}
