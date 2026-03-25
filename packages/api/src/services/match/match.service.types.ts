import type { matchRepository } from "../../repositories/match/match.repository";
import type {
  CreateMatchInputType,
  DeleteMatchInputType,
  EditMatchInputType,
  GetMatchInputType,
} from "../../routers/match/match.input";
import type { GetPlayerInsightsInputType } from "../../routers/player/sub-routers/stats/player-stats.input";
import type {
  WithOptionalTx,
  WithPosthogUserCtx,
  WithUserIdCtx,
} from "../../utils/shared-args.types";

export type CreateMatchArgs = WithPosthogUserCtx<CreateMatchInputType>;

export type GetMatchArgs = WithUserIdCtx<GetMatchInputType>;

export type GetPlayerInsightsMatchesArgs =
  WithUserIdCtx<GetPlayerInsightsInputType> & WithOptionalTx;

export type GetMatchScoresheetArgs = WithUserIdCtx<GetMatchInputType>;

export type GetMatchPlayersAndTeamsArgs = WithUserIdCtx<GetMatchInputType>;

export type DeleteMatchArgs = WithUserIdCtx<DeleteMatchInputType>;

export type EditMatchArgs = WithUserIdCtx<EditMatchInputType>;

export type MatchPlayersAndTeamsResponse = Awaited<
  ReturnType<typeof matchRepository.getMatchPlayersAndTeams>
>;
