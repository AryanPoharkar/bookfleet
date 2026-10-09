import type { ReactNode } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getAppUrl } from "@/server/app-url";
import { getPublicBusiness } from "@/server/tenancy/public-business";
import { accentStyle, resolveAccent } from "@/features/public-booking/accent-colors";
import { TimezoneProvider, TimezoneSwitch } from "@/features/public-booking/components/timezone-context";
export async function generateMetadata(): Promise<Metadata> { return { metadataBase: new URL(getAppUrl()) }; }
export default async function PublicBookingLayout({ children, params }: { children: ReactNode; params: Promise<{ slug: string }> }) { const { slug } = await params; const business = await getPublicBusiness(slug); if (!business) notFound(); const accent = resolveAccent(business.accentColor); const initials = business.name.split(/\s+/).slice(0, 2).map((x) => x[0]).join("").toUpperCase(); return <TimezoneProvider businessZone={business.timezone}><div style={accentStyle(accent.hex)} className="min-h-dvh bg-background text-foreground"><header className="border-b border-border bg-card"><div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4"><div className="flex items-center gap-3"><Avatar className="size-10"><AvatarImage src={business.logoUrl ?? undefined} alt={business.name} /> <AvatarFallback>{initials}</AvatarFallback></Avatar><span className="font-heading font-semibold">{business.name}</span></div><TimezoneSwitch /></div></header><main className="mx-auto max-w-6xl px-5 py-8">{children}</main><footer className="py-8 text-center text-sm text-muted-foreground"><Link href="/" className="underline-offset-4 hover:underline">Powered by Bookfleet</Link></footer></div></TimezoneProvider>; }
