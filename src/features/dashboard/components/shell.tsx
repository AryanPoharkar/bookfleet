import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/brand/logo";
import { Toaster } from "@/components/ui/sonner";
import { listUserBusinesses } from "@/server/tenancy/membership";
import { MobileNav } from "./mobile-nav";
import { Sidebar } from "./sidebar";
import type { NavItem } from "../nav-items";

export async function DashboardShell({ tenant, items, children }: { tenant: Awaited<ReturnType<typeof import("@/server/tenancy/require-tenant").requireTenant>>; items: NavItem[]; children: ReactNode }) {
  const businesses = await listUserBusinesses(tenant.user.id);
  const concreteItems = items.map((item) => ({ ...item, href: item.href.replace(":staffId", tenant.staffId ?? "") })).filter((item) => !item.href.includes(":staffId"));
  return <>
    <div className="min-h-screen bg-background lg:flex">
      <Sidebar slug={tenant.business.slug} email={tenant.user.email} items={concreteItems} businesses={businesses.map(({ business }) => ({ name: business.name, slug: business.slug }))} />
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-background/95 px-4 backdrop-blur lg:hidden"><MobileNav items={concreteItems.map((item) => ({ label: item.label, href: item.href === "" ? `/app/${tenant.business.slug}` : `/app/${tenant.business.slug}${item.href}`, icon: item.icon }))} businessName={tenant.business.name} /><Link href={`/app/${tenant.business.slug}`} className="ml-1"><Logo /></Link></header>
        <main>{children}</main>
      </div>
    </div><Toaster />
  </>;
}
