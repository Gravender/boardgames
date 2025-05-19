"use client";

import type { Dispatch, SetStateAction } from "react";
import type { z } from "zod";
import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format, isSameDay } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { useForm } from "react-hook-form";

import type { RouterOutputs } from "@board-games/api";
import { insertMatchSchema } from "@board-games/db/zodSchema";
import { Button } from "@board-games/ui/button";
import { Calendar } from "@board-games/ui/calendar";
import { CardContent, CardFooter } from "@board-games/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@board-games/ui/form";
import { Input } from "@board-games/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@board-games/ui/popover";

import { Spinner } from "~/components/spinner";
import { useTRPC } from "~/trpc/react";

const matchSchema = insertMatchSchema
  .pick({
    name: true,
    date: true,
  })
  .required({ name: true, date: true });
type Match = NonNullable<RouterOutputs["game"]["getGame"]>["matches"][number];
export function EditSharedMatchForm({
  match,
  setIsOpen,
}: {
  match: Extract<Match, { type: "shared" }>;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
}) {
  const trpc = useTRPC();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();

  const form = useForm<z.infer<typeof matchSchema>>({
    resolver: zodResolver(matchSchema),
    defaultValues: {
      name: match.name,
      date: match.date,
    },
  });
  const editMatch = useMutation(
    trpc.match.editMatch.mutationOptions({
      onSuccess: async (result) => {
        console.log("result", result);
        if (result !== null) {
          if (result.type == "shared") {
            await queryClient.invalidateQueries(
              trpc.sharing.getSharedGame.queryOptions({ id: result.gameId }),
            );
            await queryClient.invalidateQueries(
              trpc.sharing.getSharedMatch.queryOptions({ id: result.id }),
            );
          }
          if (result.type == "linked") {
            await queryClient.invalidateQueries(
              trpc.game.getGame.queryOptions({ id: result.gameId }),
            );
          }
        }
        setIsOpen(false);
      },
    }),
  );

  const onSubmit = (values: z.infer<typeof matchSchema>) => {
    setIsSubmitting(true);

    editMatch.mutate({
      type: "shared",
      match: {
        id: match.id,
        name: values.name === match.name ? undefined : values.name,
        date:
          values.date.getTime() === match.date.getTime()
            ? undefined
            : values.date,
      },
    });
  };
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <CardContent className="flex flex-col gap-2">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Match Name</FormLabel>
                <FormControl>
                  <Input placeholder="Match name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel className="hidden">Date</FormLabel>
                <Popover modal={true}>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className="w-[240px] pl-3 text-left font-normal text-muted-foreground"
                        type="button"
                      >
                        {isSameDay(field.value, new Date()) ? (
                          <span>Today</span>
                        ) : (
                          format(field.value, "PPP")
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) =>
                        date > new Date() || date < new Date("1900-01-01")
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
        </CardContent>

        <CardFooter className="justify-end gap-2">
          <Button
            type="reset"
            variant="secondary"
            onClick={() => {
              setIsOpen(false);
            }}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Spinner />
                <span>Submitting...</span>
              </>
            ) : (
              "Submit"
            )}
          </Button>
        </CardFooter>
      </form>
    </Form>
  );
}
