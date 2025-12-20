"use client";

import { Settings } from "lucide-react";

import { roundTypes } from "@board-games/db/constants";
import { insertRoundSchema } from "@board-games/db/zodSchema";
import { Button } from "@board-games/ui/button";
import { Field, FieldError, FieldLabel } from "@board-games/ui/field";
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

import type { Round } from "./add-game.types";
import { NumberInput } from "~/components/number-input";
import { withFieldGroup } from "~/hooks/form";
import { defaultRound } from "./add-game.types";

const defaultValues: {
  round: Round;
} = {
  round: defaultRound,
};

export const RoundPopOver = withFieldGroup({
  defaultValues,
  render: function Render({ group }) {
    const roundTypeOptions = roundTypes;

    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" size="icon">
            <Settings />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80" side="top">
          <div className="grid gap-4">
            <group.Subscribe
              selector={(state) => ({
                roundType: state.values.round.type,
              })}
            >
              {({ roundType }) => {
                return (
                  <div className="grid gap-2">
                    <group.AppField name="round.type">
                      {(field) => {
                        const isInvalid =
                          field.state.meta.isTouched &&
                          !field.state.meta.isValid;
                        const fieldValue = field.state.value;
                        return (
                          <Field data-invalid={isInvalid}>
                            <FieldLabel>Scoring Type</FieldLabel>
                            <Select
                              value={fieldValue}
                              onValueChange={(value) => {
                                const safeValue = insertRoundSchema
                                  .required()
                                  .pick({ type: true })
                                  .parse({ type: value });
                                field.handleChange(safeValue.type);
                              }}
                            >
                              <SelectTrigger aria-invalid={isInvalid}>
                                <SelectValue placeholder="Select a scoring type" />
                              </SelectTrigger>
                              <SelectContent>
                                {roundTypeOptions.map((condition) => (
                                  <SelectItem key={condition} value={condition}>
                                    {condition}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {isInvalid && (
                              <FieldError errors={field.state.meta.errors} />
                            )}
                          </Field>
                        );
                      }}
                    </group.AppField>
                    {roundType === "Checkbox" && (
                      <group.AppField name="round.score">
                        {(field) => {
                          const isInvalid =
                            field.state.meta.isTouched &&
                            !field.state.meta.isValid;
                          const fieldValue = field.state.value ?? 0;
                          return (
                            <Field data-invalid={isInvalid}>
                              <FieldLabel>Score</FieldLabel>
                              <NumberInput
                                value={fieldValue}
                                onValueChange={(value) => {
                                  const numValue = value ?? 0;
                                  field.handleChange(numValue);
                                }}
                                className="border-none text-center"
                              />
                              {isInvalid && (
                                <FieldError errors={field.state.meta.errors} />
                              )}
                            </Field>
                          );
                        }}
                      </group.AppField>
                    )}
                  </div>
                );
              }}
            </group.Subscribe>
          </div>
        </PopoverContent>
      </Popover>
    );
  },
});
