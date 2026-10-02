import type { ReactNode } from "react";
import { cn } from "cn";

function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("flex flex-col gap-5 border-b border-border pb-8 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="max-w-2xl space-y-2">
        {eyebrow ? <p className="text-small font-medium text-primary">{eyebrow}</p> : null}
        <h1 className="text-h1 font-semibold tracking-tight">{title}</h1>
        {description ? <p className="max-w-xl text-body text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
    </header>
  );
}

export { PageHeader };
