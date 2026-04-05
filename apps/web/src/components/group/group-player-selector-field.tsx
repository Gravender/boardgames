"use client";

import type { RouterOutputs } from "@board-games/api";
import { Field, FieldError, FieldLabel } from "@board-games/ui/field";

import { withFieldGroup } from "~/hooks/form";

import { GroupPlayerPicker } from "./group-player-picker";

type OriginalPlayer = Extract<
  RouterOutputs["newPlayer"]["getPlayers"][number],
  { type: "original" }
>;

/** Keys map to form paths; only used for typing / wiring the field group lens. */
const defaultValues: {
  playerIds: number[];
} = {
  playerIds: [],
};

export const GroupPlayerSelectorField = withFieldGroup({
  defaultValues,
  props: {
    players: [] as readonly OriginalPlayer[],
    label: "Players",
    ariaLabel: undefined as string | undefined,
  },
  render: function Render({ group, players, label, ariaLabel }) {
    return (
      <group.AppField name="playerIds" mode="array">
        {(field) => {
          const selected = field.state.value;
          const isInvalid =
            field.state.meta.isTouched && !field.state.meta.isValid;
          return (
            <Field data-invalid={isInvalid} className="gap-2">
              <FieldLabel>{label}</FieldLabel>
              <GroupPlayerPicker
                players={players}
                selected={selected}
                onToggle={(playerId, index, newChecked) => {
                  if (newChecked) {
                    field.pushValue(playerId);
                    return;
                  }
                  field.removeValue(index);
                }}
                aria-label={ariaLabel}
              />
              {isInvalid && <FieldError errors={field.state.meta.errors} />}
            </Field>
          );
        }}
      </group.AppField>
    );
  },
});
