import type { Dispatch, SetStateAction } from "react";
import { useState } from "react";

import { Button } from "@board-games/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@board-games/ui/dialog";
import { toast } from "@board-games/ui/toast";

import type {
  LocationType,
  PlayerType,
  ScoresheetType,
  TeamType,
} from "./schema";
import { useAppForm } from "~/hooks/form";
import { AddPlayerForm } from "./add-player-form";
import { MatchForm } from "./match";
import { CustomPlayerSelect } from "./player-selector";
import { addMatchSchema } from "./schema";

export function AddMatchDialog() {
  const [showAddMatchDialog, setShowAddMatchDialog] = useState(true);
  return (
    <Dialog open={showAddMatchDialog} onOpenChange={setShowAddMatchDialog}>
      <DialogTrigger asChild>
        <Button>Add Match</Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl">
        <AddMatchContent setShowAddMatchDialog={setShowAddMatchDialog} />
      </DialogContent>
    </Dialog>
  );
}
function AddMatchContent({
  setShowAddMatchDialog,
}: {
  setShowAddMatchDialog: Dispatch<SetStateAction<boolean>>;
}) {
  const [currentForm, setCurrentForm] = useState<
    "match" | "player" | "addPlayer"
  >("match");
  const form = useAppForm({
    formId: "add-match-form",
    defaultValues: {
      name: "",
      date: new Date(),
      location: null as LocationType,
      scoresheet: {
        id: 1,
        type: "original" as const,
      } as ScoresheetType,
      teams: [] as TeamType[],
      players: [] as PlayerType[],
    },
    validators: {
      onSubmit: addMatchSchema,
    },
    onSubmit: ({ value }) => {
      toast("You submitted the following values:", {
        description: (
          <pre className="bg-code text-code-foreground mt-2 w-[320px] overflow-x-auto rounded-md p-4">
            <code>{JSON.stringify(value, null, 2)}</code>
          </pre>
        ),
        position: "bottom-right",
        classNames: {
          content: "flex flex-col gap-2",
        },
        style: {
          "--border-radius": "calc(var(--radius)  + 4px)",
        } as React.CSSProperties,
      });
    },
  });

  const tempLocations = [
    {
      id: 1,
      type: "original" as const,
      name: "Location 1",
      isDefault: true,
    },
    {
      sharedId: 2,
      type: "shared" as const,
      name: "Location 2",
      isDefault: false,
    },
  ];
  const tempScoresheets = [
    {
      id: 1,
      name: "Scoresheet 1",
      type: "original" as const,
      default: true,
    },
    {
      sharedId: 2,
      name: "Scoresheet 2",
      type: "shared" as const,
      default: false,
    },
  ];

  if (currentForm === "addPlayer") {
    return (
      <AddPlayerForm
        description="Add a player to your match"
        onReset={() => setCurrentForm("player")}
        onPlayerAdded={(player) => {
          setCurrentForm("player");
          form.state.values.players.push({
            ...player,
            type: "original" as const,
            roles: [],
            teamId: undefined,
          });
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
        })}
      >
        {({ selectedPlayers, teams }) => {
          if (currentForm === "match") {
            return (
              <MatchForm
                form={form}
                openPlayerForm={() => setCurrentForm("player")}
                numberOfPlayers={selectedPlayers.length}
                scoresheets={tempScoresheets}
                locations={tempLocations}
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
                game={{
                  id: 1,
                  type: "original" as const,
                }}
                teams={teams}
                selectedPlayers={selectedPlayers}
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
