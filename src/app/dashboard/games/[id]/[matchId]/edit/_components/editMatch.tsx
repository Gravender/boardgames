"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { format, isSameDay } from "date-fns";
import { CalendarIcon, PlusIcon, Trash, User } from "lucide-react";
import { useFieldArray, useForm, UseFormReturn } from "react-hook-form";
import { z } from "zod";

import { Spinner } from "~/components/spinner";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import { Calendar } from "~/components/ui/calendar";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Checkbox } from "~/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { useToast } from "~/hooks/use-toast";
import { cn } from "~/lib/utils";
import { insertMatchSchema, insertPlayerSchema } from "~/server/db/schema";
import { api, RouterOutputs } from "~/trpc/react";
import { useUploadThing } from "~/utils/uploadthing";

const playerSchema = insertPlayerSchema
  .pick({ name: true, id: true })
  .required({ name: true, id: true })
  .extend({
    imageUrl: z
      .string()
      .or(
        z
          .instanceof(File)
          .refine((file) => file.size <= 4000000, `Max image size is 4MB.`)
          .refine(
            (file) => file.type === "image/jpeg" || file.type === "image/png",
            "Only .jpg and .png formats are supported.",
          )
          .nullable(),
      )
      .optional(),
    matches: z.number(),
  });
const matchSchema = insertMatchSchema
  .pick({
    name: true,
    date: true,
  })
  .required({ name: true, date: true })
  .extend({
    players: z
      .array(playerSchema.extend({ playerId: z.number().optional() }))
      .refine((players) => players.length > 0, {
        message: "You must add at least one player",
      }),
  });
type addedPlayers = {
  id: number;
  name: string;
  imageUrl: string;
  matches: number;
}[];
export function EditMatchForm({
  match,
  players,
}: {
  match: RouterOutputs["match"]["getMatch"];
  players: RouterOutputs["player"]["getPlayersByGame"];
}) {
  const { startUpload } = useUploadThing("imageUploader");
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const utils = api.useUtils();
  const router = useRouter();
  const [addedPlayers, setAddedPlayers] = useState<addedPlayers>([]);
  const form = useForm<z.infer<typeof matchSchema>>({
    resolver: zodResolver(matchSchema),
    defaultValues: {
      name: match.name,
      date: match.date,
      players: match.players.map((player) => ({
        id: player.id,
        name: player.name,
        imageUrl: player.imageUrl ?? "",
        matches: Number(players.find((p) => p.id === player.id)?.matches ?? 0),
        playerId: player.playerId,
      })),
    },
  });
  const editMatch = api.match.editMatch.useMutation({
    onSuccess: async () => {
      await utils.player.getPlayersByGame.invalidate({
        game: { id: match.gameId },
      });
      await utils.game.getGame.invalidate({ id: match.gameId });
      await utils.match.getMatch.invalidate({ id: match.id });
      router.push(`/dashboard/games/${match.gameId}/${match.id}`);
      form.reset();
      setIsSubmitting(false);
    },
  });
  const onSubmit = async (values: z.infer<typeof matchSchema>) => {
    setIsSubmitting(true);
    const playersToRemove = match.players.filter(
      (player) =>
        values.players.findIndex(
          (p) => p.playerId && p.playerId === player.playerId,
        ) === -1,
    );
    const playersToAdd = values.players.filter(
      (player) => player.playerId === undefined && player.matches !== -1,
    );
    const newPlayers = values.players.filter((player) => player.matches === -1);
    try {
      const newPlayersWithImage = await Promise.all(
        newPlayers.map(async (player) => {
          let imageId: number | null = null;
          if (!player.imageUrl || typeof player.imageUrl === "string")
            return {
              id: -1,
              name: player.name,
              imageId: null,
            };
          const imageFile = player.imageUrl;

          const uploadResult = await startUpload([imageFile]);
          if (!uploadResult) {
            throw new Error("Image upload failed");
          }
          imageId = uploadResult[0] ? uploadResult[0].serverData.imageId : null;

          return {
            id: -1,
            name: player.name,
            imageId: imageId,
          };
        }),
      );
      editMatch.mutate({
        match: {
          id: match.id,
          scoresheetId: match.scoresheet.id,
          name: values.name === match.name ? undefined : values.name,
          date:
            values.date.getTime() === match.date.getTime()
              ? undefined
              : values.date,
        },
        addPlayers: playersToAdd.map((player) => ({ id: player.id })),
        removePlayers: playersToRemove.map((player) => ({
          id: player.playerId,
        })),
        newPlayers: newPlayersWithImage.map((player) => ({
          name: player.name,
          imageId: player.imageId,
        })),
      });
    } catch (error) {
      console.error("Error uploading Image:", error);
      toast({
        title: "Error",
        description: "There was a problem uploading your Image.",
        variant: "destructive",
      });
    }
  };
  return (
    <Card className="max-w-xl w-full">
      <CardHeader>
        <CardTitle>Edit {match.name}</CardTitle>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <CardContent className="gap-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Match Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Match name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex gap-2 justify-between w-full items-end">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Date</FormLabel>
                    <Popover modal={true}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-[240px] pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground",
                            )}
                            type="button"
                          >
                            {field.value ? (
                              isSameDay(field.value, new Date()) ? (
                                <span>Today</span>
                              ) : (
                                format(field.value, "PPP")
                              )
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date > new Date() || date < new Date("1900-01-01")
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <AddPlayersDialog
                form={form}
                players={players.map((player) => ({
                  id: player.id,
                  name: player.name,
                  imageUrl: player.imageUrl,
                  matches: Number(player.matches),
                }))}
                addedPlayers={addedPlayers}
                setAddedPlayers={setAddedPlayers}
                data={match.players.map((player) => ({
                  id: player.id,
                  name: player.name,
                  imageUrl: player.imageUrl ?? "",
                  matches: Number(
                    players.find((p) => p.id === player.id)?.matches ?? 0,
                  ),
                }))}
              />
            </div>
          </CardContent>

          <CardFooter className="gap-2 justify-end">
            <Button
              type="reset"
              variant="secondary"
              onClick={() => {
                router.back();
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Spinner />
                  <span>Submitting...</span>
                </>
              ) : (
                "Submit"
              )}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}

const AddPlayersDialog = ({
  form,
  players,
  addedPlayers,
  setAddedPlayers,
  data,
}: {
  form: UseFormReturn<z.infer<typeof matchSchema>>;
  data: RouterOutputs["player"]["getPlayersByGame"];
  players: RouterOutputs["player"]["getPlayersByGame"];
  addedPlayers: addedPlayers;
  setAddedPlayers: (players: addedPlayers) => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[465px] min-h-80">
        <PlayersContent
          setOpen={setIsOpen}
          form={form}
          players={players}
          addedPlayers={addedPlayers}
          setAddedPlayers={setAddedPlayers}
          data={data}
        />
      </DialogContent>
      <DialogTrigger asChild>
        <Button variant="default" type="button">
          {`${form.getValues("players").length} Players`}
        </Button>
      </DialogTrigger>
    </Dialog>
  );
};

const PlayersContent = ({
  setOpen,
  form,
  players,
  addedPlayers,
  setAddedPlayers,
  data,
}: {
  setOpen: (isOpen: boolean) => void;
  form: UseFormReturn<z.infer<typeof matchSchema>>;
  players: RouterOutputs["player"]["getPlayersByGame"];
  addedPlayers: addedPlayers;
  setAddedPlayers: (players: addedPlayers) => void;
  data: RouterOutputs["player"]["getPlayersByGame"];
}) => {
  return (
    <>
      <DialogHeader>
        <DialogTitle>Select Players</DialogTitle>
      </DialogHeader>
      <div className="flex flex-col gap-2 max-h-96 overflow-auto">
        <FormField
          control={form.control}
          name="players"
          render={() => (
            <FormItem>
              <div className="mb-4">
                <FormLabel className="hidden">Players</FormLabel>
                <FormDescription className="hidden">
                  Select the players for the match
                </FormDescription>
              </div>
              {[...players, ...addedPlayers].map((player) => (
                <FormField
                  key={player.id}
                  control={form.control}
                  name="players"
                  render={({ field }) => {
                    return (
                      <FormItem
                        key={player.id}
                        className={cn(
                          "flex flex-row space-x-3 space-y-0 items-center p-2 rounded-sm",
                          form
                            .getValues("players")
                            .findIndex((i) =>
                              i.playerId
                                ? i.playerId === player.id
                                : i.id === player.id,
                            ) > -1
                            ? "bg-violet-400"
                            : "bg-border",
                        )}
                      >
                        <FormControl>
                          <Checkbox
                            className="hidden"
                            checked={
                              form
                                .getValues("players")
                                .findIndex((i) =>
                                  i.playerId
                                    ? i.playerId === player.id
                                    : i.id === player.id,
                                ) > -1
                            }
                            onCheckedChange={(checked) => {
                              return checked
                                ? field.onChange([...field.value, player])
                                : field.onChange(
                                    field.value?.filter((value) =>
                                      value.playerId
                                        ? value.playerId !== player.id
                                        : value.id !== player.id,
                                    ),
                                  );
                            }}
                          />
                        </FormControl>
                        <FormLabel className="text-sm font-normal flex items-center gap-2 w-full justify-between">
                          <div className="flex items-center gap-2">
                            <Avatar>
                              <AvatarImage
                                src={player.imageUrl}
                                alt={player.name}
                              />
                              <AvatarFallback className="bg-slate-300">
                                <User />
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-lg font-semibold">
                              {player.name}
                            </span>
                          </div>
                          {player.matches > -1 && (
                            <div className="w-10 h-10 rounded-sm bg-background flex items-center justify-center">
                              {player.matches}
                            </div>
                          )}
                        </FormLabel>
                        {player.matches < 0 && (
                          <div className="flex items-center justify-center">
                            <Button
                              variant="destructive"
                              size="icon"
                              type="button"
                              onClick={() => {
                                const index = addedPlayers.findIndex(
                                  (p) => p.id === player.id,
                                );
                                if (index > -1) {
                                  setAddedPlayers(
                                    addedPlayers.filter(
                                      (p) => p.id !== player.id,
                                    ),
                                  );
                                  field.onChange(
                                    field.value?.filter((value) =>
                                      value.playerId
                                        ? value.playerId !== player.id
                                        : value.id !== player.id,
                                    ),
                                  );
                                }
                              }}
                            >
                              <Trash />
                            </Button>
                          </div>
                        )}
                      </FormItem>
                    );
                  }}
                />
              ))}
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      <AddPlayerDialog
        form={form}
        addedPlayers={addedPlayers}
        setAddedPlayers={setAddedPlayers}
      />
      <DialogFooter className="gap-2">
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            form.setValue("players", data);
            setOpen(false);
          }}
        >
          Cancel
        </Button>
        <Button
          type="button"
          onClick={() => {
            setOpen(false);
          }}
        >
          Save
        </Button>
      </DialogFooter>
    </>
  );
};

const AddPlayerDialog = ({
  form,
  addedPlayers,
  setAddedPlayers,
}: {
  form: UseFormReturn<z.infer<typeof matchSchema>>;
  addedPlayers: addedPlayers;
  setAddedPlayers: (players: addedPlayers) => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[465px] min-h-80">
        <PlayerContent
          setOpen={setIsOpen}
          form={form}
          addedPlayers={addedPlayers}
          setAddedPlayers={setAddedPlayers}
        />
      </DialogContent>
      <DialogTrigger asChild>
        <Button variant="secondary" type="button">
          <PlusIcon />
          <span>Player</span>
        </Button>
      </DialogTrigger>
    </Dialog>
  );
};

const PlayerContent = ({
  setOpen,
  form,
  addedPlayers,
  setAddedPlayers,
}: {
  setOpen: (isOpen: boolean) => void;
  form: UseFormReturn<z.infer<typeof matchSchema>>;
  addedPlayers: addedPlayers;
  setAddedPlayers: (players: addedPlayers) => void;
}) => {
  const { append } = useFieldArray({
    name: "players",
    control: form.control,
  });
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [image, setImage] = useState<{ preview: string; file: File } | null>(
    null,
  );

  useEffect(() => {
    return () => {
      if (image) {
        URL.revokeObjectURL(image.preview);
      }
    };
  }, [image]);

  return (
    <>
      <DialogHeader>
        <DialogTitle>Add Player</DialogTitle>
      </DialogHeader>
      <div className="flex items-center gap-2 w-full">
        <Label htmlFor="player-name">Name:</Label>
        <Input
          placeholder="Player name"
          value={name}
          id="player-name"
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div className="flex items-center space-x-4">
        <div className="relative flex shrink-0 overflow-hidden rounded-full h-20 w-20">
          {image ? (
            <Image
              src={image.preview}
              alt="Player image"
              className="rounded-sm aspect-square h-full w-full"
              fill
            />
          ) : (
            <User className="h-full w-full p-2 items-center justify-center bg-muted rounded-full" />
          )}
        </div>
        <div>
          <Label
            className="h-10 px-4 py-2 inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 bg-primary text-primary-foreground hover:bg-primary/90"
            htmlFor="player-image"
          >
            Custom Image
          </Label>
          <Input
            type="file"
            accept="image/*"
            id="player-image"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                const fileTypes = ["image/jpeg", "image/png"];
                const maxFileSize = 4 * 1024 * 1024; // 4MB in bytes
                if (!fileTypes.includes(file.type)) {
                  setError("Only .jpg and .png formats are supported.");
                  return;
                }
                if (file.size > maxFileSize) {
                  setError("Max image size is 4MB.");
                  return;
                }
                setError(null);
                const url = URL.createObjectURL(file);
                setImage({ preview: url, file: file });
              }
            }}
          />
        </div>
      </div>
      {error && <p className="text-sm font-medium text-destructive">{error}</p>}
      <DialogFooter className="gap-2">
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            setOpen(false);
          }}
        >
          Cancel
        </Button>
        <Button
          type="button"
          onClick={() => {
            append({
              id: addedPlayers.length + 100000,
              name: name,
              imageUrl: image?.file ?? null,
              matches: -1,
            });
            setAddedPlayers([
              ...addedPlayers,
              {
                id: addedPlayers.length + 100000,
                name: name,
                imageUrl: image?.preview ?? "",
                matches: -1,
              },
            ]);

            setOpen(false);
          }}
        >
          Save
        </Button>
      </DialogFooter>
    </>
  );
};
