import Stripe from "stripe";
let instance: Stripe | undefined;
export function getStripe(): Stripe {
 const key = process.env.STRIPE_SECRET_KEY;
 if (!key || !key.startsWith("sk_test_")) throw new Error("Bookfleet only runs Stripe in test mode. Set STRIPE_SECRET_KEY to an sk_test_ key.");
 instance ??= new Stripe(key);
 return instance;
}
