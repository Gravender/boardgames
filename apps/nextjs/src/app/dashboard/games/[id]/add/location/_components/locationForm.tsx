"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { MapPin } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@board-games/ui/button";
import { CardFooter } from "@board-games/ui/card";
import { Checkbox } from "@board-games/ui/checkbox";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@board-games/ui/form";
import { cn } from "@board-games/ui/lib/utils";
import { ScrollArea } from "@board-games/ui/scroll-area";

import type { RouterOutputs } from "~/trpc/react";
import { Spinner } from "~/components/spinner";
import { useAddMatchStore } from "~/providers/add-match-provider";
import { locationSchema } from "~/stores/add-match-store";

const formSchema = z.object({
  location: locationSchema,
});
type formSchemaType = z.infer<typeof formSchema>;
export default function SelectLocationForm({
  locations,
  gameId,
}: {
  locations: RouterOutputs["location"]["getLocations"];
  gameId: number;
}) {
  const router = useRouter();
  const { match, setLocation, setIsOpen } = useAddMatchStore((state) => state);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const form = useForm<formSchemaType>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      location:
        match.location ??
        locations.find((location) => location.isDefault) ??
        null,
    },
  });
  const onBack = () => {
    router.push(`/dashboard/games/${gameId}`);
  };
  const onSubmit = (data: formSchemaType) => {
    setIsSubmitting(true);
    console.log(data.location);
    setLocation(data.location);
    setIsOpen(true);
    onBack();
  };

  return (
    <div className="flex w-full items-center justify-center">
      <div className="w-full max-w-2xl">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <FormField
              control={form.control}
              name="location"
              render={() => (
                <FormItem>
                  <div className="mb-4">
                    <FormLabel className="hidden">Locations</FormLabel>
                    <FormDescription className="hidden">
                      Select the location for the match
                    </FormDescription>
                  </div>
                  <ScrollArea className="h-[65dvh] p-6 pt-0 sm:h-[75dvh]">
                    <div className="flex flex-col gap-2 rounded-lg">
                      {locations.map((location) => (
                        <FormField
                          key={location.id}
                          control={form.control}
                          name="location"
                          render={({ field }) => {
                            return (
                              <FormItem
                                key={location.id}
                                className={cn(
                                  "flex flex-row items-center space-x-3 space-y-0 rounded-sm p-2",
                                  field.value?.id === location.id
                                    ? "bg-violet-400"
                                    : "bg-border",
                                )}
                              >
                                <FormControl>
                                  <Checkbox
                                    className="hidden"
                                    checked={field.value?.id === location.id}
                                    onCheckedChange={(checked) => {
                                      return checked
                                        ? field.onChange(location)
                                        : field.onChange(null);
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="flex w-full items-center justify-between gap-2 text-sm font-normal">
                                  <div className="flex items-center gap-2">
                                    <div className="relative flex h-14 w-14 shrink-0 overflow-hidden rounded-full shadow">
                                      <div className="flex h-full w-full items-center justify-center rounded-full bg-muted">
                                        <MapPin />
                                      </div>
                                    </div>
                                    <span className="text-lg font-semibold">
                                      {location.name}
                                    </span>
                                  </div>

                                  <div className="flex h-10 w-10 items-center justify-center rounded-sm bg-background">
                                    {location.matches.length}
                                  </div>
                                </FormLabel>
                              </FormItem>
                            );
                          }}
                        />
                      ))}
                    </div>
                  </ScrollArea>
                  <FormMessage />
                </FormItem>
              )}
            />
            <CardFooter className="gap-2">
              <Button type="reset" variant="secondary" onClick={() => onBack()}>
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
      </div>
    </div>
  );
}
