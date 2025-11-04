import { AddMatchDialog } from "~/components/match/add/index";
import { prefetch, trpc } from "~/trpc/server";

export default function TestPage() {
  const game = { id: 1, type: "original" as const };
  void prefetch(trpc.newPlayer.getPlayersForMatch.queryOptions());
  void prefetch(trpc.newPlayer.getRecentMatchWithPlayers.queryOptions());
  void prefetch(trpc.newGroup.getGroupsWithPlayers.queryOptions());
  void prefetch(
    trpc.newGame.gameRoles.queryOptions({
      ...game,
    }),
  );
  void prefetch(
    trpc.newGame.gameScoresheets.queryOptions({
      ...game,
    }),
  );
  return (
    <>
      <AddMatchDialog game={game} />
    </>
  );
}
