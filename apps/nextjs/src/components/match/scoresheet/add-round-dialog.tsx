import type { z } from "zod/v4";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ListPlus } from "lucide-react";
import { usePostHog } from "posthog-js/react";

import { roundTypes } from "@board-games/db/constants";
import { insertRoundSchema } from "@board-games/db/zodSchema";
import { Button } from "@board-games/ui/button";
import {
  Dialog,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@board-games/ui/select";
import { toast } from "@board-games/ui/toast";

import type { MatchInput } from "../types/input";
import { GradientPicker } from "~/components/color-picker";
import {
  usePlayersAndTeams,
  useScoresheet,
} from "~/components/match/hooks/suspenseQueries";
import { NumberInput } from "~/components/number-input";
import { Spinner } from "~/components/spinner";
import { useTRPC } from "~/trpc/react";

export const AddRoundDialog = ({ match }: { match: MatchInput }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <AddRoundDialogContent match={match} setOpen={setIsOpen} />
      </DialogContent>
      <Button
        variant="ghost"
        size="icon"
        type="button"
        onClick={() => setIsOpen(true)}
      >
        <ListPlus className="text-secondary-foreground" />
      </Button>
    </Dialog>
  );
};

const RoundSchema = insertRoundSchema.pick({
  name: true,
  type: true,
  color: true,
  score: true,
});
const AddRoundDialogContent = ({
  match,
  setOpen,
}: {
  match: MatchInput;
  setOpen: (isOpen: boolean) => void;
}) => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const router = useRouter();
  const posthog = usePostHog();
  const { scoresheet } = useScoresheet(match);
  const { players } = usePlayersAndTeams(match);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm({
    schema: RoundSchema,
    defaultValues: {
      name: `Round ${scoresheet.rounds.length + 1}`,
      type: "Numeric",
      color: "#cbd5e1",
      score: 0,
    },
  });

  const addRound = useMutation(
    trpc.round.addRound.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries();
        posthog.capture("round added to match", {
          input: match,
        });
        router.refresh();
        setIsSubmitting(false);
        setOpen(false);
        form.reset();
      },
      onError: (error) => {
        posthog.capture("round added to match error", { error });
        toast.error("Error", {
          description: "There was a problem adding your round.",
        });
      },
    }),
  );
  function onSubmitForm(values: z.infer<typeof RoundSchema>) {
    setIsSubmitting(true);
    addRound.mutate({
      round: {
        ...values,
        order: scoresheet.rounds.length + 1,
        scoresheetId: scoresheet.id,
      },
      players: players.map((player) => ({
        matchPlayerId: player.baseMatchPlayerId,
      })),
    });
  }

  const roundsTypeOptions = roundTypes;
  return (
    <>
      <DialogHeader>
        <DialogTitle>Add Round</DialogTitle>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmitForm)} className="space-y-8">
          <div className="flex w-full items-center gap-2">
            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="hidden">Round Color</FormLabel>
                  <FormControl>
                    <GradientPicker
                      color={field.value ?? null}
                      setColor={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem className="flex grow space-y-0">
                  <FormLabel className="hidden">Round Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Round name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="flex w-full items-center gap-4">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem className="w-28">
                  <FormLabel>Scoring Type</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a win condition" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {roundsTypeOptions.map((condition) => (
                        <SelectItem key={condition} value={condition}>
                          {condition}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            {form.getValues("type") === "Checkbox" && (
              <FormField
                control={form.control}
                name={"score"}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Score</FormLabel>

                    <FormControl>
                      <NumberInput
                        defaultValue={field.value}
                        onValueChange={field.onChange}
                        className="text-center"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button
              type="reset"
              variant="secondary"
              onClick={() => {
                form.reset();
                setOpen(false);
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
          </DialogFooter>
        </form>
      </Form>
    </>
  );
};
