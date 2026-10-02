import { redirect } from "next/navigation";
import { listUserBusinesses } from "@/server/tenancy/membership";
import { requireUser } from "@/server/auth/session";

export default async function AppPage() {
  const user = await requireUser();
  const businesses = await listUserBusinesses(user.id);
  if (businesses[0]) redirect(`/app/${businesses[0].business.slug}`);
  redirect("/onboarding");
}
