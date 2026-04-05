"use client";

import type { RouterOutputs } from "@board-games/api";
import { Field, FieldError, FieldLabel } from "@board-games/ui/field";

import { useFieldContext } from "~/hooks/form-context";

import { GroupPlayerPicker } from "~/components/group/group-player-picker";

type OriginalPlayer = Extract<
  RouterOutputs["newPlayer"]["getPlayers"][number],
  { type: "original" }
>;

/**
 * Array field (`mode="array"`) for `number[]` player ids — uses TanStack Form
 * field context + array `pushValue` / `removeValue` (see Arrays guide).
 */
export const GroupPlayerIdsField = ({
  players,
  label = "Players",
  "aria-label": ariaLabel,
}: {
  players: readonly OriginalPlayer[];
  label?: string;
  "aria-label"?: string;
}) => {
  const field = useFieldContext<number[]>();
  const selected = field.state.value;
  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

  return (
    <Field data-invalid={isInvalid} className="gap-2">
      <FieldLabel>{label}</FieldLabel>
      <GroupPlayerPicker
        players={players}
        selected={selected}
        onToggle={(playerId, index, isChecked) => {
          if (isChecked) {
            field.removeValue(index);
            return;
          }
          field.pushValue(playerId);
        }}
        aria-label={ariaLabel}
      />
      {isInvalid && <FieldError errors={field.state.meta.errors} />}
    </Field>
  );
};
