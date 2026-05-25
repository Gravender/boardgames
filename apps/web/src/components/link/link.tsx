import type { ComponentProps } from "react";
import NextLink from "next/link";

import { cn } from "@board-games/ui/utils";

type LinkProps = ComponentProps<typeof NextLink>;

function Link({ className, prefetch = "auto", ...props }: LinkProps) {
  return <NextLink prefetch={prefetch} className={cn(className)} {...props} />;
}

export { Link, type LinkProps };
