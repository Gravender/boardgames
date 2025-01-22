import React, { useState } from "react";
import { Platform, View } from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import Modal from "react-native-modal";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FullWindowOverlay } from "react-native-screens";
import { zodResolver } from "@hookform/resolvers/zod";
import { PortalHost } from "@rn-primitives/portal";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";

import {
  insertRoundSchema,
  insertScoreSheetSchema,
} from "@board-games/db/schema";

import { Copy } from "~/lib/icons/Copy";
import { Minus } from "~/lib/icons/Minus";
import { Plus } from "~/lib/icons/Plus";
import { Trash } from "~/lib/icons/Trash";
import {
  roundsSchema,
  RoundsType,
  scoresheetSchema,
  ScoreSheetType,
} from "./AddGame";
import { Button } from "./ui/button";
import { CardContent, CardFooter, CardHeader, CardTitle } from "./ui/card";
import { Checkbox } from "./ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "./ui/form";
import { Input } from "./ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Separator } from "./ui/separator";
import { Text } from "./ui/text";

const CUSTOM_PORTAL_HOST_NAME = "modal-Select";
const WindowOverlay =
  Platform.OS === "ios" ? FullWindowOverlay : React.Fragment;

const formSchema = z.object({
  scoresheet: scoresheetSchema,
  rounds: roundsSchema,
});

type FormSchemaType = z.infer<typeof formSchema>;

export default function AddScoresheetModal({
  isModalVisible,
  setModalVisible,
  scoresheet,
  setScoresheet,
  rounds,
  setRounds,
}: {
  isModalVisible: boolean;
  setModalVisible: (isModalVisible: boolean) => void;
  scoresheet: ScoreSheetType | null;
  setScoresheet: (scoresheet: ScoreSheetType | null) => void;
  rounds: RoundsType;
  setRounds: (rounds: RoundsType) => void;
}) {
  const insets = useSafeAreaInsets();
  const contentInsets = {
    top: insets.top,
    bottom: insets.bottom,
    left: 16,
    right: 16,
  };

  const form = useForm<FormSchemaType>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      scoresheet: scoresheet
        ? scoresheet
        : {
            name: "Default",
            winCondition: "Highest Score",
            isCoop: false,
            roundsScore: "Aggregate",
            targetScore: 0,
          },
      rounds:
        rounds.length > 0
          ? rounds
          : [
              {
                name: "Round 1",
                type: "Numeric",
                color: "#E2E2E2",
                score: 0,
                order: 0,
              },
            ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "rounds",
  });

  const onSubmit = (data: FormSchemaType) => {
    setRounds(data.rounds);
    setScoresheet(data.scoresheet);
    setModalVisible(false);
  };
  const conditions = insertScoreSheetSchema
    .required()
    .pick({ winCondition: true }).shape.winCondition.options;
  const roundsScoreOptions = insertScoreSheetSchema
    .required()
    .pick({ roundsScore: true }).shape.roundsScore.options;

  return (
    <Modal
      isVisible={isModalVisible}
      onBackdropPress={() => setModalVisible(false)}
      animationIn="fadeIn"
      animationOut="fadeOut"
      // Make sure we push it to the right side
      style={{
        margin: 0, // no outer margin
        justifyContent: "flex-end",
        alignItems: "flex-end",
      }}
    >
      <View className="h-full w-full bg-card">
        <CardHeader>
          <CardTitle>Add Scoresheet</CardTitle>
        </CardHeader>

        <Form {...form}>
          <CardContent className="flex flex-col gap-4">
            <FormField
              control={form.control}
              name="scoresheet.name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sheet Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Sheet Name"
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
              name="scoresheet.isCoop"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start gap-3">
                  <FormLabel>Is Co-op?</FormLabel>
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="scoresheet.winCondition"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Win Condition</FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(value?.value)}
                    defaultValue={{ value: field.value, label: field.value }}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a win condition" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent
                      insets={contentInsets}
                      className="w-full"
                      portalHost={CUSTOM_PORTAL_HOST_NAME}
                    >
                      {conditions.map((condition) => (
                        <SelectItem
                          key={condition}
                          label={condition}
                          value={condition}
                        >
                          {condition}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {form.getValues("scoresheet.winCondition") === "Target Score" && (
              <FormField
                control={form.control}
                name="scoresheet.targetScore"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target Score</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Target Score"
                        keyboardType="numeric"
                        onChangeText={(text) => field.onChange(Number(text))}
                        value={field.value?.toString()}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <FormField
              control={form.control}
              name="scoresheet.roundsScore"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Scoring Method</FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(value?.value)}
                    defaultValue={{
                      value: field.value ?? "Aggregate",
                      label: field.value ?? "Aggregate",
                    }}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a win condition" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent
                      insets={contentInsets}
                      className="w-full"
                      portalHost={CUSTOM_PORTAL_HOST_NAME}
                    >
                      {roundsScoreOptions.map((condition) => (
                        <SelectItem
                          key={condition}
                          label={condition}
                          value={condition}
                        >
                          {condition}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Separator className="w-full" orientation="horizontal" />
            {/* Rounds */}
            <View>
              <Text>Rounds</Text>
              <ScrollView className="flex max-h-96 flex-col gap-2">
                {fields.map((field, index) => (
                  <View
                    key={field.id}
                    className="flex flex-row items-center justify-between gap-2"
                  >
                    <View className="flex flex-row items-center gap-2">
                      <FormField
                        control={form.control}
                        name={`rounds.${index}.name`}
                        render={({ field }) => (
                          <FormItem className="min-w-28 space-y-0">
                            <FormLabel className="hidden">Round Name</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Round Name"
                                onChangeText={field.onChange}
                                value={field.value}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </View>
                    <View className="flex flex-row items-center gap-2">
                      <Button
                        variant="secondary"
                        size="icon"
                        onPress={() => {
                          const round = form.getValues("rounds")[index];
                          append({
                            ...field,
                            name: `Round ${fields.length + 1}`,
                            type: round?.type ?? "Numeric",
                            score: round?.score,
                            order: fields.length + 1,
                          });
                        }}
                      >
                        <Copy
                          className="text-primary"
                          size={20}
                          strokeWidth={1.5}
                        />
                      </Button>
                      <Button
                        size="icon"
                        onPress={() => remove(index)}
                        variant="destructive"
                      >
                        <Trash
                          className="text-primary-foreground"
                          size={20}
                          strokeWidth={1.5}
                        />
                      </Button>
                    </View>
                  </View>
                ))}
              </ScrollView>
              <View className="flex flex-row items-center justify-end gap-2">
                <Button
                  variant="secondary"
                  size="icon"
                  onPress={() =>
                    append({
                      name: `Round ${fields.length + 1}`,
                      type: "Numeric",
                      score: 0,
                      color: "#E2E2E2",
                      order: fields.length + 1,
                    })
                  }
                >
                  <Plus className="text-primary" size={20} strokeWidth={1.5} />
                </Button>
                <Button
                  onPress={() => remove(form.getValues("rounds").length - 1)}
                  variant="destructive"
                  size="icon"
                >
                  <Minus
                    className="text-primary-foreground"
                    size={20}
                    strokeWidth={1.5}
                  />
                </Button>
              </View>
            </View>
          </CardContent>
          <CardFooter className="gap-2">
            <Button variant="secondary" onPress={() => setModalVisible(false)}>
              <Text>Cancel</Text>
            </Button>
            <Button variant="default" onPress={form.handleSubmit(onSubmit)}>
              <Text>Submit</Text>
            </Button>
          </CardFooter>
        </Form>
      </View>
      <WindowOverlay>
        <PortalHost name={CUSTOM_PORTAL_HOST_NAME} />
      </WindowOverlay>
    </Modal>
  );
}
