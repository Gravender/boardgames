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
import { toast } from "@board-games/ui/toast";

import type { Round } from "./add-game.types";
import { NumberInput } from "~/components/number-input";
import { defaultRound } from "./add-game.types";

type RoundPopOverProps = {
  form: any;
  roundPath: string;
  disabled?: boolean;
};

export const RoundPopOver = ({
  form,
  roundPath,
  disabled = false,
}: RoundPopOverProps) => {
  const roundTypeOptions = roundTypes;

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="icon"
            disabled={disabled}
          >
            <Settings />
          </Button>
        }
      />
      <PopoverContent className="w-80" side="top">
        <div className="grid gap-4">
          <form.Field name={`${roundPath}.type` as any}>
            {(typeField: any) => {
              const isInvalid =
                typeField.state.meta.isTouched && !typeField.state.meta.isValid;
              const roundType = typeField.state.value as Round["type"];

              return (
                <div className="grid gap-2">
                  <Field data-invalid={isInvalid}>
                    <FieldLabel>Scoring Type</FieldLabel>
                    <Select
                      value={typeField.state.value}
                      onValueChange={(value) => {
                        const parsed = insertRoundSchema
                          .required()
                          .pick({ type: true })
                          .safeParse({ type: value });

                        if (parsed.success) {
                          typeField.handleChange(parsed.data.type);
                          return;
                        }

                        toast.error(
                          parsed.error.issues[0]?.message ??
                            "Invalid scoring type.",
                        );
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
                      <FieldError errors={typeField.state.meta.errors} />
                    )}
                  </Field>
                  {roundType === "Checkbox" && (
                    <form.Field name={`${roundPath}.score` as any}>
                      {(scoreField: any) => {
                        const scoreIsInvalid =
                          scoreField.state.meta.isTouched &&
                          !scoreField.state.meta.isValid;
                        return (
                          <Field data-invalid={scoreIsInvalid}>
                            <FieldLabel>Score</FieldLabel>
                            <NumberInput
                              defaultValue={scoreField.state.value ?? defaultRound.score}
                              onValueChange={(value) => {
                                const numValue = value ?? 0;
                                scoreField.handleChange(numValue);
                              }}
                              className="border-none text-center"
                            />
                            {scoreIsInvalid && (
                              <FieldError errors={scoreField.state.meta.errors} />
                            )}
                          </Field>
                        );
                      }}
                    </form.Field>
                  )}
                </div>
              );
            }}
          </form.Field>
        </div>
      </PopoverContent>
    </Popover>
  );
};
