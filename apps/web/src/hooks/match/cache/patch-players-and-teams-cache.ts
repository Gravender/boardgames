"use client";

import type { RouterInputs, RouterOutputs } from "@board-games/api";

export type PlayersAndTeamsData =
  RouterOutputs["match"]["getMatchPlayersAndTeams"];

export type OptimisticRoundScoreInput =
  RouterInputs["match"]["update"]["updateMatchRoundScore"];

export type OptimisticPlayerOrTeamScoreInput =
  RouterInputs["match"]["update"]["updateMatchPlayerScore"];

export type OptimisticMatchDetailsInput =
  RouterInputs["match"]["update"]["updateMatchDetails"];

export const applyRoundScoreOptimisticPatch = (
  prevData: PlayersAndTeamsData,
  newRoundScore: OptimisticRoundScoreInput,
): PlayersAndTeamsData => ({
  ...prevData,
  players: prevData.players.map((player) => {
    if (
      newRoundScore.type === "player" &&
      player.baseMatchPlayerId === newRoundScore.matchPlayerId
    ) {
      return {
        ...player,
        rounds: player.rounds.map((round) => {
          if (round.id === newRoundScore.round.id) {
            return {
              ...round,
              score: newRoundScore.round.score,
            };
          }
          return round;
        }),
      };
    }
    if (newRoundScore.type === "team") {
      if (player.teamId === newRoundScore.teamId) {
        return {
          ...player,
          rounds: player.rounds.map((round) => {
            if (round.id === newRoundScore.round.id) {
              return {
                ...round,
                score: newRoundScore.round.score,
              };
            }
            return round;
          }),
        };
      }
    }
    return player;
  }),
});

export const applyPlayerOrTeamScoreOptimisticPatch = (
  prevData: PlayersAndTeamsData,
  newScore: OptimisticPlayerOrTeamScoreInput,
): PlayersAndTeamsData => ({
  ...prevData,
  players: prevData.players.map((player) => {
    if (
      newScore.type === "player" &&
      player.baseMatchPlayerId === newScore.matchPlayerId
    ) {
      return { ...player, score: newScore.score };
    }
    if (newScore.type === "team" && player.teamId === newScore.teamId) {
      return { ...player, score: newScore.score };
    }
    return player;
  }),
});

export const applyMatchDetailsOptimisticPatch = (
  prevData: PlayersAndTeamsData,
  newDetails: OptimisticMatchDetailsInput,
): PlayersAndTeamsData => {
  if (newDetails.type === "player") {
    return {
      ...prevData,
      players: prevData.players.map((player) => {
        if (player.baseMatchPlayerId === newDetails.id) {
          return { ...player, details: newDetails.details };
        }
        return player;
      }),
    };
  }
  return {
    ...prevData,
    teams: prevData.teams.map((team) => {
      if (team.id === newDetails.teamId) {
        return { ...team, details: newDetails.details };
      }
      return team;
    }),
  };
};
