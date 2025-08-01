import type { z } from "zod/v4";
import { Settings } from "lucide-react";

import type { editScoresheetSchemaForm } from "@board-games/shared";
import type { UseFormReturn } from "@board-games/ui/form";
import { roundTypes } from "@board-games/db/constants";
import { insertRoundSchema } from "@board-games/db/zodSchema";
import { Button } from "@board-games/ui/button";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  useFieldArray,
} from "@board-games/ui/form";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@board-games/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@board-games/ui/select";

import { NumberInput } from "~/components/number-input";

export function RoundPopOver({
  index,
  form,
  disabled = false,
}: {
  index: number;
  form: UseFormReturn<z.infer<typeof editScoresheetSchemaForm>>;
  disabled?: boolean;
}) {
  const { fields, update } = useFieldArray({
    name: "rounds",
    control: form.control,
  });
  const roundsTypeOptions = roundTypes;
  const formType = form.watch(`rounds.${index}.type`);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="icon" disabled={disabled}>
          <Settings />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" side="top">
        <div className="grid gap-4">
          <div className="grid gap-2">
            <FormField
              control={form.control}
              name={`rounds.${index}.type`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Scoring Type</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      const safeValue = insertRoundSchema
                        .required()
                        .pick({ type: true })
                        .parse({ type: value });
                      update(index, {
                        roundId: fields[index]?.roundId ?? null,
                        name: fields[index]?.name ?? "",
                        type: safeValue.type,
                        order: fields[index]?.order ?? index,
                        color: fields[index]?.color ?? null,
                        modifier: fields[index]?.modifier ?? null,
                        lookup: fields[index]?.lookup ?? null,
                      });
                    }}
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
            {formType === "Checkbox" && (
              <FormField
                control={form.control}
                name={`rounds.${index}.score`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Score</FormLabel>

                    <FormControl>
                      <NumberInput
                        value={field.value}
                        onValueChange={field.onChange}
                        className="border-none text-center"
                      />
                    </FormControl>

                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
