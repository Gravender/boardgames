import type { UseFormReturn } from "react-hook-form";
import React, { Fragment } from "react";
import { Platform, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFieldArray } from "react-hook-form";

import { insertRoundSchema } from "@board-games/db/schema";

import type { FormSchemaType } from "./AddScoresheetModal";
import { Settings } from "~/lib/icons/Settings";
import { Button } from "./ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "./ui/form";
import { Input } from "./ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

export function RoundPopOver({
  index,
  form,
  portalHost,
}: {
  index: number;
  form: UseFormReturn<FormSchemaType>;
  portalHost?: string;
}) {
  const insets = useSafeAreaInsets();
  const contentInsets = {
    top: insets.top,
    bottom: insets.bottom,
    left: 16,
    right: 16,
  };

  return (
    <Fragment>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant={"outline"} size={"icon"}>
            <Settings
              className="h-8 w-8 text-primary"
              size={20}
              strokeWidth={1.5}
            />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          side={Platform.OS === "web" ? "bottom" : "top"}
          insets={contentInsets}
          portalHost={portalHost}
        >
          <Content index={index} form={form} />
        </PopoverContent>
      </Popover>
    </Fragment>
  );
}

const CUSTOM_PORTAL_HOST_NAME = "modal-round-pop-over-select";
function Content({
  index,
  form,
}: {
  index: number;
  form: UseFormReturn<FormSchemaType>;
}) {
  const insets = useSafeAreaInsets();
  const contentInsets = {
    top: insets.top,
    bottom: insets.bottom,
    left: 12,
    right: 12,
  };
  const { fields, update } = useFieldArray({
    name: "rounds",
    control: form.control,
  });
  const roundsTypeOptions = insertRoundSchema.required().pick({ type: true })
    .shape.type.options;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const onChangeNumberText = (onChange: (...event: any[]) => void) => {
    return (text: string) => {
      if (text === "") {
        onChange(null);
      } else {
        onChange(parseInt(text));
      }
    };
  };
  return (
    <Fragment>
      <Form {...form}>
        <View className="flex flex-col gap-4">
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
                      .parse({ type: value?.value });
                    update(index, {
                      color: fields[index]?.color,
                      name: fields[index]?.name ?? "",
                      type: safeValue.type,
                    });
                  }}
                  defaultValue={{
                    value: field.value ?? "Numeric",
                    label: field.value ?? "Numeric",
                  }}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue
                        className="native:text-lg text-sm text-foreground"
                        placeholder="Select a scoring type"
                      />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent
                    insets={contentInsets}
                    portalHost={CUSTOM_PORTAL_HOST_NAME}
                    className="w-64"
                  >
                    {roundsTypeOptions.map((condition) => (
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
          {fields[index]?.type === "Checkbox" && (
            <FormField
              control={form.control}
              name={`rounds.${index}.score`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Score</FormLabel>

                  <FormControl>
                    <Input
                      value={
                        field.value ? `${field.value.toString()}` : undefined
                      }
                      onChangeText={onChangeNumberText(field.onChange)}
                      keyboardType="numeric"
                      className="border-none text-center"
                    />
                  </FormControl>

                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </View>
      </Form>
    </Fragment>
  );
}
