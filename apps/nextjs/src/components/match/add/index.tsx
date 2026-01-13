"use client";

import type { Dispatch, SetStateAction } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Plus } from "lucide-react";

import type { RouterOutputs } from "@board-games/api";
import { Button } from "@board-games/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@board-games/ui/dialog";

import type {
  LocationType,
  PlayerType,
  ScoresheetType,
  TeamType,
} from "./schema";
import { useAppForm } from "~/hooks/form";
import { useAddMatchMutation } from "~/hooks/mutations/match/add";
import { useGameRoles } from "~/hooks/queries/game/roles";
import { useScoresheets } from "~/hooks/queries/game/scoresheets";
import { useLocations } from "~/hooks/queries/locations";
import { formatMatchLink } from "~/utils/linkFormatting";
import { useSuspensePlayers } from "../hooks/players";
import { AddPlayerForm } from "./add-player-form";
import { MatchForm } from "./match";
import { CustomPlayerSelect } from "./player-selector";
import { addMatchSchema } from "./schema";

type ScoreSheets = RouterOutputs["newGame"]["gameScoresheets"];
type Locations = RouterOutputs["location"]["getLocations"];
type GameRoles = RouterOutputs["newGame"]["gameRoles"];
export function AddMatchDialog({
  game,
  gameName,
  matches,
}: {
  game:
    | {
        type: "original";
        id: number;
      }
    | {
        type: "shared";
        sharedGameId: number;
      };
  gameName: string;
  matches: number;
}) {
  const [showAddMatchDialog, setShowAddMatchDialog] = useState(false);
  const { scoresheets } = useScoresheets(game);
  const { locations } = useLocations();
  const { gameRoles } = useGameRoles(game);
  if (!scoresheets) return null;
  if (!locations) return null;
  return (
    <Dialog open={showAddMatchDialog} onOpenChange={setShowAddMatchDialog}>
      <DialogTrigger asChild>
        <Button aria-label="add match">
          <Plus className="mr-2 h-4 w-4" />
          Add Match
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl">
        <AddMatchContent
          game={game}
          gameName={gameName}
          matches={matches}
          scoresheets={scoresheets}
          locations={locations}
          gameRoles={gameRoles}
          setShowAddMatchDialog={setShowAddMatchDialog}
        />
      </DialogContent>
    </Dialog>
  );
}
function AddMatchContent({
  game,
  gameName = "Game",
  matches,
  scoresheets,
  locations,
  gameRoles,
  setShowAddMatchDialog,
}: {
  gameName: string;
  matches: number;
  game:
    | {
        id: number;
        type: "original";
      }
    | {
        sharedGameId: number;
        type: "shared";
      };
  scoresheets: ScoreSheets;
  locations: Locations;
  gameRoles: GameRoles;
  setShowAddMatchDialog: Dispatch<SetStateAction<boolean>>;
}) {
  const [currentForm, setCurrentForm] = useState<
    "match" | "player" | "addPlayer"
  >("match");
  const router = useRouter();
  const { createMatchMutation } = useAddMatchMutation({ input: game });
  const { playersForMatch } = useSuspensePlayers();
  const form = useAppForm({
    formId: "add-match-form",
    defaultValues: {
      name: `${gameName} #${matches + 1}`,
      date: new Date(),
      location: (locations.find((location) => location.isDefault) ??
        null) as LocationType,
      scoresheet: scoresheets[0] as ScoresheetType,
      teams: [] as TeamType[],
      players: [] as PlayerType[],
    },
    validators: {
      onSubmit: addMatchSchema,
    },
    onSubmit: ({ value }) => {
      return createMatchMutation.mutate(
        {
          game: game,
          name: value.name,
          date: value.date,
          players: value.players.map((p) => ({
            ...p,
            teamId: p.teamId ?? null,
          })),
          teams: value.teams,
          scoresheet: value.scoresheet,
          location: value.location,
        },
        {
          onSuccess: (response) => {
            const url = formatMatchLink({
              matchId: response.id,
              gameId: response.game.id,
              type: "original",
              finished: false,
            });
            router.push(url);
            setShowAddMatchDialog(false);
          },
        },
      );
    },
  });

  if (currentForm === "addPlayer") {
    return (
      <AddPlayerForm
        description="Add a player to your match"
        onReset={() => setCurrentForm("player")}
        onPlayerAdded={(player) => {
          setCurrentForm("player");

          form.setFieldValue("players", [
            ...form.state.values.players,
            {
              ...player,
              type: "original" as const,
              roles: [],
              teamId: null,
            },
          ]);
        }}
      />
    );
  }
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        await form.handleSubmit();
      }}
      className="space-y-4"
    >
      <form.Subscribe
        selector={(state) => ({
          selectedPlayers: state.values.players,
          teams: state.values.teams,
          date: state.values.date,
          name: state.values.name,
        })}
      >
        {({ selectedPlayers, teams, name, date }) => {
          if (currentForm === "match") {
            return (
              <MatchForm
                form={form}
                openPlayerForm={() => setCurrentForm("player")}
                numberOfPlayers={selectedPlayers.length}
                scoresheets={scoresheets}
                locations={locations}
                description="Add a new match to your collection."
                closeDialog={() => setShowAddMatchDialog(false)}
              />
            );
          }
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
          if (currentForm === "player") {
            return (
              <CustomPlayerSelect
                form={form}
                fields={{
                  players: "players",
                  teams: "teams",
                }}
                title={name}
                description={format(date, "PPP")}
                gameRoles={gameRoles}
                teams={teams}
                selectedPlayers={selectedPlayers}
                playersForMatch={playersForMatch}
                onBack={() => setCurrentForm("match")}
                onCancel={() => setShowAddMatchDialog(false)}
                onAddPlayer={() => setCurrentForm("addPlayer")}
              />
            );
          }
          return <div>Unknown form state: {currentForm}</div>;
        }}
      </form.Subscribe>
    </form>
  );
}
