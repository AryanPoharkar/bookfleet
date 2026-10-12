export function mapRazorpayStatus(status: string): string {
  switch (status) {
    case "created": case "authenticated": return "incomplete";
    case "active": return "active";
    case "pending": return "past_due";
    case "halted": return "unpaid";
    case "paused": return "paused";
    case "cancelled": case "completed": return "canceled";
    case "expired": return "incomplete_expired";
    default: return "incomplete";
  }
}
