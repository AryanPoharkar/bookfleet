import {
  CalendarDays, LayoutDashboard, Scissors, UserRoundCog, Users, Settings,
} from "lucide-react";

const icons = { "calendar-days": CalendarDays, "layout-dashboard": LayoutDashboard, scissors: Scissors, "user-round-cog": UserRoundCog, users: Users, settings: Settings } as const;

export function NavIcon({ name, className }: { name: keyof typeof icons; className?: string }) {
  const Icon = icons[name];
  return <Icon className={className} aria-hidden="true" />;
}
