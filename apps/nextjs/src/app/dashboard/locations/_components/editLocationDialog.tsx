"use client";

import { useRouter } from "next/navigation";
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
import { useUpdateLocationMutation } from "~/hooks/mutations/location/update";

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
  const router = useRouter();

  const { updateLocationMutation } = useUpdateLocationMutation({
    onSuccess: async () => {
      router.refresh();
      setOpen(false);
      toast.success("Location updated successfully!");
    },
  });

  const form = useForm({
    schema: locationSchema,
    defaultValues: {
      name: location.name,
    },
  });
  function onSubmit(values: z.infer<typeof locationSchema>) {
    const locationInput =
      location.type === "original"
        ? {
            type: "original" as const,
            id: location.id,
            name: values.name,
          }
        : {
            type: "shared" as const,
            sharedId: location.sharedId,
            name: values.name,
          };
    updateLocationMutation.mutate(locationInput);
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
            <Button
              type="submit"
              disabled={updateLocationMutation.isPending}
            >
              {updateLocationMutation.isPending ? (
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
