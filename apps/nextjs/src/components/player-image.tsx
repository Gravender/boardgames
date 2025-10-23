import type { LucideIcon } from "lucide-react";
import type z from "zod/v4";
import { User } from "lucide-react";

import type { imageSchema } from "@board-games/shared";
import { playerIcons } from "@board-games/shared";
import { Avatar, AvatarFallback, AvatarImage } from "@board-games/ui/avatar";
import { cn } from "@board-games/ui/utils";

export function PlayerImage({
  image,
  alt,
  userImageClassName,
  fallBackClassName,
  fallBackIconClassName,
  className,
  children,
  fallBackChildren,
}: {
  image: z.infer<typeof imageSchema> | null;
  alt?: string;
  userImageClassName?: string;
  fallBackClassName?: string;
  fallBackIconClassName?: string;
  className?: string;
  children?: React.ReactNode;
  fallBackChildren?: React.ReactNode;
}) {
  const Inner = () => {
    if (image?.type === "svg") {
      let Icon: LucideIcon = User;
      const foundIcon = playerIcons.find((icon) => icon.name === image.name);
      if (foundIcon) {
        Icon = foundIcon.icon;
      }
      return (
        <AvatarFallback className={fallBackClassName}>
          <Icon className={fallBackIconClassName} />
        </AvatarFallback>
      );
    }
    if (fallBackChildren === undefined) {
      return (
        <AvatarFallback className={fallBackClassName}>
          <User className={fallBackIconClassName} />
        </AvatarFallback>
      );
    }
    return (
      <AvatarFallback className={fallBackClassName}>
        {fallBackChildren}
      </AvatarFallback>
    );
  };
  return (
    <Avatar className={cn(className)}>
      <AvatarImage
        className={cn(userImageClassName)}
        src={image?.url ?? ""}
        alt={alt}
      />
      {/* TODO: fix this bug */}
      {/*  eslint-disable-next-line react-hooks/static-components */}
      <Inner />
      {children}
    </Avatar>
  );
}
