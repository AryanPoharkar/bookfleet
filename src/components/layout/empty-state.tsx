import type { ComponentType, ReactNode } from "react";
import { cn } from "cn";

function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: ComponentType<{ className?: string }>;
  title: ReactNode;
  description: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex min-h-64 flex-col items-center justify-center border border-dashed border-border p-8 text-center", className)}>
      <div className="mb-4 flex size-10 items-center justify-center rounded-lg bg-muted text-primary">
        <Icon className="size-5" aria-hidden="true" />
      </div>
      <h3 className="font-heading text-h3 font-semibold">{title}</h3>
      <p className="mt-2 max-w-md text-small text-muted-foreground">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export { EmptyState };
