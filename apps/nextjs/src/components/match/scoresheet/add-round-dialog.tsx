import type { z } from "zod/v4";
import { useState } from "react";
import { ListPlus } from "lucide-react";

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
import { Field, FieldError, FieldLabel } from "@board-games/ui/field";

import type { MatchInput } from "../types/input";
import { GradientPicker } from "~/components/color-picker";
import { useAppForm } from "~/hooks/form";
import { useAddRoundMutation } from "~/hooks/mutations/match/scoresheet";
import { usePlayersAndTeams, useScoresheet } from "~/hooks/queries/match/match";

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
  const { scoresheet } = useScoresheet(match);
  const { players } = usePlayersAndTeams(match);
  const { addRoundMutation } = useAddRoundMutation(match);

  const form = useAppForm({
    defaultValues: {
      name: `Round ${scoresheet.rounds.length + 1}`,
      type: "Numeric",
      color: "#cbd5e1",
      score: 0,
    } as z.infer<typeof RoundSchema>,
    validators: {
      onSubmit: RoundSchema,
    },
    onSubmit: ({ value }) => {
      addRoundMutation.mutate(
        {
          round: {
            ...value,
            order: scoresheet.rounds.length + 1,
            scoresheetId: scoresheet.id,
          },
          players: players.map((player) => ({
            matchPlayerId: player.baseMatchPlayerId,
          })),
        },
        {
          onSuccess: () => {
            setOpen(false);
            form.reset();
          },
        },
      );
    },
  });

  const roundsTypeOptions = roundTypes.map((value) => ({
    label: value,
    value,
  }));
  return (
    <>
      <DialogHeader>
        <DialogTitle>Add Round</DialogTitle>
      </DialogHeader>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          await form.handleSubmit();
        }}
        className="space-y-8"
      >
        <div className="flex w-full items-center gap-2">
          <form.Field name="color">
            {(field) => {
              const isInvalid =
                field.state.meta.isTouched && !field.state.meta.isValid;
              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel className="hidden">Round Color</FieldLabel>
                  <GradientPicker
                    color={field.state.value ?? null}
                    setColor={field.handleChange}
                  />
                  {isInvalid && <FieldError errors={field.state.meta.errors} />}
                </Field>
              );
            }}
          </form.Field>
          <form.AppField name="name">
            {(field) => (
              <field.TextField
                label="Round Name"
                hideLabel
                placeholder="Round name"
              />
            )}
          </form.AppField>
        </div>
        <div className="flex w-full items-center gap-4">
          <form.AppField name="type">
            {(field) => (
              <field.SelectField
                label="Scoring Type"
                values={roundsTypeOptions}
              />
            )}
          </form.AppField>
          <form.Subscribe selector={(state) => ({ type: state.values.type })}>
            {({ type }) => {
              if (type === "Checkbox") {
                return (
                  <form.AppField name="score">
                    {(field) => (
                      <field.NumberField label="Score" placeholder="Score" />
                    )}
                  </form.AppField>
                );
              }
              return null;
            }}
          </form.Subscribe>
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
          <form.AppForm>
            <form.SubscribeButton label="Submit" />
          </form.AppForm>
        </DialogFooter>
      </form>
    </>
  );
};
