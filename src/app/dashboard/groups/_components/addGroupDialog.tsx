"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { PlusIcon } from "lucide-react";
import { useForm } from "react-hook-form";
import { type z } from "zod";

import { Spinner } from "~/components/spinner";
import { Button } from "~/components/ui/button";
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
import { useToast } from "~/hooks/use-toast";
import { useAddGroupStore } from "~/providers/add-group-provider";
import { groupSchema, playersSchema } from "~/stores/add-group-store";
import { api } from "~/trpc/react";

export const AddGroupDialog = () => {
  const { isOpen, setIsOpen } = useAddGroupStore((state) => state);
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[465px] min-h-80">
        <GroupContent />
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

const formSchema = groupSchema.extend({ players: playersSchema });

type formSchemaType = z.infer<typeof formSchema>;
const GroupContent = () => {
  const { toast } = useToast();
  const { isOpen, group, setGroup, reset } = useAddGroupStore((state) => state);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGettingPlayers, setIsGettingPlayers] = useState(false);

  const utils = api.useUtils();
  const router = useRouter();

  const form = useForm<formSchemaType>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: group.name,
      players: group.players,
    },
  });
  const createGroup = api.group.create.useMutation({
    onSuccess: async () => {
      await utils.group.getGroups.invalidate();
      reset();
      setIsSubmitting(false);
      form.reset();
      router.refresh();
      toast({
        title: "Group created successfully!",
      });
    },
  });

  useEffect(() => {
    if (!isOpen) reset();
  }, [isOpen, reset]);

  async function onSubmit(values: formSchemaType) {
    setIsSubmitting(true);
    createGroup.mutate({
      name: values.name,
      players: values.players,
    });
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Add Group</DialogTitle>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Group Name</FormLabel>
                <FormControl>
                  <Input placeholder="Group name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="players"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="hidden">Players</FormLabel>
                <Button
                  variant="outline"
                  type="button"
                  disabled={isGettingPlayers}
                  onClick={() => {
                    setIsGettingPlayers(true);
                    setGroup({
                      name: form.getValues("name"),
                    });
                    router.push(`/dashboard/groups/add/players`);
                  }}
                >
                  {isGettingPlayers ? (
                    <>
                      <Spinner />
                      <span>Navigating...</span>
                    </>
                  ) : (
                    `${field.value.length} Players`
                  )}
                </Button>
                <FormMessage />
              </FormItem>
            )}
          />

          <DialogFooter className="gap-2">
            <Button type="reset" variant="secondary" onClick={() => reset()}>
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
