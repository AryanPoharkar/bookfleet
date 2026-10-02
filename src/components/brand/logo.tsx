import { cn } from "cn";

function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("font-heading text-xl font-semibold tracking-tight text-primary", className)}>
      Bookfleet
    </span>
  );
}

export { Logo };
