import { Fragment, useState } from "react";
import { View } from "react-native";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import {
  insertRoundSchema,
  insertScoreSheetSchema,
  scoresheet,
} from "@board-games/db/schema";

import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "~/components/ui/collapsible";
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Text } from "~/components/ui/text";
import { ChevronDown } from "~/lib/icons/ChevronDown";
import { ChevronUp } from "~/lib/icons/ChevronUp";
import { Plus } from "~/lib/icons/Plus";
import { Table } from "~/lib/icons/Table";
import AddScoresheetModal from "./AddScoresheetModal";
import { Separator } from "./ui/separator";

export const scoresheetSchema = insertScoreSheetSchema
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    userId: true,
    type: true,
    gameId: true,
  })
  .required({ name: true, isCoop: true, winCondition: true });
export type ScoreSheetType = z.infer<typeof scoresheetSchema>;
export const roundsSchema = z.array(
  insertRoundSchema
    .omit({
      id: true,
      createdAt: true,
      updatedAt: true,
      scoresheetId: true,
    })
    .required({ name: true }),
);
export type RoundsType = z.infer<typeof roundsSchema>;
export function AddGame({ portalHost }: { portalHost: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Fragment>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent
          className="min-w-[400px] sm:max-w-[425px]"
          portalHost={portalHost}
        >
          <AddGameContent setIsOpen={setIsOpen} />
        </DialogContent>

        <DialogTrigger asChild>
          <Button variant="default" className="h-12 w-12 rounded-full">
            <Plus
              className="text-primary-foreground"
              size={20}
              strokeWidth={1.5}
            />
          </Button>
        </DialogTrigger>
      </Dialog>
    </Fragment>
  );
}

const gamesSchema = z
  .object({
    name: z.string().min(1, {
      message: "Game name is required",
    }),
    ownedBy: z.boolean(),
    playersMin: z.number().min(1).nullable(),
    playersMax: z.number().positive().nullable(),
    playtimeMin: z.number().min(1).positive().nullable(),
    playtimeMax: z.number().positive().nullable(),
    yearPublished: z
      .number()
      .min(1900)
      .max(new Date().getFullYear())
      .nullable(),
  })
  .superRefine((values, ctx) => {
    if (
      values.playersMin &&
      values.playersMax &&
      values.playersMin > values.playersMax
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Players min must be less than or equal to players max.",
        path: ["playersMin"],
      });
    }
    if (
      values.playtimeMin &&
      values.playtimeMax &&
      values.playtimeMin > values.playtimeMax
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Playtime min must be less than or equal to playtime max.",
        path: ["playtimeMin"],
      });
    }
  });
const formSchema = z.object({
  game: gamesSchema,
  scoresheet: scoresheetSchema.or(z.null()),
  rounds: roundsSchema,
});
function AddGameContent({
  setIsOpen,
}: {
  setIsOpen: (isOpen: boolean) => void;
}) {
  const [openScoresheetModal, setOpenScoresheetModal] = useState(false);
  const [moreOptions, setMoreOptions] = useState(false);
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      game: {
        name: "",
        playersMin: null,
        playersMax: null,
        playtimeMin: null,
        playtimeMax: null,
        yearPublished: null,
        ownedBy: false,
      },
      scoresheet: null,
      rounds: [],
    },
  });
  const onSubmit = (values: z.infer<typeof formSchema>) => {
    console.log(values);
  };

  const onChangeNumberText = (onChange: (...event: any[]) => void) => {
    return (text: string) => {
      if (text === "") {
        onChange(null);
      } else {
        onChange(parseInt(text));
      }
    };
  };
  return (
    <Fragment>
      <DialogHeader>
        <DialogTitle>Add Game</DialogTitle>
      </DialogHeader>

      <Form {...form}>
        <View className="flex flex-col gap-4">
          <FormField
            control={form.control}
            name="game.name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Game Name</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Game Name"
                    onChangeText={field.onChange}
                    value={field.value}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="game.ownedBy"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start gap-3">
                <FormLabel>Owned by</FormLabel>
                <FormControl>
                  <Checkbox
                    checked={field.value ?? false}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />
          <Collapsible open={moreOptions} onOpenChange={setMoreOptions}>
            <CollapsibleTrigger className="flex flex-row items-center gap-2">
              <Text>More options</Text>
              {moreOptions ? (
                <ChevronUp
                  className="h-4 w-4 text-foreground"
                  size={16}
                  strokeWidth={1.5}
                />
              ) : (
                <ChevronDown
                  className="h-4 w-4 text-foreground"
                  size={16}
                  strokeWidth={1.5}
                />
              )}
            </CollapsibleTrigger>

            <CollapsibleContent className="flex flex-col gap-4">
              <View className="flex flex-col gap-2 pt-4">
                {/* Players */}
                <View className="flex flex-row items-center gap-4">
                  <Label className="w-24">Players</Label>
                  <View className="flex-1">
                    <FormField
                      control={form.control}
                      name="game.playersMin"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input
                              placeholder="Min"
                              keyboardType="numeric"
                              onChangeText={onChangeNumberText(field.onChange)}
                              value={
                                field.value
                                  ? `${field.value.toString()}`
                                  : undefined
                              }
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </View>
                  <View className="flex-1">
                    <FormField
                      control={form.control}
                      name="game.playersMax"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input
                              placeholder="Max"
                              keyboardType="numeric"
                              onChangeText={onChangeNumberText(field.onChange)}
                              value={
                                field.value
                                  ? `${field.value.toString()}`
                                  : undefined
                              }
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </View>
                </View>
                {/* Error Messages for Players */}
                {(form.formState.errors.game?.playersMin ||
                  form.formState.errors.game?.playersMax) && (
                  <View className="space-y-2">
                    {form.formState.errors.game.playersMin !== undefined ? (
                      <FormMessage>
                        {form.formState.errors.game.playersMin.message}
                      </FormMessage>
                    ) : (
                      <View />
                    )}
                    {form.formState.errors.game.playersMax !== undefined ? (
                      <FormMessage>
                        {form.formState.errors.game.playersMax.message}
                      </FormMessage>
                    ) : (
                      <View />
                    )}
                  </View>
                )}

                {/* Playtime */}
                <View className="flex flex-row items-center gap-4">
                  <Label className="w-24">Playtime</Label>
                  <View className="flex-1">
                    <FormField
                      control={form.control}
                      name="game.playtimeMin"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input
                              placeholder="Min"
                              keyboardType="numeric"
                              onChangeText={onChangeNumberText(field.onChange)}
                              value={
                                field.value
                                  ? `${field.value.toString()}`
                                  : undefined
                              }
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </View>
                  <View className="flex-1">
                    <FormField
                      control={form.control}
                      name="game.playtimeMax"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input
                              placeholder="Max"
                              keyboardType="numeric"
                              onChangeText={onChangeNumberText(field.onChange)}
                              value={
                                field.value
                                  ? `${field.value.toString()}`
                                  : undefined
                              }
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </View>
                </View>
                {/* Error Messages for Playtime */}
                {(form.formState.errors.game?.playtimeMin ||
                  form.formState.errors.game?.playtimeMax) && (
                  <View className="space-y-2">
                    {form.formState.errors.game.playtimeMin !== undefined ? (
                      <FormMessage>
                        {form.formState.errors.game.playtimeMin.message}
                      </FormMessage>
                    ) : (
                      <View />
                    )}
                    {form.formState.errors.game.playtimeMax !== undefined ? (
                      <FormMessage>
                        {form.formState.errors.game.playtimeMax.message}
                      </FormMessage>
                    ) : (
                      <View />
                    )}
                  </View>
                )}

                {/* Year Published */}
                <View className="flex flex-row items-center gap-4">
                  <Label className="w-24">Year Published</Label>
                  <View className="flex-1">
                    <FormField
                      control={form.control}
                      name="game.yearPublished"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input
                              placeholder="Year Published"
                              keyboardType="numeric"
                              onChangeText={onChangeNumberText(field.onChange)}
                              value={
                                field.value
                                  ? `${field.value.toString()}`
                                  : undefined
                              }
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </View>
                </View>
                {/* Error Message for Year Published */}
                {form.formState.errors.game?.yearPublished && (
                  <FormMessage>
                    {form.formState.errors.game.yearPublished.message}
                  </FormMessage>
                )}
              </View>
              <Separator className="w-full" orientation="horizontal" />
              <View className="flex flex-col">
                <View className="flex flex-row items-center justify-between">
                  <Text className="text-xl font-semibold">Scoresheet</Text>
                  <Button
                    variant="default"
                    onPress={() => {
                      setOpenScoresheetModal(true);
                    }}
                  >
                    <Text>
                      {scoresheet === null ? "Create New" : "Edit Sheet"}
                    </Text>
                  </Button>
                </View>
                <Button
                  variant="ghost"
                  size="lg"
                  className="flex flex-row items-center justify-between gap-2"
                  onPress={() => {
                    setOpenScoresheetModal(true);
                  }}
                >
                  <Table className="text-primary" size={30} strokeWidth={1.5} />
                  <View className="flex flex-grow flex-col items-start justify-start">
                    <Text className="text-lg">
                      {form.getValues("scoresheet")?.name ?? "Default"}
                    </Text>
                    <View className="mb-2 flex w-full flex-row items-center gap-3 text-sm">
                      <View className="flex min-w-20 flex-row items-center gap-1">
                        <Text>Win Condition:</Text>
                        <Text className="text-sm text-muted-foreground">
                          {form.getValues("scoresheet")?.winCondition ??
                            "Highest Score"}
                        </Text>
                      </View>
                      <Separator
                        orientation="vertical"
                        className="font-semi-bold h-4"
                      />
                      <View className="flex min-w-20 flex-row items-center gap-1">
                        <Text>Rounds:</Text>
                        <Text className="text-sm text-muted-foreground">
                          {form.getValues("scoresheet") !== null
                            ? (form.getValues("rounds").length ?? "1")
                            : "1"}
                        </Text>
                      </View>
                    </View>
                  </View>
                </Button>
              </View>
            </CollapsibleContent>
          </Collapsible>
        </View>
        <DialogFooter className="gap-2">
          <Button variant="secondary" onPress={() => setIsOpen(false)}>
            <Text>Cancel</Text>
          </Button>
          <Button onPress={form.handleSubmit(onSubmit)}>
            <Text>Submit</Text>
          </Button>
        </DialogFooter>
      </Form>
      <AddScoresheetModal
        isModalVisible={openScoresheetModal}
        setModalVisible={setOpenScoresheetModal}
        scoresheet={form.getValues("scoresheet")}
        rounds={form.getValues("rounds")}
        setScoresheet={(value: ScoreSheetType | null) =>
          form.setValue("scoresheet", value)
        }
        setRounds={(value: RoundsType) => form.setValue("rounds", value)}
      />
    </Fragment>
  );
}
