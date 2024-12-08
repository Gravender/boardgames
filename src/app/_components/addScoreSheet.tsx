"use client";

import { register } from "module";
import { useState } from "react";
import { Copy, Minus, Plus, Table, Trash } from "lucide-react";
import { useFieldArray, type UseFormReturn } from "react-hook-form";
import { type z } from "zod";

import { GradientPicker } from "~/components/color-picker";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import {
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
import { insertScoreSheetSchema } from "~/server/db/schema";

import { type addGameSchema } from "./addGameDialog";
import { RoundPopOver } from "./roundPopOver";

export function AddScoreSheet({
  form,
}: {
  form: UseFormReturn<z.infer<typeof addGameSchema>>;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const openDialog = () => {
    if (!form.getValues("scoresheet")) {
      form.setValue("scoresheet", {
        name: "Default",
        winCondition: "Highest Score",
        isCoop: false,
        roundsScore: "Aggregate",
      });
      form.setValue("rounds", [
        {
          name: "Round 1",
          type: "Numeric",
          color: "#E2E2E2",
          score: 0,
        },
      ]);
    }
    setIsOpen(true);
  };
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[465px]">
        <Content setOpen={setIsOpen} form={form} />
      </DialogContent>
      <div className="flex flex-col">
        <div className="flex justify-between items-center">
          <div className="text-xl font-semibold">Scoresheet</div>
          <Button
            variant="default"
            onClick={() => {
              openDialog();
            }}
            type="button"
          >
            {!form.getValues("scoresheet") ? "Create New" : "Edit Sheet"}
          </Button>
        </div>
        <button
          className="flex items-center justify-between gap-2"
          onClick={() => openDialog()}
          type="button"
        >
          <Table />
          <div className="flex flex-grow justify-start items-start flex-col">
            <span className="text-lg">
              {form.getValues("scoresheet")?.name ?? "Default"}
            </span>
            <div className="mb-2 flex w-full items-center gap-3 text-sm">
              <div className="flex min-w-20 items-center gap-1">
                <span>Win Condition:</span>
                <span className="text-sm text-muted-foreground">
                  {form.getValues("scoresheet")?.winCondition ??
                    "Highest Score"}
                </span>
              </div>
              <Separator
                orientation="vertical"
                className="h-4 font-semi-bold"
              />
              <div className="flex min-w-20 items-center gap-1">
                <span>Rounds:</span>
                <span className="text-sm text-muted-foreground">
                  {form.getValues("rounds")?.length ?? "0"}
                </span>
              </div>
            </div>
          </div>
        </button>
      </div>
    </Dialog>
  );
}
const Content = ({
  form,
  setOpen,
}: {
  form: UseFormReturn<z.infer<typeof addGameSchema>>;
  setOpen: (isOpen: boolean) => void;
}) => {
  const conditions = insertScoreSheetSchema
    .required()
    .pick({ winCondition: true }).shape.winCondition.options;
  const roundsScoreOptions = insertScoreSheetSchema
    .required()
    .pick({ roundsScore: true }).shape.roundsScore.options;
  const { fields, remove, append, update } = useFieldArray({
    name: "rounds",
    control: form.control,
  });
  return (
    <>
      <DialogHeader>
        <DialogTitle>Add Scoresheet</DialogTitle>
      </DialogHeader>
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
            <Select onValueChange={field.onChange} defaultValue={field.value}>
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
      <FormField
        control={form.control}
        name="scoresheet.roundsScore"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Scoring Method</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                    onClick={() =>
                      append({ ...field, name: `Round ${index + 1}` })
                    }
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
      <DialogFooter className="gap-2">
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            form.setValue("scoresheet", null);
            form.setValue("rounds", []);
            setOpen(false);
          }}
        >
          Cancel
        </Button>
        <Button type="button" onClick={() => setOpen(false)}>
          Save
        </Button>
      </DialogFooter>
    </>
  );
};
