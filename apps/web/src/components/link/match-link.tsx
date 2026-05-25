import { Link, type LinkProps } from "./link";
import { LinkDiv, type LinkDivProps } from "./link-div";

type MatchLinkGame =
  | {
      gameId: number;
      matchId: number;
      segment?: "edit" | "share" | "summary";
    }
  | {
      sharedGameId: number;
      sharedMatchId: number;
      segment?: "edit" | "summary";
    };

type MatchLinkProps = Omit<LinkProps, "href"> & {
  match: MatchLinkGame;
  layout?: LinkDivProps["layout"];
};

const getMatchHref = (match: MatchLinkGame): string => {
  if ("gameId" in match) {
    return `/games/${match.gameId}/${match.matchId}${match.segment ? `/${match.segment}` : ""}`;
  }
  return `/games/shared/${match.sharedGameId}/${match.sharedMatchId}${match.segment ? `/${match.segment}` : ""}`;
};

function MatchLink({
  layout,
  prefetch,
  className,
  children,
  match,
}: MatchLinkProps) {
  const href = getMatchHref(match);
  const linkProps = { prefetch, className, children };

  if (layout !== undefined) {
    return <LinkDiv layout={layout} href={href} {...linkProps} />;
  }

  return <Link href={href} {...linkProps} />;
}

export { MatchLink, getMatchHref, type MatchLinkProps, type MatchLinkGame };
