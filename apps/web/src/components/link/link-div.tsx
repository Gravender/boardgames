import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@board-games/ui/utils";

import { Link, type LinkProps } from "./link";

const linkDivVariants = cva("", {
  variants: {
    layout: {
      row: "flex min-w-0 flex-1 items-center gap-4",
      block: "block w-full",
      inline: "inline-flex items-center gap-2",
    },
  },
  defaultVariants: {
    layout: "row",
  },
});

type LinkDivProps = LinkProps & VariantProps<typeof linkDivVariants>;

function LinkDiv({ className, layout, ...props }: LinkDivProps) {
  return (
    <Link
      className={cn(linkDivVariants({ layout }), className)}
      {...props}
    />
  );
}

export { LinkDiv, linkDivVariants, type LinkDivProps };
