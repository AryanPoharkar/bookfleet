export function getAppUrl(): string {
  const value = process.env.NEXT_PUBLIC_APP_URL;
  if (value === undefined || value.trim() === "") {
    if (process.env.NODE_ENV === "production") throw new Error("NEXT_PUBLIC_APP_URL is required in production.");
    return "http://localhost:3000";
  }
  let parsed: URL;
  try { parsed = new URL(value); } catch { throw new Error("NEXT_PUBLIC_APP_URL must be a valid HTTP(S) URL."); }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") throw new Error("NEXT_PUBLIC_APP_URL must use HTTP or HTTPS.");
  return value.replace(/\/+$/, "");
}
