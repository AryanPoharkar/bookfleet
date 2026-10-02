export function priceToCents(value: string) { const [whole, fraction = ""] = value.split("."); return Number(whole) * 100 + Number((fraction + "00").slice(0, 2)); }
export function centsToPrice(cents: number) { const whole = Math.floor(cents / 100); const fraction = String(cents % 100).padStart(2, "0"); return `${whole}.${fraction}`; }
export function formatMoney(cents: number, currency: string) { return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100); }
