"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { User } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Spinner } from "~/components/spinner";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
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
import { useToast } from "~/hooks/use-toast";
import { cn } from "~/lib/utils";
import { insertPlayerSchema } from "~/server/db/schema";
import { api, type RouterOutputs } from "~/trpc/react";

const formSchema = z.object({
  players: z
    .array(
      insertPlayerSchema
        .pick({ name: true, id: true })
        .required({ name: true, id: true }),
    )
    .refine((players) => players.length > 0, {
      message: "You must add at least one player",
    }),
});
type formSchemaType = z.infer<typeof formSchema>;
export default function SelectPlayersForm({
  players,
  groupId,
}: {
  players: RouterOutputs["player"]["getPlayersByGroup"];
  groupId: number;
}) {
  const { toast } = useToast();
  const router = useRouter();
  const utils = api.useUtils();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inGroup = players.filter((player) => player.ingroup);
  const form = useForm<formSchemaType>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      players: inGroup,
    },
  });

  const updateGroupPlayers = api.group.updatePlayers.useMutation({
    onSuccess: async () => {
      await utils.group.getGroups.invalidate();
      await utils.dashboard.getGroups.invalidate();
      router.refresh();
      setIsSubmitting(false);
      form.reset();
      router.refresh();
      toast({
        title: "Group players updated successfully!",
      });
      onBack();
    },
  });
  const onBack = () => {
    router.push(`/dashboard/groups`);
  };
  const onSubmit = (data: formSchemaType) => {
    setIsSubmitting(true);
    updateGroupPlayers.mutate({
      group: {
        id: groupId,
      },
      playersToAdd: data.players.filter(
        (player) => !inGroup.find((p) => p.id === player.id),
      ),
      playersToRemove: inGroup.filter(
        (player) => !data.players.find((p) => p.id === player.id),
      ),
    });
  };

  return (
    <div className="flex w-full items-center justify-center">
      <div className="w-full max-w-2xl">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <FormField
              control={form.control}
              name="players"
              render={() => (
                <FormItem>
                  <div className="mb-4">
                    <FormLabel className="hidden">Players</FormLabel>
                    <FormDescription className="hidden">
                      Select the players for the match
                    </FormDescription>
                  </div>
                  <ScrollArea className="sm:h-[75dvh] h-[65dvh] p-6 pt-0">
                    <div className="flex flex-col gap-2 rounded-lg">
                      {players.map((player) => (
                        <FormField
                          key={player.id}
                          control={form.control}
                          name="players"
                          render={({ field }) => {
                            return (
                              <FormItem
                                key={player.id}
                                className={cn(
                                  "flex flex-row space-x-3 space-y-0 items-center p-2 rounded-sm",
                                  field.value?.findIndex(
                                    (i) => i.id === player.id,
                                  ) > -1
                                    ? "bg-violet-400"
                                    : "bg-border",
                                )}
                              >
                                <FormControl>
                                  <Checkbox
                                    className="hidden"
                                    checked={
                                      field.value?.findIndex(
                                        (i) => i.id === player.id,
                                      ) > -1
                                    }
                                    onCheckedChange={(checked) => {
                                      return checked
                                        ? field.onChange([
                                            ...field.value,
                                            player,
                                          ])
                                        : field.onChange(
                                            field.value?.filter(
                                              (value) => value.id !== player.id,
                                            ),
                                          );
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="text-sm font-normal flex items-center gap-2 w-full justify-between">
                                  <div className="flex items-center gap-2">
                                    <Avatar>
                                      <AvatarImage
                                        src={player.imageUrl ?? ""}
                                        alt={player.name}
                                      />
                                      <AvatarFallback className="bg-slate-300">
                                        <User />
                                      </AvatarFallback>
                                    </Avatar>
                                    <span className="text-lg font-semibold">
                                      {player.name}
                                    </span>
                                  </div>

                                  <div className="w-10 h-10 rounded-sm bg-background flex items-center justify-center">
                                    {player.matches}
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
