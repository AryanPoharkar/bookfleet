import type { ComponentProps } from "react";
import { cn } from "cn";

function Container({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("mx-auto w-full max-w-[1120px] px-5", className)} {...props} />;
}

export { Container };
