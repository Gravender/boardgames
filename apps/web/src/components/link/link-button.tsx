import {
  buttonVariants,
  type VariantProps,
} from "@board-games/ui/components/button-variants";
import { cn } from "@board-games/ui/utils";

import { Link, type LinkProps } from "./link";

type LinkButtonProps = LinkProps & VariantProps<typeof buttonVariants>;

function LinkButton({ className, variant, size, ...props }: LinkButtonProps) {
  return (
    <Link
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { LinkButton, type LinkButtonProps };
