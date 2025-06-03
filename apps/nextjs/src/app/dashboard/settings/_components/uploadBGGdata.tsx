"use client";

import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useMutation } from "@tanstack/react-query";
import { FileJson, Upload } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod/v4";

import { Button } from "@board-games/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@board-games/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@board-games/ui/form";

import { useTRPC } from "~/trpc/react";

export interface JsonData {
  challenges: unknown[];
  deletedObjects: DeletedObject[];
  games: Game[];
  groups: Group[];
  locations: Location[];
  players: Player[];
  plays: Play[];
  tags: unknown[];
  userInfo: UserInfo;
}
export interface DeletedObject {
  deletionSource?: string;
  modificationDate: string;
  objectType: string;
  uuid: string;
  externalId?: number;
}

export interface Game {
  bggId: number;
  bggName: string;
  bggYear: number;
  cooperative: boolean;
  copies: Copy[];
  designers: string;
  highestWins: boolean;
  id: number;
  isBaseGame: number;
  isExpansion: number;
  maxPlayerCount: number;
  maxPlayTime: number;
  metaData?: string;
  minAge: number;
  minPlayerCount: number;
  minPlayTime: number;
  modificationDate: string;
  name: string;
  noPoints: boolean;
  preferredImage: number;
  previouslyPlayedAmount: number;
  rating: number;
  urlImage: string;
  urlThumb: string;
  usesTeams: boolean;
  uuid: string;
}

export interface Copy {
  bggCollId: number;
  bggUserName: string;
  bggVersionId: number;
  metaData: string;
  modificationDate: string;
  statusForTrade: number;
  statusOwned: number;
  statusPreordered: number;
  statusPrevOwned: number;
  statusWantInTrade: number;
  statusWantToBuy: number;
  statusWantToPlay: number;
  statusWishlist: number;
  urlImage: string;
  urlThumb: string;
  uuid: string;
  wishlistStatus: number;
  year: number;
  versionName?: string;
  gameName?: string;
}

export interface Group {
  isDefault: boolean;
  isInternal: boolean;
  metaData?: string;
  modificationDate: string;
  name: string;
  type: string;
  uuid: string;
}

export interface Location {
  id: number;
  modificationDate: string;
  name: string;
  uuid: string;
}

export interface Player {
  bggUsername?: string;
  id: number;
  isAnonymous: boolean;
  metaData?: string;
  modificationDate: string;
  name: string;
  uuid: string;
}

export interface Play {
  bggId: number;
  bggLastSync?: string;
  durationMin: number;
  entryDate: string;
  expansionPlays: ExpansionPlay[];
  gameRefId: number;
  ignored: boolean;
  importPlayId: number;
  locationRefId: number;
  manualWinner: boolean;
  metaData?: string;
  modificationDate: string;
  nemestatsId: number;
  playDate: string;
  playDateYmd: number;
  playerScores: PlayerScore[];
  playImages: string;
  rating: number;
  rounds: number;
  scoringSetting: number;
  usesTeams: boolean;
  uuid: string;
  comments?: string;
}

export interface ExpansionPlay {
  bggId: number;
  gameRefId: number;
}

export interface PlayerScore {
  newPlayer: boolean;
  playerRefId: number;
  rank: number;
  score: string;
  seatOrder: number;
  startPlayer: boolean;
  winner: boolean;
  team?: string;
  role?: string;
}

export interface UserInfo {
  appVersion: string;
  bggUsername: string;
  device: string;
  exportDate: string;
  meRefId: number;
  systemVersion: string;
}

const formSchema = z.object({
  jsonFile: z.instanceof(File).refine((file) => file.name.endsWith(".json"), {
    message: "File must be a JSON file",
  }),
});

type FormValues = z.infer<typeof formSchema>;

export default function UploadBGGdata() {
  const trpc = useTRPC();
  const uploadJson = useMutation(trpc.game.insertGames.mutationOptions());
  const form = useForm<FormValues>({
    resolver: standardSchemaResolver(formSchema),
    defaultValues: {
      jsonFile: undefined,
    },
  });

  async function onSubmit(values: FormValues) {
    try {
      const fileContent = await values.jsonFile.text();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const parsedJson: JsonData = JSON.parse(fileContent);
      uploadJson.mutate({
        games: parsedJson.games,
        plays: parsedJson.plays,
        players: parsedJson.players,
        locations: parsedJson.locations,
      });
    } catch (err) {
      console.error("Error parsing JSON:", err);
    }
  }

  return (
    <Card className="mx-auto w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileJson className="h-5 w-5" />
          JSON File Upload
        </CardTitle>
        <CardDescription>
          Upload a JSON file to log its contents to the console
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="jsonFile"
              render={({ field: { onChange, value, ...rest } }) => (
                <FormItem>
                  <FormLabel>JSON File</FormLabel>
                  <FormControl>
                    <div className="grid w-full gap-2">
                      <label
                        htmlFor="json-file"
                        className="flex h-32 w-full cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed border-muted-foreground/25 hover:border-muted-foreground/50"
                      >
                        <div className="flex flex-col items-center justify-center pb-6 pt-5">
                          <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
                          <p className="mb-1 text-sm text-muted-foreground">
                            <span className="font-semibold">
                              Click to upload
                            </span>{" "}
                            or drag and drop
                          </p>
                          <p className="text-xs text-muted-foreground">
                            JSON files only
                          </p>
                        </div>
                        <input
                          id="json-file"
                          type="file"
                          accept=".json"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              onChange(file);
                            }
                          }}
                          {...rest}
                        />
                      </label>
                      {
                        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
                        value && (
                          <p className="text-sm text-muted-foreground">
                            Selected file:{" "}
                            {value instanceof File ? value.name : ""}
                          </p>
                        )
                      }
                    </div>
                  </FormControl>
                  <FormDescription>
                    Upload a valid JSON file to process
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full">
              Upload and Process
            </Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="text-xs text-muted-foreground">
        The JSON content will be logged to the browser console
      </CardFooter>
    </Card>
  );
}
