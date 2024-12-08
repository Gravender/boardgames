import { Settings } from "lucide-react";
import { useFieldArray, type UseFormReturn } from "react-hook-form";
import { type z } from "zod";

import { Button } from "~/components/ui/button";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { insertRoundSchema } from "~/server/db/schema/round";

import { type addGameSchema } from "./addGameDialog";

export function RoundPopOver({
  index,
  form,
}: {
  index: number;
  form: UseFormReturn<z.infer<typeof addGameSchema>>;
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
          <div className="space-y-2">
            <h4 className="font-medium leading-none">Dimensions</h4>
            <p className="text-sm text-muted-foreground">
              Set the dimensions for the layer.
            </p>
          </div>
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
                      <Input
                        {...field}
                        value={field.value}
                        onChange={(e) => field.onChange(Number(e.target.value))}
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
        </div>
      </PopoverContent>
    </Popover>
  );
}
