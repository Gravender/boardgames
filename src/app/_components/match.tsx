"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { ListPlus, Plus } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { GradientPicker } from "~/components/color-picker";
import { Spinner } from "~/components/spinner";
import { Button } from "~/components/ui/button";
import { Card, CardHeader, CardTitle } from "~/components/ui/card";
import { Checkbox } from "~/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { cn } from "~/lib/utils";
import { insertRoundSchema } from "~/server/db/schema/round";
import { api, RouterOutputs } from "~/trpc/react";

type Match = NonNullable<RouterOutputs["match"]["getMatch"]>;
export function Match({ match }: { match: Match }) {
  const [players, setPlayers] = useState(() => [...match.players]);
  const utils = api.useUtils();
  const updateMatch = api.match.updateMatch.useMutation({
    onSuccess: async () => {
      await utils.match.getMatch.invalidate({ id: match.id });
    },
  });
  //turn into form
  const onSubmit = () => {
    const winner = players.reduce<{
      id: Match["players"][number]["id"];
      score: number;
    }>(
      (prev, current) => {
        const temp = {
          id: current.id,
          score: current.rounds.reduce((acc, round) => {
            return acc + (round.score ?? 0);
          }, 0),
        };
        if (match.scoresheet.winCondition === "Highest Score") {
          return prev && (prev.score ?? 0) > (temp.score ?? -Infinity)
            ? prev
            : temp;
        }
        if (match.scoresheet.winCondition === "Lowest Score") {
          return prev && (prev.score ?? 0) < (temp.score ?? Infinity)
            ? prev
            : temp;
        }
        if (match.scoresheet.winCondition === "No Winner") {
          return { id: -1, score: -Infinity };
        }
        if (match.scoresheet.winCondition === "Manual") {
          return { id: -1, score: 0 };
        }
        if (match.scoresheet.winCondition === "Target Score") {
          return { id: -1, score: 0 };
        }
        return prev && (prev.score ?? 0) > (temp.score ?? -Infinity)
          ? prev
          : temp;
      },
      {
        id: players[0]?.id ?? -1,
        score:
          players[0]?.score ??
          (match.scoresheet.winCondition === "Highest Score"
            ? -Infinity
            : Infinity),
      },
    );
    updateMatch.mutate({
      roundPlayers: players.flatMap((player) =>
        player.rounds.map((round) => ({
          id: round.id,
          score: round.score,
          roundId: round.id,
          matchPlayerId: player.id,
        })),
      ),
      matchPlayers: players.map((player) => {
        const score = player.rounds.reduce((acc, round) => {
          return acc + (round.score ?? 0);
        }, 0);
        //TODO: need to add target score for scoresheet
        const matchWinner = winner.score === score;
        return {
          id: player.id,
          score,
          winner: matchWinner,
        };
      }),
    });
  };
  useEffect(() => {
    return () => {
      onSubmit();
    };
  }, []);
  return (
    <div className="px-4">
      <CardHeader>
        <CardTitle>{`${match.scoresheet.name} Scoresheet`}</CardTitle>
      </CardHeader>
      <Card>
        <Table>
          <>
            <TableHeader>
              <TableRow>
                <TableHead scope="col" className="sm:w-36 w-20">
                  <div>
                    <AddRoundDialog match={match} />
                  </div>
                </TableHead>
                {players.map((player) => (
                  <TableHead
                    className="text-center"
                    scope="col"
                    key={player.id}
                  >
                    {player.name}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {match.scoresheet.rounds.map((round, index) => (
                <TableRow key={`round-${round.id}`}>
                  <TableHead
                    scope="row"
                    className={cn(
                      "sm:text-lg font-semibold text-muted-foreground",
                      round.color &&
                        "text-slate-600 hover:opacity-50 hover:dark:opacity-80",
                    )}
                    style={{
                      backgroundColor: round.color ?? "",
                    }}
                  >
                    {round.name}
                  </TableHead>
                  {players.map((player, playerIndex) => {
                    const roundPlayer = player.rounds[index];

                    return (
                      <TableCell key={`player-${player.id}-round-${round.id}`}>
                        {round.type === "Numeric" ? (
                          <Input
                            type="number"
                            className="text-center"
                            value={roundPlayer?.score ?? 0}
                            onChange={(e) => {
                              const score = Number(e.target.value);
                              const temp = [...players];
                              temp[playerIndex]!.rounds[index]!.score = score;
                              setPlayers(temp);
                            }}
                          />
                        ) : (
                          <div className="flex items-center justify-center">
                            <Label className="hidden">{`Checkbox to toggle score: ${round.score}`}</Label>
                            <Checkbox
                              value={roundPlayer?.score ?? 0}
                              onCheckedChange={(isChecked) => {
                                const temp = [...players];
                                temp[playerIndex]!.rounds[index]!.score =
                                  isChecked ? round.score : 0;
                                setPlayers(temp);
                              }}
                            />
                          </div>
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableHead
                  scope="row"
                  className="sm:text-lg font-semibold text-muted-foreground"
                >
                  Total
                </TableHead>
                {players.map((player, index) => {
                  if (match.scoresheet.roundsScore === "Manual") {
                    return (
                      <TableCell key={`${player.id}-total`}>
                        <Input
                          type="number"
                          className="text-center"
                          value={player?.score ?? 0}
                          onChange={(e) => {
                            const score = Number(e.target.value);
                            const temp = [...players];
                            temp[index]!.score = score;
                            setPlayers(temp);
                          }}
                        />
                      </TableCell>
                    );
                  }
                  const total = player.rounds.reduce((acc, round) => {
                    if (match.scoresheet.roundsScore === "Aggregate") {
                      return acc + (round.score ?? 0);
                    }
                    if (match.scoresheet.roundsScore === "Best Of") {
                      return acc > (round.score ?? 0)
                        ? acc
                        : (round.score ?? 0);
                    }
                    return acc;
                  }, 0);
                  return (
                    <TableCell key={`${player.id}-total`}>
                      <div className="flex items-center justify-center">
                        {total}
                      </div>
                    </TableCell>
                  );
                })}
              </TableRow>
            </TableFooter>
          </>
        </Table>
      </Card>
      <Button onClick={onSubmit}>Submit</Button>
    </div>
  );
}

const AddRoundDialog = ({ match }: { match: Match }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <AddRoundDialogContent match={match} setOpen={setIsOpen} />
      </DialogContent>
      <Button
        variant="ghost"
        size="icon"
        type="button"
        onClick={() => setIsOpen(true)}
      >
        <ListPlus className="text-secondary-foreground" />
      </Button>
    </Dialog>
  );
};

const RoundSchema = insertRoundSchema.pick({
  name: true,
  type: true,
  color: true,
  score: true,
});
const AddRoundDialogContent = ({
  match,
  setOpen,
}: {
  match: Match;
  setOpen: (isOpen: boolean) => void;
}) => {
  const utils = api.useUtils();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof RoundSchema>>({
    resolver: zodResolver(RoundSchema),
    defaultValues: {
      name: `Round #${(match.players[0]?.rounds.length ?? 0) + 1}`,
      type: "Numeric",
      color: "#E2E2E2",
      score: 0,
    },
  });

  const addRound = api.round.addRound.useMutation({
    onSuccess: async () => {
      setIsSubmitting(false);
      await utils.match.getMatch.invalidate({ id: match.id });
      router.refresh();
      setOpen(false);
      form.reset();
    },
  });
  function onSubmitForm(values: z.infer<typeof RoundSchema>) {
    setIsSubmitting(true);
    addRound.mutate({
      round: {
        ...values,
        scoresheetId: match.scoresheet.id,
      },
      players: match.players.map((player) => ({
        matchPlayerId: player.id,
      })),
    });
  }

  const roundsTypeOptions = insertRoundSchema.required().pick({ type: true })
    .shape.type.options;
  return (
    <>
      <DialogHeader>
        <DialogTitle>Add Round</DialogTitle>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmitForm)} className="space-y-8">
          <div className="flex gap-2 items-center w- full">
            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="hidden">Round Color</FormLabel>
                  <FormControl>
                    <GradientPicker
                      color={field.value ?? null}
                      setColor={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem className="space-y-0 flex flex-grow">
                  <FormLabel className="hidden">Round Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Round name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="flex gap-4 items-center w-ull">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem className="w-28">
                  <FormLabel>Scoring Type</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a win condition" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {roundsTypeOptions.map((condition) => (
                        <SelectItem key={condition} value={condition}>
                          {condition}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            {form.getValues("type") === "Checkbox" && (
              <FormField
                control={form.control}
                name={"score"}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Score</FormLabel>

                    <FormControl>
                      <Input
                        {...field}
                        onChange={(event) =>
                          field.onChange(+event.target.value)
                        }
                        type="number"
                        className="text-center"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button
              type="reset"
              variant="secondary"
              onClick={() => {
                form.reset();
                setOpen(false);
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
          </DialogFooter>
        </form>
      </Form>
    </>
  );
};
