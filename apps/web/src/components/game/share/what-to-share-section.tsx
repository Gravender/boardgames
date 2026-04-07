"use client";

import { Checkbox } from "@board-games/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@board-games/ui/card";
import { Label } from "@board-games/ui/label";

import { useFormContext, withFieldGroup } from "~/hooks/form";

import { useShareGameData } from "./share-game-data-context";
import type { ShareGameForm } from "./use-share-game-form";
import type { GameData, ShareGameFormValues } from "./types";
import {
  clearAdvancedMatchParticipants,
  clearMatchFields,
} from "./use-share-game-form";

const shareOptionsDefaults: ShareGameFormValues["shareOptions"] = {
  roles: false,
  scoresheets: false,
  matches: false,
};

const ShareOptionsFieldGroup = withFieldGroup({
  defaultValues: shareOptionsDefaults,
  props: {
    gameData: undefined as unknown as GameData,
  },
  render: function Render({ group, gameData }) {
    return (
      <>
        <group.Field name="roles">
          {(field) => (
            <div className="flex items-start gap-3">
              <Checkbox
                id="share-roles"
                checked={field.state.value}
                onCheckedChange={(c) => field.handleChange(c === true)}
              />
              <div className="space-y-0.5">
                <Label htmlFor="share-roles" className="font-medium">
                  Share roles
                </Label>
                <p className="text-muted-foreground text-xs">
                  Role definitions and metadata for this game.
                </p>
              </div>
            </div>
          )}
        </group.Field>

        <group.Field name="scoresheets">
          {(field) => (
            <div className="flex items-start gap-3">
              <Checkbox
                id="share-scoresheets"
                checked={field.state.value}
                onCheckedChange={(c) => field.handleChange(c === true)}
              />
              <div className="space-y-0.5">
                <Label htmlFor="share-scoresheets" className="font-medium">
                  Share scoresheets
                </Label>
                <p className="text-muted-foreground text-xs">
                  Scoresheets and rounds configured for this game.
                </p>
              </div>
            </div>
          )}
        </group.Field>

        <group.Field
          name="matches"
          listeners={{
            onChange: ({ value }) => {
              if (value !== false) return;
              const root = group.form;
              root.setFieldValue("matches", clearMatchFields(gameData));
              const current = root.state.values as ShareGameFormValues;
              root.setFieldValue(
                "advancedPerUser",
                clearAdvancedMatchParticipants(
                  current.advancedPerUser,
                  gameData,
                ),
              );
            },
          }}
        >
          {(field) => (
            <div className="flex items-start gap-3">
              <Checkbox
                id="share-matches"
                checked={field.state.value}
                onCheckedChange={(c) => field.handleChange(c === true)}
              />
              <div className="space-y-0.5">
                <Label htmlFor="share-matches" className="font-medium">
                  Share matches
                </Label>
                <p className="text-muted-foreground text-xs">
                  Historical matches and results for this game.
                </p>
              </div>
            </div>
          )}
        </group.Field>
      </>
    );
  },
});

export const WhatToShareSection = () => {
  const form = useFormContext() as unknown as ShareGameForm;
  const gameData = useShareGameData();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">What to share</CardTitle>
        <CardDescription>
          Matches include historical results. You can choose which matches and
          whether to include players and locations.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start gap-3 opacity-80">
          <Checkbox id="share-game-core" checked disabled />
          <div className="space-y-0.5">
            <Label htmlFor="share-game-core" className="font-medium">
              Game
            </Label>
            <p className="text-muted-foreground text-xs">
              Always included — name, image, and core game definition.
            </p>
          </div>
        </div>

        <ShareOptionsFieldGroup
          form={form}
          fields={{
            roles: "shareOptions.roles",
            scoresheets: "shareOptions.scoresheets",
            matches: "shareOptions.matches",
          }}
          gameData={gameData}
        />
      </CardContent>
    </Card>
  );
};
