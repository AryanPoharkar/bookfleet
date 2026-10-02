"use client";
import Link from "next/link";
import { Menu } from "lucide-react";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { NavIcon } from "./icon";

export function MobileNav({ items, businessName }: { items: { label: string; href: string; icon: string }[]; businessName: string }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  return <Sheet open={open} onOpenChange={setOpen}><SheetTrigger render={<Button variant="outline" size="icon" aria-label="Open menu" />}><Menu className="size-5" /></SheetTrigger><SheetContent side="left" className="w-72"><SheetHeader><SheetTitle>{businessName}</SheetTitle></SheetHeader><nav className="mt-6 space-y-1">{items.map((item) => <Link key={item.label} href={item.href} onClick={() => setOpen(false)} className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm ${pathname === item.href ? "bg-muted text-primary" : "hover:bg-muted hover:text-primary"}`} aria-current={pathname === item.href ? "page" : undefined}><NavIcon name={item.icon as Parameters<typeof NavIcon>[0]["name"]} className="size-4" />{item.label}</Link>)}</nav></SheetContent></Sheet>;
}
