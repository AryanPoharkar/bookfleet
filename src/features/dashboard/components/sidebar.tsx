"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, LogOut } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { NavIcon } from "./icon";
import { signOutAction } from "@/features/auth/actions";
import type { NavItem } from "../nav-items";

export function Sidebar({ slug, email, items, businesses }: { slug: string; email: string; items: NavItem[]; businesses: { slug: string; name: string }[] }) {
  const pathname = usePathname();
  return <aside className="hidden w-64 shrink-0 border-r border-border bg-background lg:flex lg:min-h-screen lg:flex-col">
    <div className="border-b border-border p-5"><Logo /></div>
    <div className="px-4 pt-5">
      <DropdownMenu>
        <DropdownMenuTrigger asChild><Button variant="outline" className="w-full justify-between"><span className="truncate">{businesses.find((b) => b.slug === slug)?.name ?? slug}</span><ChevronDown className="size-4" /></Button></DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuLabel>Your businesses</DropdownMenuLabel>
          {businesses.map((business) => <DropdownMenuItem key={business.slug} asChild><Link href={`/app/${business.slug}`}>{business.name}{business.slug === slug ? " ✓" : ""}</Link></DropdownMenuItem>)}
          <DropdownMenuSeparator /><DropdownMenuItem asChild><Link href="/onboarding">New business</Link></DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
    <nav className="flex-1 space-y-1 p-4" aria-label="Main navigation">
      {items.map((item) => { const href = item.href.replace(":staffId", "__STAFF__"); return <Link key={item.label} href={href === "" ? `/app/${slug}` : `/app/${slug}${href}`} className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm ${pathname === (href === "" ? `/app/${slug}` : `/app/${slug}${href}`) ? "bg-muted text-primary" : "text-muted-foreground hover:bg-muted hover:text-primary"}`} aria-current={pathname === (href === "" ? `/app/${slug}` : `/app/${slug}${href}`) ? "page" : undefined}><NavIcon name={item.icon as Parameters<typeof NavIcon>[0]["name"]} className="size-4" />{item.label}</Link>; })}
    </nav>
    <div className="border-t border-border p-4">
      <p className="truncate px-3 pb-3 text-xs text-muted-foreground">{email}</p>
      <form action={signOutAction}><Button type="submit" variant="ghost" className="w-full justify-start gap-3"><LogOut className="size-4" />Sign out</Button></form>
    </div>
  </aside>;
}
