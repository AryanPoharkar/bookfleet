import { cache } from "react";
import { db } from "@/server/db";

// The only raw lookup for public pages; chunk 12 adds a 60-second Redis cache.
export const getPublicBusiness = cache(async (slug: string) => db.business.findUnique({ where: { slug }, select: { id: true, name: true, slug: true, timezone: true, currency: true, logoUrl: true, accentColor: true } }));
