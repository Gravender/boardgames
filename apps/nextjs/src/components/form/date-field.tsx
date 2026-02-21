"use client";

import { format, isSameDay } from "date-fns";
import { CalendarIcon } from "lucide-react";

import { Button } from "@board-games/ui/button";
import { Calendar } from "@board-games/ui/calendar";
import { Field, FieldError, FieldLabel } from "@board-games/ui/field";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@board-games/ui/popover";

import { useFieldContext } from "~/hooks/form";

export const DateField = ({
  label = "Date",
  disableFuture = true,
}: {
  label?: string;
  disableFuture?: boolean;
}) => {
  const field = useFieldContext<Date>();
  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

  return (
    <Field data-invalid={isInvalid}>
      <FieldLabel htmlFor={field.name} className="sr-only">
        {label}
      </FieldLabel>
      <Popover modal={true}>
        <PopoverTrigger asChild>
          <Button
            id={field.name}
            variant="outline"
            className="text-muted-foreground w-full pl-3 text-left font-normal"
            type="button"
          >
            {field.state.value instanceof Date &&
            !isNaN(field.state.value.getTime()) ? (
              isSameDay(field.state.value, new Date()) ? (
                <span>Today</span>
              ) : (
                format(field.state.value, "PPP")
              )
            ) : (
              <span>Select date</span>
            )}
            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={field.state.value}
            onSelect={(date) => {
              if (date) {
                field.handleChange(date);
              }
            }}
            disabled={
              disableFuture
                ? (date) =>
                    date > new Date() || date < new Date("1900-01-01")
                : undefined
            }
          />
        </PopoverContent>
      </Popover>
      {isInvalid && <FieldError errors={field.state.meta.errors} />}
    </Field>
  );
};
