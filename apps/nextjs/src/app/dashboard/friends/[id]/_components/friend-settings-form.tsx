"use client";

import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { z } from "zod/v4";

import type { RouterOutputs } from "@board-games/api";
import { Button } from "@board-games/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@board-games/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  useForm,
} from "@board-games/ui/form";
import { ScrollArea } from "@board-games/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@board-games/ui/select";
import { Switch } from "@board-games/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@board-games/ui/tabs";
import { toast } from "@board-games/ui/toast";

import { useTRPC } from "~/trpc/react";

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const updateFriendSettingsMutation = useMutation(
    trpc.friend.updateFriendSettings.mutationOptions({
      onSuccess: async () => {
        toast.success("Settings updated", {
          description: "Your friend settings have been updated successfully.",
        });
        await queryClient.invalidateQueries(
          trpc.friend.getFriend.queryOptions({ friendId }),
        );
        if (onFormSubmit) {
          onFormSubmit();
        }
        setIsSubmitting(false);
      },
      onError: () => {
        toast.error("Error", {
          description: "Failed to update settings. Please try again.",
        });
        setIsSubmitting(false);
        throw new Error("Failed to update settings. Please try again.");
      },
    }),
  );

  const form = useForm({
    schema: formSchema,
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
  });

  // Notify parent component when form state changes
  useEffect(() => {
    if (onFormChange) {
      onFormChange(form.formState.isDirty);
    }
  }, [form.formState.isDirty, onFormChange]);

  const watchAllowSharedMatches = form.watch("allowSharedMatches");
  const watchAllowSharedGames = form.watch("allowSharedGames");
  const watchAllowSharedPlayers = form.watch("allowSharedPlayers");
  const watchAllowSharedLocation = form.watch("allowSharedLocation");
  const watchAutoShareMatches = form.watch("autoShareMatches");

  function onSubmit(data: z.infer<typeof formSchema>) {
    setIsSubmitting(true);

    updateFriendSettingsMutation.mutate({
      friendId,
      settings: data,
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
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
                  <CardTitle className="text-lg">Match Settings</CardTitle>
                </CardHeader>
                <ScrollArea>
                  <CardContent className="grid max-h-[400px] gap-2">
                    <FormField
                      control={form.control}
                      name="allowSharedMatches"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                          <div className="space-y-0.5">
                            <FormLabel className="text-sm">
                              Allow Shared Matches
                            </FormLabel>
                            <FormDescription className="text-xs">
                              Allow this friend to share matches with you
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="autoAcceptMatches"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                          <div className="space-y-0.5">
                            <FormLabel className="text-sm">
                              Auto Accept Matches
                            </FormLabel>
                            <FormDescription className="text-xs">
                              Automatically accept match shares from this friend
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              disabled={!watchAllowSharedMatches}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="defaultPermissionForMatches"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                          <div className="space-y-0.5">
                            <FormLabel className="text-sm">
                              Default Permission
                            </FormLabel>
                            <FormDescription className="text-xs">
                              Default permission level for shared matches
                            </FormDescription>
                          </div>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            disabled={!watchAllowSharedMatches}
                          >
                            <FormControl>
                              <SelectTrigger className="w-24">
                                <SelectValue placeholder="Select" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="view">View</SelectItem>
                              <SelectItem value="edit">Edit</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="autoShareMatches"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                          <div className="space-y-0.5">
                            <FormLabel className="text-sm">
                              Auto Share Matches
                            </FormLabel>
                            <FormDescription className="text-xs">
                              Automatically share your matches with this friend
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="sharePlayersWithMatch"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                          <div className="space-y-0.5">
                            <FormLabel className="text-sm">
                              Share Players with Match
                            </FormLabel>
                            <FormDescription className="text-xs">
                              Include player information when sharing matches
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              disabled={!watchAutoShareMatches}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="includeLocationWithMatch"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                          <div className="space-y-0.5">
                            <FormLabel className="text-sm">
                              Include Location with Match
                            </FormLabel>
                            <FormDescription className="text-xs">
                              Include location information when sharing matches
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              disabled={!watchAutoShareMatches}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
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
                  <FormField
                    control={form.control}
                    name="allowSharedGames"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel className="text-sm">
                            Allow Shared Games
                          </FormLabel>
                          <FormDescription className="text-xs">
                            Allow this friend to share games with you
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="autoAcceptGame"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel className="text-sm">
                            Auto Accept Games
                          </FormLabel>
                          <FormDescription className="text-xs">
                            Automatically accept game shares from this friend
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            disabled={!watchAllowSharedGames}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="defaultPermissionForGame"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel className="text-sm">
                            Default Permission
                          </FormLabel>
                          <FormDescription className="text-xs">
                            Default permission level for shared games
                          </FormDescription>
                        </div>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          disabled={!watchAllowSharedGames}
                        >
                          <FormControl>
                            <SelectTrigger className="w-24">
                              <SelectValue placeholder="Select" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="view">View</SelectItem>
                            <SelectItem value="edit">Edit</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="players" className="space-y-4 pt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Player Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="allowSharedPlayers"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel className="text-sm">
                            Allow Shared Players
                          </FormLabel>
                          <FormDescription className="text-xs">
                            Allow this friend to share players with you
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="autoAcceptPlayers"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel className="text-sm">
                            Auto Accept Players
                          </FormLabel>
                          <FormDescription className="text-xs">
                            Automatically accept player shares from this friend
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            disabled={!watchAllowSharedPlayers}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="defaultPermissionForPlayers"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel className="text-sm">
                            Default Permission
                          </FormLabel>
                          <FormDescription className="text-xs">
                            Default permission level for shared players
                          </FormDescription>
                        </div>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          disabled={!watchAllowSharedPlayers}
                        >
                          <FormControl>
                            <SelectTrigger className="w-24">
                              <SelectValue placeholder="Select" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="view">View</SelectItem>
                            <SelectItem value="edit">Edit</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="locations" className="space-y-4 pt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Location Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="allowSharedLocation"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel className="text-sm">
                            Allow Shared Locations
                          </FormLabel>
                          <FormDescription className="text-xs">
                            Allow this friend to share locations with you
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="autoAcceptLocation"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel className="text-sm">
                            Auto Accept Locations
                          </FormLabel>
                          <FormDescription className="text-xs">
                            Automatically accept location shares from this
                            friend
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            disabled={!watchAllowSharedLocation}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="defaultPermissionForLocation"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel className="text-sm">
                            Default Permission
                          </FormLabel>
                          <FormDescription className="text-xs">
                            Default permission level for shared locations
                          </FormDescription>
                        </div>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          disabled={!watchAllowSharedLocation}
                        >
                          <FormControl>
                            <SelectTrigger className="w-24">
                              <SelectValue placeholder="Select" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="view">View</SelectItem>
                            <SelectItem value="edit">Edit</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
        <div className="mt-4 flex justify-end">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Settings
          </Button>
        </div>
      </form>
    </Form>
  );
}
