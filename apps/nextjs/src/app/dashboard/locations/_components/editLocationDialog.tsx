"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod/v4";

import type { RouterOutputs } from "@board-games/api";
import { Button } from "@board-games/ui/button";
import {
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@board-games/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  useForm,
} from "@board-games/ui/form";
import { Input } from "@board-games/ui/input";
import { toast } from "@board-games/ui/toast";

import { Spinner } from "~/components/spinner";
import { useTRPC } from "~/trpc/react";

export const EditLocationDialog = ({
  location,
  setOpen,
}: {
  location: RouterOutputs["location"]["getLocations"][number];
  setOpen: (isOpen: boolean) => void;
}) => {
  return (
    <DialogContent className="min-h-80 sm:max-w-[465px]">
      <LocationContent setOpen={setOpen} location={location} />
    </DialogContent>
  );
};

const locationSchema = z.object({
  name: z.string().min(1, {
    message: "Location name is required",
  }),
});
const LocationContent = ({
  setOpen,
  location,
}: {
  setOpen: (isOpen: boolean) => void;
  location: RouterOutputs["location"]["getLocations"][number];
}) => {
  const trpc = useTRPC();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();
  const router = useRouter();

  const form = useForm({
    schema: locationSchema,
    defaultValues: {
      name: location.name,
    },
  });
  const mutation = useMutation(
    trpc.location.update.mutationOptions({
      onSuccess: async () => {
        setIsSubmitting(false);
        await queryClient.invalidateQueries(
          trpc.location.getLocations.queryOptions(),
        );
        if (location.type === "shared") {
          await queryClient.invalidateQueries(
            trpc.sharing.getSharedLocation.queryOptions({ id: location.id }),
          );
        }
        if (location.type === "original") {
          await queryClient.invalidateQueries(
            trpc.location.getLocation.queryOptions({ id: location.id }),
          );
        }
        router.refresh();
        setOpen(false);
        toast.success("Location updated successfully!");
      },
    }),
  );
  function onSubmit(values: z.infer<typeof locationSchema>) {
    setIsSubmitting(true);
    if (location.type === "original") {
      mutation.mutate({
        id: location.id,
        type: "original",
        name: values.name,
      });
    } else {
      mutation.mutate({
        id: location.id,
        type: "shared",
        name: values.name,
      });
    }
  }
  return (
    <>
      <DialogHeader>
        <DialogTitle>{`Edit ${location.name}`}</DialogTitle>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Location Name</FormLabel>
                <FormControl>
                  <Input placeholder="Location name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <DialogFooter className="gap-2">
            <Button
              type="reset"
              variant="secondary"
              onClick={() => setOpen(false)}
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
          </DialogFooter>
        </form>
      </Form>
    </>
  );
};
