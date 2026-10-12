CREATE TYPE "BillingProvider" AS ENUM ('STRIPE', 'RAZORPAY');

ALTER TABLE "Business"
  ADD COLUMN "billingProvider" "BillingProvider",
  ADD COLUMN "razorpayCustomerId" TEXT,
  ADD COLUMN "razorpaySubscriptionId" TEXT;

CREATE UNIQUE INDEX "Business_razorpaySubscriptionId_key" ON "Business"("razorpaySubscriptionId");

UPDATE "Business" SET "billingProvider" = 'STRIPE' WHERE "stripeSubscriptionId" IS NOT NULL;
