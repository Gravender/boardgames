import type { UseFormReturn } from "react-hook-form";
import { Settings } from "lucide-react";
import { useFieldArray } from "react-hook-form";

import { insertRoundSchema } from "@board-games/db/schema";
import { Button } from "@board-games/ui/button";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
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

import type { formSchemaType } from "../page";
import { NumberInput } from "~/components/number-input";

export function RoundPopOver({
  index,
  form,
}: {
  index: number;
  form: UseFormReturn<formSchemaType>;
}) {
  const { fields, update } = useFieldArray({
    name: "rounds",
    control: form.control,
  });
  const roundsTypeOptions = insertRoundSchema.required().pick({ type: true })
    .shape.type.options;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="icon">
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
                        ...fields[index],
                        name: fields[index]?.name ?? "",
                        type: safeValue.type,
                        order: fields[index]?.order ?? index,
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
            {fields[index]?.type === "Checkbox" && (
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