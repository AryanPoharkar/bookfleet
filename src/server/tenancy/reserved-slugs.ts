export const RESERVED_SLUGS = [
  "app",
  "api",
  "login",
  "signup",
  "book",
  "admin",
  "pricing",
  "about",
  "privacy",
  "terms",
  "contact",
] as const;

export function isReservedSlug(slug: string) {
  return RESERVED_SLUGS.includes(slug as (typeof RESERVED_SLUGS)[number]);
}
