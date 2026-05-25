import { Link, type LinkProps } from "./link";
import { LinkDiv, type LinkDivProps } from "./link-div";

type GameLinkGame =
  | {
      gameId: number;
      segment?: "stats" | "edit" | "share" | "roles";
    }
  | {
      sharedGameId: number;
      segment?: "stats" | "edit" | "roles";
    };

type GameLinkProps = Omit<LinkProps, "href"> & {
  game: GameLinkGame;
  layout?: LinkDivProps["layout"];
};

const getGameHref = (game: GameLinkGame): string => {
  if ("gameId" in game) {
    return `/games/${game.gameId}${game.segment ? `/${game.segment}` : ""}`;
  }
  return `/games/shared/${game.sharedGameId}${game.segment ? `/${game.segment}` : ""}`;
};

function GameLink({
  layout,
  prefetch,
  className,
  children,
  game,
}: GameLinkProps) {
  const href = getGameHref(game);
  const linkProps = { prefetch, className, children };

  if (layout !== undefined) {
    return <LinkDiv layout={layout} href={href} {...linkProps} />;
  }

  return <Link href={href} {...linkProps} />;
}

type GameLinkFromEntityProps = Omit<LinkProps, "href"> & {
  type: "original" | "shared";
  gameId: number;
  sharedGameId?: number | null;
  segment?: "stats" | "edit" | "share" | "roles";
  layout?: LinkDivProps["layout"];
};

function GameLinkFromEntity({
  type,
  gameId,
  sharedGameId,
  segment,
  ...props
}: GameLinkFromEntityProps) {
  if (type === "shared") {
    if (sharedGameId == null) {
      if (process.env.NODE_ENV !== "production") {
        console.error(
          "GameLinkFromEntity requires sharedGameId for shared games.",
        );
      }
      return null;
    }

    const game: GameLinkGame = {
      sharedGameId,
      segment:
        segment === "share"
          ? undefined
          : (segment as "stats" | "edit" | "roles" | undefined),
    };

    return <GameLink game={game} {...props} />;
  }

  const game: GameLinkGame = { gameId, segment };

  return <GameLink game={game} {...props} />;
}

export {
  GameLink,
  GameLinkFromEntity,
  getGameHref,
  type GameLinkProps,
  type GameLinkFromEntityProps,
  type GameLinkGame,
};
