"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PlusIcon } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod/v4";

import { Button } from "@board-games/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@board-games/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@board-games/ui/form";
import { Input } from "@board-games/ui/input";
import { Switch } from "@board-games/ui/switch";
import { toast } from "@board-games/ui/toast";

import { Spinner } from "~/components/spinner";
import { useTRPC } from "~/trpc/react";

export const AddLocationDialog = () => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="min-h-80 sm:max-w-[465px]">
        <LocationContent setIsOpen={setIsOpen} />
      </DialogContent>
      <div className="flex h-full w-full flex-col justify-end">
        <div className="flex justify-end">
          <DialogTrigger asChild>
            <Button
              variant="default"
              className="rounded-full"
              size="icon"
              type="button"
            >
              <PlusIcon />
            </Button>
          </DialogTrigger>
        </div>
      </div>
    </Dialog>
  );
};
const formSchema = z.object({
  name: z.string().min(1, {
    message: "Location name is required",
  }),
  isDefault: z.boolean(),
});
type formSchemaType = z.infer<typeof formSchema>;
const LocationContent = ({
  setIsOpen,
}: {
  setIsOpen: (isOpen: boolean) => void;
}) => {
  const trpc = useTRPC();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();
  const router = useRouter();

  const form = useForm<formSchemaType>({
    resolver: standardSchemaResolver(formSchema),
    defaultValues: {
      name: "",
      isDefault: false,
    },
  });
  const createLocation = useMutation(
    trpc.location.create.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.location.getLocations.queryOptions(),
        );
        setIsSubmitting(false);
        form.reset();
        router.refresh();
        setIsOpen(false);
        toast.success("Location created successfully!");
      },
    }),
  );

  function onSubmit(values: formSchemaType) {
    setIsSubmitting(true);
    createLocation.mutate({
      name: values.name,
      isDefault: values.isDefault,
    });
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Add Location</DialogTitle>
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
              onClick={() => setIsOpen(false)}
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
