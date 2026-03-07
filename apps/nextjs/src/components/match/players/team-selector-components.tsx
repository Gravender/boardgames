import { Plus, SquarePen, Trash2 } from "lucide-react";

import { Button } from "@board-games/ui/button";
import { Card, CardContent } from "@board-games/ui/card";
import { Input } from "@board-games/ui/input";

import type { TeamValue } from "./team-selector";

export const AddTeamForm = ({
  showAddTeam,
  newTeam,
  setNewTeam,
  setShowAddTeam,
  addTeam,
}: {
  showAddTeam: boolean;
  newTeam: string;
  setNewTeam: (team: string) => void;
  setShowAddTeam: (show: boolean) => void;
  addTeam: () => void;
}) => {
  if (!showAddTeam) {
    return (
      <Button
        type="button"
        onClick={() => setShowAddTeam(true)}
        className="w-full border-dashed"
        variant="outline"
      >
        <Plus className="mr-2 h-4 w-4" />
        Add New Team
      </Button>
    );
  }

  return (
    <Card className="py-2">
      <CardContent className="flex items-center gap-3 px-2 sm:px-4">
        <Input
          value={newTeam}
          onChange={(e) => setNewTeam(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== "Enter") {
              return;
            }
            const trimmedTeam = newTeam.trim();
            if (trimmedTeam.length === 0) {
              e.preventDefault();
              e.stopPropagation();
              return;
            }
            e.preventDefault();
            e.stopPropagation();
            addTeam();
          }}
          placeholder={"Add new team"}
        />
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="text-sm sm:text-base"
          onClick={(e) => {
            if (newTeam.trim().length === 0) {
              e.preventDefault();
              e.stopPropagation();
              return;
            }
            addTeam();
          }}
          disabled={newTeam.trim().length === 0}
        >
          Add
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            setShowAddTeam(false);
            setNewTeam("");
          }}
          className="text-sm sm:text-base"
        >
          Cancel
        </Button>
      </CardContent>
    </Card>
  );
};

export const TeamRow = ({
  team,
  teamPlayers,
  isEditingName,
  editingNameValue,
  onEditingNameValueChange,
  onSaveName,
  setActiveTeamEdit,
  setEditingTeamRoles,
  onRemoveTeam,
}: {
  team: TeamValue;
  teamPlayers: number;
  isEditingName: boolean;
  editingNameValue?: string;
  onEditingNameValueChange: (value: string) => void;
  onSaveName: () => void;
  setActiveTeamEdit: (id: number | null) => void;
  setEditingTeamRoles: (editing: boolean) => void;
  onRemoveTeam: () => void;
}) => (
  <Card key={team.id}>
    <CardContent className="flex flex-col gap-2 px-4 py-2">
      <div className="flex flex-col gap-1">
        {isEditingName ? (
          <div className="space-y-0">
            <label className="sr-only">Team Name</label>
            <div className="flex items-center gap-2">
              <Input
                className="text-base font-medium"
                placeholder="Team name"
                value={editingNameValue}
                onChange={(e) => onEditingNameValueChange(e.target.value)}
              />
              <Button type="button" size="sm" onClick={onSaveName}>
                Save
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex h-10 items-center gap-2 py-2">
            <span
              className="cursor-pointer font-medium transition-colors hover:text-purple-300"
              onClick={() => setActiveTeamEdit(team.id)}
              title="Click to edit team name"
            >
              {team.name}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setActiveTeamEdit(team.id)}
            >
              <SquarePen className="size-6" />
            </Button>
          </div>
        )}

        <div className="flex items-center gap-4 text-sm">
          <span>{teamPlayers} players</span>
          <span>{team.roles.length} team roles</span>
        </div>
      </div>
      <div className="flex items-center justify-between gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            setEditingTeamRoles(true);
            setActiveTeamEdit(team.id);
          }}
        >
          {team.roles.length > 0 ? (
            <div>
              {`${team.roles.length} role${team.roles.length !== 1 ? "s" : ""} selected`}
            </div>
          ) : (
            <span className="text-muted-foreground">No roles selected</span>
          )}
        </Button>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onRemoveTeam}
          className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
        >
          <Trash2 className="h-4 w-4" />
          <span>Team</span>
        </Button>
      </div>
    </CardContent>
  </Card>
);
