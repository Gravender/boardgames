"use client";

import type { UseFormReturn } from "react-hook-form";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Copy, Minus, Plus, Trash } from "lucide-react";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";

import {
  insertRoundSchema,
  insertScoreSheetSchema,
} from "@board-games/db/schema";
import { Button } from "@board-games/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@board-games/ui/card";
import { Checkbox } from "@board-games/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@board-games/ui/form";
import { Input } from "@board-games/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@board-games/ui/select";
import { Separator } from "@board-games/ui/separator";

import { GradientPicker } from "~/components/color-picker";
import { useEditGameStore } from "~/providers/edit-game-provider";
import { RoundPopOver } from "./_components/roundPopOver";

const scoreSheetSchema = insertScoreSheetSchema
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    userId: true,
    type: true,
    gameId: true,
  })
  .required({ name: true });
const roundsSchema = z.array(
  insertRoundSchema
    .omit({
      id: true,
      createdAt: true,
      updatedAt: true,
      scoresheetId: true,
    })
    .required({ name: true }),
);
const formSchema = z.object({
  scoresheet: scoreSheetSchema,
  rounds: roundsSchema,
});
export type formSchemaType = z.infer<typeof formSchema>;
export default function Page() {
  const router = useRouter();

  const { scoresheet, rounds, setScoresheetChanged, setRounds, setScoreSheet } =
    useEditGameStore((state) => state);
  useEffect(() => {
    if (!scoresheet) {
      router.back();
    }
  });
  const form = useForm<formSchemaType>({
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
  const onBack = () => {
    router.back();
  };
  const onSubmit = (data: formSchemaType) => {
    setScoreSheet(data.scoresheet);
    setRounds(data.rounds.map((round) => ({ ...round, id: -1 })));
    setScoresheetChanged(true);
    onBack();
  };

  const conditions = scoreSheetSchema.required().pick({ winCondition: true })
    .shape.winCondition.options;
  const roundsScoreOptions = scoreSheetSchema
    .required()
    .pick({ roundsScore: true }).shape.roundsScore.options;

  return (
    <div className="flex w-full items-center justify-center">
      <div className="w-full max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Add Scoresheet</CardTitle>
          </CardHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <CardContent className="flex flex-col gap-4">
                <FormField
                  control={form.control}
                  name="scoresheet.name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sheet Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Sheet name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="scoresheet.isCoop"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start gap-2 space-x-3 space-y-0">
                      <FormLabel>Is Co-op?</FormLabel>
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
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
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a win condition" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {conditions.map((condition) => (
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
                {form.getValues("scoresheet.winCondition") ===
                  "Target Score" && (
                  <FormField
                    control={form.control}
                    name={`scoresheet.targetScore`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Target Score</FormLabel>

                        <FormControl>
                          <Input
                            {...field}
                            value={field.value}
                            onChange={(e) =>
                              field.onChange(Number(e.target.value))
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
                <FormField
                  control={form.control}
                  name="scoresheet.roundsScore"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Scoring Method</FormLabel>
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
                          {roundsScoreOptions.map((condition) => (
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
                <Separator className="w-full" orientation="horizontal" />
                <AddRounds form={form} />
              </CardContent>
              <CardFooter className="gap-2">
                <Button
                  type="reset"
                  variant="secondary"
                  onClick={() => onBack()}
                >
                  Cancel
                </Button>
                <Button type="submit">Submit</Button>
              </CardFooter>
            </form>
          </Form>
        </Card>
      </div>
    </div>
  );
}
const AddRounds = ({ form }: { form: UseFormReturn<formSchemaType> }) => {
  const { fields, remove, append } = useFieldArray({
    name: "rounds",
    control: form.control,
  });
  return (
    <div className="flex flex-col gap-2">
      <div className="text-xl font-semibold">Rows</div>
      <div className="flex max-h-64 flex-col gap-2 overflow-auto">
        {fields.map((field, index) => {
          return (
            <div
              key={field.id}
              className="flex items-center justify-between gap-2"
            >
              <div className="flex items-center gap-2">
                <FormField
                  control={form.control}
                  name={`rounds.${index}.color`}
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
                  name={`rounds.${index}.name`}
                  render={({ field }) => (
                    <FormItem className="space-y-0">
                      <FormLabel className="hidden">Round Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Round name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="flex items-center gap-2">
                <RoundPopOver index={index} form={form} />
                <Button
                  variant="secondary"
                  size="icon"
                  type="button"
                  onClick={() => {
                    const round = form.getValues("rounds")[index];
                    append({
                      ...field,
                      name: `Round ${fields.length + 1}`,
                      type: round?.type,
                      score: round?.score,
                      order: fields.length + 1,
                    });
                  }}
                >
                  <Copy />
                </Button>
                <Button
                  variant="destructive"
                  size="icon"
                  type="button"
                  onClick={() => remove(index)}
                >
                  <Trash />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-end gap-2">
        <Button
          type="button"
          variant="secondary"
          size={"icon"}
          onClick={() =>
            append({
              name: `Round ${fields.length + 1}`,
              type: "Numeric",
              score: 0,
              order: fields.length + 1,
            })
          }
        >
          <Plus />
        </Button>
        <Button
          type="button"
          variant="secondary"
          size={"icon"}
          onClick={() => remove(form.getValues("rounds").length - 1)}
        >
          <Minus />
        </Button>
      </div>
    </div>
  );
};
