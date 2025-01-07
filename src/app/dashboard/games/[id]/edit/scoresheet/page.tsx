"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Copy, Minus, Plus, Trash } from "lucide-react";
import { useFieldArray, useForm, type UseFormReturn } from "react-hook-form";
import { z } from "zod";

import { GradientPicker } from "~/components/color-picker";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Checkbox } from "~/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Separator } from "~/components/ui/separator";
import { useEditGameStore } from "~/providers/edit-game-provider";
import { roundsSchema, scoreSheetSchema } from "~/stores/add-game-store";

import { RoundPopOver } from "./_components/roundPopOver";

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
              <CardContent className="gap-4 flex flex-col">
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
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 gap-2">
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
      <div className="flex flex-col gap-2 max-h-64 overflow-auto">
        {fields.map((field, index) => {
          return (
            <div
              key={field.id}
              className="flex gap-2 items-center justify-between"
            >
              <div className="flex gap-2 items-center">
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
              <div className="flex gap-2 items-center">
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
      <div className="flex justify-end items-center gap-2">
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
