import { Fragment, useState } from "react";
import { View } from "react-native";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "~/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Text } from "~/components/ui/text";
import { ChevronDown } from "~/lib/icons/ChevronDown";
import { ChevronUp } from "~/lib/icons/ChevronUp";
import { Plus } from "~/lib/icons/Plus";

export function AddGame() {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="min-w-[300px] sm:max-w-[425px]">
        <AddGameContent setIsOpen={setIsOpen} />
      </DialogContent>

      <DialogTrigger asChild>
        <Button variant="default" className="h-12 w-12 rounded-full">
          <Plus
            className="text-primary-foreground"
            size={40}
            strokeWidth={1.25}
          />
        </Button>
      </DialogTrigger>
    </Dialog>
  );
}

const formSchema = z
  .object({
    name: z.string().min(1, {
      message: "Game name is required",
    }),
    ownedBy: z.boolean(),
    playersMin: z.number().min(1).nullable(),
    playersMax: z.number().positive().nullable(),
    playtimeMin: z.number().min(1).positive().nullable(),
    playtimeMax: z.number().positive().nullable(),
    yearPublished: z
      .number()
      .min(1900)
      .max(new Date().getFullYear())
      .nullable(),
  })
  .superRefine((values, ctx) => {
    if (
      values.playersMin &&
      values.playersMax &&
      values.playersMin > values.playersMax
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Players min must be less than or equal to players max.",
        path: ["playersMin"],
      });
    }
    if (
      values.playtimeMin &&
      values.playtimeMax &&
      values.playtimeMin > values.playtimeMax
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Playtime min must be less than or equal to playtime max.",
        path: ["playtimeMin"],
      });
    }
  });
function AddGameContent({
  setIsOpen,
}: {
  setIsOpen: (isOpen: boolean) => void;
}) {
  const [moreOptions, setMoreOptions] = useState(false);
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      playersMin: null,
      playersMax: null,
      playtimeMin: null,
      playtimeMax: null,
      yearPublished: null,
      ownedBy: false,
    },
  });
  const onSubmit = (values: z.infer<typeof formSchema>) => console.log(values);

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
      <DialogHeader>
        <DialogTitle>Add Game</DialogTitle>
      </DialogHeader>

      <Form {...form}>
        <View className="flex flex-col gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Game Name</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Game Name"
                    onChangeText={field.onChange}
                    value={field.value}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="ownedBy"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormLabel>Owned by</FormLabel>
                <FormControl>
                  <Checkbox
                    checked={field.value ?? false}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />
          <Collapsible open={moreOptions} onOpenChange={setMoreOptions}>
            <CollapsibleTrigger className="flex flex-row items-center gap-2">
              <Text>More options</Text>
              {moreOptions ? (
                <ChevronUp
                  className="h-4 w-4 text-foreground"
                  size={16}
                  strokeWidth={1.5}
                />
              ) : (
                <ChevronDown
                  className="h-4 w-4 text-foreground"
                  size={16}
                  strokeWidth={1.5}
                />
              )}
            </CollapsibleTrigger>

            <CollapsibleContent className="space-y-4">
              <View className="flex flex-col gap-2 pt-4">
                {/* Players */}
                <View className="flex flex-row items-center gap-4">
                  <Label className="w-24">Players</Label>
                  <View className="flex-1">
                    <FormField
                      control={form.control}
                      name="playersMin"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input
                              placeholder="Min"
                              keyboardType="numeric"
                              onChangeText={onChangeNumberText(field.onChange)}
                              value={
                                field.value
                                  ? `${field.value.toString()}`
                                  : undefined
                              }
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </View>
                  <View className="flex-1">
                    <FormField
                      control={form.control}
                      name="playersMax"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input
                              placeholder="Max"
                              keyboardType="numeric"
                              onChangeText={onChangeNumberText(field.onChange)}
                              value={
                                field.value
                                  ? `${field.value.toString()}`
                                  : undefined
                              }
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </View>
                </View>
                {/* Error Messages for Players */}
                {(form.formState.errors.playersMin ||
                  form.formState.errors.playersMax) && (
                  <View className="space-y-2">
                    {form.formState.errors.playersMin !== undefined ? (
                      <FormMessage>
                        {form.formState.errors.playersMin.message}
                      </FormMessage>
                    ) : (
                      <View />
                    )}
                    {form.formState.errors.playersMax !== undefined ? (
                      <FormMessage>
                        {form.formState.errors.playersMax.message}
                      </FormMessage>
                    ) : (
                      <View />
                    )}
                  </View>
                )}

                {/* Playtime */}
                <View className="flex flex-row items-center gap-4">
                  <Label className="w-24">Playtime</Label>
                  <View className="flex-1">
                    <FormField
                      control={form.control}
                      name="playtimeMin"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input
                              placeholder="Min"
                              keyboardType="numeric"
                              onChangeText={onChangeNumberText(field.onChange)}
                              value={
                                field.value
                                  ? `${field.value.toString()}`
                                  : undefined
                              }
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </View>
                  <View className="flex-1">
                    <FormField
                      control={form.control}
                      name="playtimeMax"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input
                              placeholder="Max"
                              keyboardType="numeric"
                              onChangeText={onChangeNumberText(field.onChange)}
                              value={
                                field.value
                                  ? `${field.value.toString()}`
                                  : undefined
                              }
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </View>
                </View>
                {/* Error Messages for Playtime */}
                {(form.formState.errors.playtimeMin ||
                  form.formState.errors.playtimeMax) && (
                  <View className="space-y-2">
                    {form.formState.errors.playtimeMin !== undefined ? (
                      <FormMessage>
                        {form.formState.errors.playtimeMin.message}
                      </FormMessage>
                    ) : (
                      <View />
                    )}
                    {form.formState.errors.playtimeMax !== undefined ? (
                      <FormMessage>
                        {form.formState.errors.playtimeMax.message}
                      </FormMessage>
                    ) : (
                      <View />
                    )}
                  </View>
                )}

                {/* Year Published */}
                <View className="flex flex-row items-center gap-4">
                  <Label className="w-24">Year Published</Label>
                  <View className="flex-1">
                    <FormField
                      control={form.control}
                      name="yearPublished"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input
                              placeholder="Year Published"
                              keyboardType="numeric"
                              onChangeText={onChangeNumberText(field.onChange)}
                              value={
                                field.value
                                  ? `${field.value.toString()}`
                                  : undefined
                              }
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </View>
                </View>
                {/* Error Message for Year Published */}
                {form.formState.errors.yearPublished && (
                  <FormMessage>
                    {form.formState.errors.yearPublished.message}
                  </FormMessage>
                )}
              </View>
            </CollapsibleContent>
          </Collapsible>
        </View>
        <DialogFooter className="gap-2">
          <Button variant="secondary" onPress={() => setIsOpen(false)}>
            <Text>Cancel</Text>
          </Button>
          <Button onPress={form.handleSubmit(onSubmit)}>
            <Text>Submit</Text>
          </Button>
        </DialogFooter>
      </Form>
    </Fragment>
  );
}
