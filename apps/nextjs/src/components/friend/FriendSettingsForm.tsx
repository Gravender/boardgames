"use client";

import type { z } from "zod/v4";

import { selectFriendSettingSchema } from "@board-games/db/zodSchema";
import { Button } from "@board-games/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@board-games/ui/card";
import { ScrollArea } from "@board-games/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@board-games/ui/tabs";

import { Spinner } from "~/components/spinner";
import { useAppForm, withForm } from "~/hooks/form";
import { useUpdateFriendSettingsMutation } from "~/hooks/mutations/friend/update-settings";

const formSchema = selectFriendSettingSchema.omit({
  id: true,
  createdById: true,
  friendId: true,
  createdAt: true,
  updatedAt: true,
});
export type FriendSettingsFormValues = z.infer<typeof formSchema>;

const permissionOptions = [
  { label: "View", value: "view" },
  { label: "Edit", value: "edit" },
];

export const MatchSettings = withForm({
  defaultValues: {} as FriendSettingsFormValues,
  validators: { onSubmit: formSchema },
  props: {
    allowSharedMatches: false,
    autoShareMatches: false,
  },
  render: function Render({ form, allowSharedMatches, autoShareMatches }) {
    return (
      <TabsContent value="matches" className="space-y-4 pt-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Match Settings</CardTitle>
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
    );
  },
});

export const GameSettings = withForm({
  defaultValues: {} as FriendSettingsFormValues,
  validators: { onSubmit: formSchema },
  props: {
    allowSharedGames: false,
  },
  render: function Render({ form, allowSharedGames }) {
    return (
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
    );
  },
});

export const PlayerSettings = withForm({
  defaultValues: {} as FriendSettingsFormValues,
  validators: { onSubmit: formSchema },
  props: {
    allowSharedPlayers: false,
  },
  render: function Render({ form, allowSharedPlayers }) {
    return (
      <TabsContent value="players" className="space-y-4 pt-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Player Settings</CardTitle>
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
    );
  },
});

export const LocationSettings = withForm({
  defaultValues: {} as FriendSettingsFormValues,
  validators: { onSubmit: formSchema },
  props: {
    allowSharedLocation: false,
  },
  render: function Render({ form, allowSharedLocation }) {
    return (
      <TabsContent value="locations" className="space-y-4 pt-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Location Settings</CardTitle>
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
    );
  },
});

export function FriendSettings({
  friendId,
  initialSettings,
  onFormSubmit,
}: {
  friendId: string;
  initialSettings: FriendSettingsFormValues;
  onFormSubmit?: () => void;
}) {
  const { updateFriendSettingsMutation } = useUpdateFriendSettingsMutation({
    friendId,
  });

  const form = useAppForm({
    defaultValues: initialSettings,
    validators: {
      onSubmit: formSchema,
    },
    onSubmit: async ({ value }) => {
      await updateFriendSettingsMutation.mutateAsync({
        friendId,
        settings: value,
      });
      onFormSubmit?.();
    },
  });

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        await form.handleSubmit();
      }}
    >
      <form.Subscribe
        selector={(state) => ({
          allowSharedMatches: state.values.allowSharedMatches,
          autoShareMatches: state.values.autoShareMatches,
          allowSharedGames: state.values.allowSharedGames,
          allowSharedPlayers: state.values.allowSharedPlayers,
          allowSharedLocation: state.values.allowSharedLocation,
        })}
      >
        {({
          allowSharedMatches,
          autoShareMatches,
          allowSharedGames,
          allowSharedPlayers,
          allowSharedLocation,
        }) => (
          <div className="py-4">
            <Tabs defaultValue="matches">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="matches">Matches</TabsTrigger>
                <TabsTrigger value="games">Games</TabsTrigger>
                <TabsTrigger value="players">Players</TabsTrigger>
                <TabsTrigger value="locations">Locations</TabsTrigger>
              </TabsList>

              <MatchSettings
                form={form}
                allowSharedMatches={allowSharedMatches}
                autoShareMatches={autoShareMatches}
              />
              <GameSettings form={form} allowSharedGames={allowSharedGames} />
              <PlayerSettings
                form={form}
                allowSharedPlayers={allowSharedPlayers}
              />
              <LocationSettings
                form={form}
                allowSharedLocation={allowSharedLocation}
              />
            </Tabs>
          </div>
        )}
      </form.Subscribe>
      <div className="mt-4 flex justify-end">
        <form.Subscribe>
          {(state) => (
            <Button type="submit" disabled={state.isSubmitting}>
              {state.isSubmitting && <Spinner />}
              Save Settings
            </Button>
          )}
        </form.Subscribe>
      </div>
    </form>
  );
}
