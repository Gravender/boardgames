"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { MapPin } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Spinner } from "~/components/spinner";
import { Button } from "~/components/ui/button";
import { CardFooter } from "~/components/ui/card";
import { Checkbox } from "~/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { ScrollArea } from "~/components/ui/scroll-area";
import { cn } from "~/lib/utils";
import { useAddMatchStore } from "~/providers/add-match-provider";
import { locationSchema } from "~/stores/add-match-store";
import { type RouterOutputs } from "~/trpc/react";

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
                  <ScrollArea className="sm:h-[75dvh] h-[65dvh] p-6 pt-0">
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
                                  "flex flex-row space-x-3 space-y-0 items-center p-2 rounded-sm",
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
                                <FormLabel className="text-sm font-normal flex items-center gap-2 w-full justify-between">
                                  <div className="flex items-center gap-2">
                                    <div className="relative flex shadow h-14 w-14 shrink-0 overflow-hidden rounded-full">
                                      <div className="flex h-full w-full items-center justify-center rounded-full bg-muted">
                                        <MapPin />
                                      </div>
                                    </div>
                                    <span className="text-lg font-semibold">
                                      {location.name}
                                    </span>
                                  </div>

                                  <div className="w-10 h-10 rounded-sm bg-background flex items-center justify-center">
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
