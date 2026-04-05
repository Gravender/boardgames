"use client";

import type { ImageWithUsage } from "@board-games/shared";

import { cn } from "@board-games/ui/utils";

import { PlayerImage } from "~/components/player-image";

const MAX_VISIBLE = 3;

type PlayerRef = { id: number; name: string; image?: ImageWithUsage | null };

const playerAvatarInitials = (name: string): string => {
  const trimmed = name.trim();
  if (!trimmed) {
    return "";
  }
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) {
    return parts[0]!.slice(0, 2).toUpperCase();
  }
  return `${parts[0]![0]!}${parts[parts.length - 1]![0]!}`.toUpperCase();
};

const zForIndex = (i: number) => (i === 0 ? "z-10" : i === 1 ? "z-20" : "z-30");

const sizeConfig = {
  sm: {
    avatar: "size-7 text-[10px]",
    overflow: "z-40 size-7 min-w-7 text-[10px]",
    overlap: "-space-x-1.5",
  },
  md: {
    avatar: "size-9 text-xs",
    overflow: "z-40 size-9 min-w-9 text-xs",
    overlap: "-space-x-2",
  },
} as const;

export const GroupPlayerAvatarStack = ({
  players,
  size = "md",
  className,
}: {
  players: readonly PlayerRef[];
  size?: keyof typeof sizeConfig;
  className?: string;
}) => {
  const cfg = sizeConfig[size];
  const visible = players.slice(0, MAX_VISIBLE);
  const overflow = Math.max(0, players.length - MAX_VISIBLE);

  if (players.length === 0) {
    return (
      <div
        className={cn(
          "bg-muted text-muted-foreground flex items-center justify-center rounded-full border border-dashed",
          cfg.avatar,
          className,
        )}
        aria-hidden
      >
        —
      </div>
    );
  }

  return (
    <div
      className={cn("flex items-center", cfg.overlap, className)}
      aria-hidden={false}
      aria-label={`${players.length} member${players.length === 1 ? "" : "s"}`}
    >
      {visible.map((player, index) => {
        const displayName = player.name.trim();
        const initials = playerAvatarInitials(player.name);
        return (
          <span
            key={player.id}
            className={cn("relative shrink-0", zForIndex(index))}
          >
            <PlayerImage
              image={player.image ?? null}
              alt={displayName ? `Avatar of ${displayName}` : ""}
              className={cn("ring-background ring-2", cfg.avatar)}
              fallBackClassName={cn(
                "font-semibold leading-none",
                size === "sm" ? "text-[10px]" : "text-xs",
              )}
              fallBackChildren={
                initials ? (
                  <span aria-hidden className="uppercase">
                    {initials}
                  </span>
                ) : undefined
              }
            />
          </span>
        );
      })}
      {overflow > 0 ? (
        <div
          className={cn(
            "bg-muted text-muted-foreground ring-background flex shrink-0 items-center justify-center rounded-full font-medium ring-2",
            cfg.overflow,
          )}
          title={`${overflow} more`}
        >
          +{overflow}
        </div>
      ) : null}
    </div>
  );
};
