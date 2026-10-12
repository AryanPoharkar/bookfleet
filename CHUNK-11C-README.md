# Bookfleet Chunk 11C — implementation patch

Apply at the root of `C:\dev\bookfleet`, preserving paths. This patch adds the shared Stripe/Razorpay billing-event path, Razorpay TEST-mode configuration/client/webhook handling, checkout verification and cancellation actions, mock re-subscription behavior, UI wiring, a Prisma migration, and unit tests.

## Before applying

1. Commit or back up your current working tree.
2. Extract the ZIP into `C:\dev\bookfleet` and overwrite only the included paths.
3. Review `prisma/migrations/20261011170000_add_razorpay_billing_fields/migration.sql` before applying it.
4. Run `pnpm db:generate`, `pnpm typecheck`, `pnpm lint`, `pnpm test`, and `pnpm build`.
5. Do not commit or push until every command passes.

## Razorpay setup

- Keep Razorpay in **Test Mode**.
- Configure `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `RAZORPAY_PLAN_PRO`, and `RAZORPAY_PLAN_BUSINESS` in `.env.local`.
- Create monthly Razorpay test plans for Pro at INR 1,499 and Business at INR 3,999; use the resulting `plan_...` IDs.
- Set `BILLING_PROVIDER=razorpay` and `BILLING_MOCK=false`, then restart `pnpm dev`.
- Expose local port 3000 with ngrok and configure the Razorpay webhook URL as `https://<ngrok-host>/api/webhooks/razorpay`.
- Subscribe the webhook to `subscription.activated`, `subscription.charged`, `subscription.pending`, `subscription.halted`, `subscription.cancelled`, `subscription.completed`, `subscription.paused`, `subscription.resumed`, and `subscription.updated`.
- Generate a webhook secret locally; never paste keys or secrets into chat. If the ngrok URL changes, update the webhook URL.

## Verification status

The TypeScript/TSX files passed a syntax-transpilation check in the patch-building environment. The full repository dependencies/database were not installed here, so `pnpm typecheck`, lint, unit tests, build, Prisma migration, and live Razorpay test-mode checkout have **not** been run or verified. In particular, database-level tenant-isolation/concurrency tests and end-to-end Razorpay dashboard verification remain outstanding. Treat those as required checks, not as passed.
