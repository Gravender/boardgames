"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

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
} from "@board-games/ui/form";
import { useToast } from "@board-games/ui/hooks/use-toast";
import { Input } from "@board-games/ui/input";
import { Switch } from "@board-games/ui/switch";

import {RouterOutputs} from "@board-games/api";
import { Spinner } from "~/components/spinner";
import { api } from "~/trpc/react";

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
  isDefault: z.boolean(),
});
const LocationContent = ({
  setOpen,
  location,
}: {
  setOpen: (isOpen: boolean) => void;
  location: RouterOutputs["location"]["getLocations"][number];
}) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const utils = api.useUtils();
  const router = useRouter();

  const form = useForm<z.infer<typeof locationSchema>>({
    resolver: zodResolver(locationSchema),
    defaultValues: {
      name: location.name,
      isDefault: location.isDefault,
    },
  });
  const mutation = api.location.update.useMutation({
    onSuccess: async () => {
      setIsSubmitting(false);
      await utils.location.getLocations.invalidate();
      await utils.dashboard.getLocations.invalidate();
      router.refresh();
      setOpen(false);
      toast({
        title: "Location updated successfully!",
      });
    },
  });
  function onSubmit(values: z.infer<typeof locationSchema>) {
    setIsSubmitting(true);
    mutation.mutate({
      id: location.id,
      name: values.name,
      isDefault: values.isDefault,
    });
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
          <FormField
            control={form.control}
            name="isDefault"
            render={({ field }) => (
              <FormItem className="flex w-full items-center justify-center gap-2">
                <FormLabel>Is Default Location?</FormLabel>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    aria-readonly
                  />
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
                  <span>Submiting...</span>
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
