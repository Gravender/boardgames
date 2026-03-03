"use client";

import { useEffect } from "react";
import { z } from "zod/v4";

import type { RouterOutputs } from "@board-games/api";
import { Button } from "@board-games/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@board-games/ui/card";
import { ScrollArea } from "@board-games/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@board-games/ui/tabs";

import { Spinner } from "~/components/spinner";
import { useAppForm } from "~/hooks/form";
import { useUpdateFriendSettingsMutation } from "~/hooks/mutations/friend/update-settings";

const formSchema = z.object({
  autoShareMatches: z.boolean(),
  sharePlayersWithMatch: z.boolean(),
  includeLocationWithMatch: z.boolean(),
  defaultPermissionForMatches: z.enum(["view", "edit"]),
  defaultPermissionForPlayers: z.enum(["view", "edit"]),
  defaultPermissionForLocation: z.enum(["view", "edit"]),
  defaultPermissionForGame: z.enum(["view", "edit"]),
  autoAcceptMatches: z.boolean(),
  autoAcceptPlayers: z.boolean(),
  autoAcceptLocation: z.boolean(),
  autoAcceptGame: z.boolean(),
  allowSharedGames: z.boolean(),
  allowSharedPlayers: z.boolean(),
  allowSharedLocation: z.boolean(),
  allowSharedMatches: z.boolean(),
});

const permissionOptions = [
  { label: "View", value: "view" },
  { label: "Edit", value: "edit" },
];

export function FriendSettings({
  friendId,
  initialSettings,
  onFormChange,
  onFormSubmit,
}: {
  friendId: string;
  initialSettings: RouterOutputs["friend"]["getFriend"]["settings"];
  onFormChange?: (isDirty: boolean) => void;
  onFormSubmit?: () => void;
}) {
  const { updateFriendSettingsMutation } = useUpdateFriendSettingsMutation({
    friendId,
  });

  const form = useAppForm({
    defaultValues: initialSettings
      ? {
          autoShareMatches: initialSettings.autoShareMatches,
          sharePlayersWithMatch: initialSettings.sharePlayersWithMatch,
          includeLocationWithMatch: initialSettings.includeLocationWithMatch,
          defaultPermissionForMatches:
            initialSettings.defaultPermissionForMatches,
          defaultPermissionForPlayers:
            initialSettings.defaultPermissionForPlayers,
          defaultPermissionForLocation:
            initialSettings.defaultPermissionForLocation,
          defaultPermissionForGame: initialSettings.defaultPermissionForGame,
          autoAcceptMatches: initialSettings.autoAcceptMatches,
          autoAcceptPlayers: initialSettings.autoAcceptPlayers,
          autoAcceptLocation: initialSettings.autoAcceptLocation,
          autoAcceptGame: initialSettings.autoAcceptGame,
          allowSharedGames: initialSettings.allowSharedGames,
          allowSharedPlayers: initialSettings.allowSharedPlayers,
          allowSharedLocation: initialSettings.allowSharedLocation,
          allowSharedMatches: initialSettings.allowSharedMatches,
        }
      : {
          autoShareMatches: false,
          sharePlayersWithMatch: false,
          includeLocationWithMatch: false,
          defaultPermissionForMatches: "view" as const,
          defaultPermissionForPlayers: "view" as const,
          defaultPermissionForLocation: "view" as const,
          defaultPermissionForGame: "view" as const,
          autoAcceptMatches: false,
          autoAcceptPlayers: false,
          autoAcceptLocation: false,
          autoAcceptGame: true,
          allowSharedGames: true,
          allowSharedPlayers: true,
          allowSharedLocation: true,
          allowSharedMatches: true,
        },
    validators: {
      onSubmit: formSchema,
    },
    onSubmit: ({ value }) => {
      updateFriendSettingsMutation.mutate(
        { friendId, settings: value },
        { onSuccess: () => onFormSubmit?.() },
      );
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        form.handleSubmit();
      }}
    >
      <form.Subscribe
        selector={(state) => ({
          isDirty: state.isDirty,
          allowSharedMatches: state.values.allowSharedMatches,
          allowSharedGames: state.values.allowSharedGames,
          allowSharedPlayers: state.values.allowSharedPlayers,
          allowSharedLocation: state.values.allowSharedLocation,
          autoShareMatches: state.values.autoShareMatches,
        })}
      >
        {({
          isDirty,
          allowSharedMatches,
          allowSharedGames,
          allowSharedPlayers,
          allowSharedLocation,
          autoShareMatches,
        }) => (
          <DirtyNotifier isDirty={isDirty} onFormChange={onFormChange}>
            <div className="py-4">
              <Tabs defaultValue="matches">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="matches">Matches</TabsTrigger>
                  <TabsTrigger value="games">Games</TabsTrigger>
                  <TabsTrigger value="players">Players</TabsTrigger>
                  <TabsTrigger value="locations">Locations</TabsTrigger>
                </TabsList>

                <TabsContent value="matches" className="space-y-4 pt-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">
                        Match Settings
                      </CardTitle>
                    </CardHeader>
                    <ScrollArea>
                      <CardContent className="grid max-h-[400px] gap-2">
                        <form.AppField name="allowSharedMatches">
                          {(field) => (
                            <field.SwitchField
                              label="Allow Shared Matches"
                              description="Allow this friend to share matches with you"
                            />
                          )}
                        </form.AppField>

                        <form.AppField name="autoAcceptMatches">
                          {(field) => (
                            <field.SwitchField
                              label="Auto Accept Matches"
                              description="Automatically accept match shares from this friend"
                              disabled={!allowSharedMatches}
                            />
                          )}
                        </form.AppField>

                        <form.AppField name="defaultPermissionForMatches">
                          {(field) => (
                            <field.SelectField
                              label="Default Permission"
                              description="Default permission level for shared matches"
                              values={permissionOptions}
                              disabled={!allowSharedMatches}
                            />
                          )}
                        </form.AppField>

                        <form.AppField name="autoShareMatches">
                          {(field) => (
                            <field.SwitchField
                              label="Auto Share Matches"
                              description="Automatically share your matches with this friend"
                            />
                          )}
                        </form.AppField>

                        <form.AppField name="sharePlayersWithMatch">
                          {(field) => (
                            <field.SwitchField
                              label="Share Players with Match"
                              description="Include player information when sharing matches"
                              disabled={!autoShareMatches}
                            />
                          )}
                        </form.AppField>

                        <form.AppField name="includeLocationWithMatch">
                          {(field) => (
                            <field.SwitchField
                              label="Include Location with Match"
                              description="Include location information when sharing matches"
                              disabled={!autoShareMatches}
                            />
                          )}
                        </form.AppField>
                      </CardContent>
                    </ScrollArea>
                  </Card>
                </TabsContent>

                <TabsContent value="games" className="space-y-4 pt-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Game Settings</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <form.AppField name="allowSharedGames">
                        {(field) => (
                          <field.SwitchField
                            label="Allow Shared Games"
                            description="Allow this friend to share games with you"
                          />
                        )}
                      </form.AppField>

                      <form.AppField name="autoAcceptGame">
                        {(field) => (
                          <field.SwitchField
                            label="Auto Accept Games"
                            description="Automatically accept game shares from this friend"
                            disabled={!allowSharedGames}
                          />
                        )}
                      </form.AppField>

                      <form.AppField name="defaultPermissionForGame">
                        {(field) => (
                          <field.SelectField
                            label="Default Permission"
                            description="Default permission level for shared games"
                            values={permissionOptions}
                            disabled={!allowSharedGames}
                          />
                        )}
                      </form.AppField>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="players" className="space-y-4 pt-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">
                        Player Settings
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <form.AppField name="allowSharedPlayers">
                        {(field) => (
                          <field.SwitchField
                            label="Allow Shared Players"
                            description="Allow this friend to share players with you"
                          />
                        )}
                      </form.AppField>

                      <form.AppField name="autoAcceptPlayers">
                        {(field) => (
                          <field.SwitchField
                            label="Auto Accept Players"
                            description="Automatically accept player shares from this friend"
                            disabled={!allowSharedPlayers}
                          />
                        )}
                      </form.AppField>

                      <form.AppField name="defaultPermissionForPlayers">
                        {(field) => (
                          <field.SelectField
                            label="Default Permission"
                            description="Default permission level for shared players"
                            values={permissionOptions}
                            disabled={!allowSharedPlayers}
                          />
                        )}
                      </form.AppField>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="locations" className="space-y-4 pt-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">
                        Location Settings
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <form.AppField name="allowSharedLocation">
                        {(field) => (
                          <field.SwitchField
                            label="Allow Shared Locations"
                            description="Allow this friend to share locations with you"
                          />
                        )}
                      </form.AppField>

                      <form.AppField name="autoAcceptLocation">
                        {(field) => (
                          <field.SwitchField
                            label="Auto Accept Locations"
                            description="Automatically accept location shares from this friend"
                            disabled={!allowSharedLocation}
                          />
                        )}
                      </form.AppField>

                      <form.AppField name="defaultPermissionForLocation">
                        {(field) => (
                          <field.SelectField
                            label="Default Permission"
                            description="Default permission level for shared locations"
                            values={permissionOptions}
                            disabled={!allowSharedLocation}
                          />
                        )}
                      </form.AppField>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </DirtyNotifier>
        )}
      </form.Subscribe>
      <div className="mt-4 flex justify-end">
        <form.Subscribe selector={(state) => state.isSubmitting}>
          {(isSubmitting) => (
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Spinner />}
              Save Settings
            </Button>
          )}
        </form.Subscribe>
      </div>
    </form>
  );
}

const DirtyNotifier = ({
  isDirty,
  onFormChange,
  children,
}: {
  isDirty: boolean;
  onFormChange?: (isDirty: boolean) => void;
  children: React.ReactNode;
}) => {
  useEffect(() => {
    onFormChange?.(isDirty);
  }, [isDirty, onFormChange]);

  return <>{children}</>;
};
