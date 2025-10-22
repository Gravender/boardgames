import type { LucideIcon } from "lucide-react";
import type z from "zod/v4";
import Image from "next/image";
import { Dices } from "lucide-react";

import { gameIcons, imageSchema } from "@board-games/shared";
import { cn } from "@board-games/ui/utils";

export function GameImage({
  image,
  alt,
  userImageClassName,
  iconClassName,
  containerClassName,
  children,
}: {
  image: z.infer<typeof imageSchema> | null;
  alt?: string;
  userImageClassName?: string;
  iconClassName?: string;
  containerClassName?: string;
  children?: React.ReactNode;
}) {
  const Inner = () => {
    if (!image)
      return (
        <GameImageIcon
          imageIcon={{
            type: "file",
            name: "No Image",
          }}
          className={iconClassName}
        />
      );
    if (image.type === "file") {
      return (
        <UserImage
          src={image.url}
          alt={alt ?? image.name}
          className={userImageClassName}
          iconClassName={iconClassName}
        />
      );
    }
    return <GameImageIcon imageIcon={image} className={iconClassName} />;
  };
  return (
    <div
      className={cn(
        "relative flex shrink-0 overflow-hidden rounded",
        containerClassName,
      )}
    >
      <Inner />
      {children}
    </div>
  );
}

function UserImage({
  src,
  alt,
  className,
  iconClassName,
}: {
  src: string | null;
  alt: string;
  className?: string;
  iconClassName?: string;
}) {
  if (!src)
    return (
      <GameImageIcon
        imageIcon={{
          type: "file",
          name: "No Image",
        }}
        className={iconClassName}
      />
    );
  return (
    <Image
      src={src}
      alt={alt}
      className={cn(
        "aspect-square h-full w-full rounded-md object-cover",
        className,
      )}
      fill
    />
  );
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const ImageIconSchema = imageSchema.pick({
  type: true,
  name: true,
});
function GameImageIcon({
  imageIcon,
  className,
}: {
  imageIcon: z.infer<typeof ImageIconSchema>;
  className?: string;
}) {
  let Icon: LucideIcon = Dices;
  if (imageIcon.type === "svg") {
    const foundIcon = gameIcons.find((icon) => icon.name === imageIcon.name);
    if (foundIcon) {
      Icon = foundIcon.icon;
    }
  }

  return (
    <Icon
      className={cn(
        "bg-muted h-full w-full items-center justify-center rounded-md p-2",
        className,
      )}
    />
  );
}
