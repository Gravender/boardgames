import type { VariantProps } from "class-variance-authority";

import { buttonVariants } from "@board-games/ui/components/button-variants";

import { LinkButton, type LinkButtonProps } from "./link-button";

type LinkIconProps = LinkButtonProps;

/**
 * Icon-only navigation link. Provide `aria-label` (or visible text) for accessibility.
 */
function LinkIcon({
  variant = "ghost",
  size = "icon",
  ...props
}: LinkIconProps & VariantProps<typeof buttonVariants>) {
  return <LinkButton variant={variant} size={size} {...props} />;
}

export { LinkIcon, type LinkIconProps };
