"use client";

import { useCallback } from "react";

import type { MatchInput } from "../types/input";
import { MatchTextFieldDialog } from "~/components/match/match-text-field-dialog";
import { MATCH_METADATA_AUTOSAVE_MS } from "~/hooks/match/autosave/constants";
import { useUpdateMatchDetailsMutation } from "~/hooks/mutations/match/scoresheet";

export function DetailDialog({
  match,
  data,
  placeholder,
  canEdit,
}: {
  match: MatchInput;
  data: {
    id: number;
    name: string;
    details: string | null;
    type: "player" | "team";
  };
  placeholder?: string;
  canEdit: boolean;
}) {
  const { updateMatchDetailsMutation } = useUpdateMatchDetailsMutation(match);

  const onSave = useCallback(
    async (normalized: string) => {
      const details = normalized === "" ? null : normalized;
      if (data.type === "player") {
        await updateMatchDetailsMutation.mutateAsync({
          type: "player",
          match,
          id: data.id,
          details,
        });
      } else {
        await updateMatchDetailsMutation.mutateAsync({
          type: "team",
          match,
          teamId: data.id,
          details,
        });
      }
    },
    [data.id, data.type, match, updateMatchDetailsMutation],
  );

  const dialogTitle =
    data.type === "team"
      ? `Team ${data.name} Details`
      : `Player ${data.name} Details`;

  return (
    <MatchTextFieldDialog
      canEdit={canEdit}
      serverValue={data.details}
      debounceMs={MATCH_METADATA_AUTOSAVE_MS}
      dialogTitle={dialogTitle}
      fieldLabel="Details"
      rows={6}
      emptyLabel={placeholder ?? ""}
      onSave={onSave}
      isMutationPending={updateMatchDetailsMutation.isPending}
      collapsedScrollable
      collapsedScrollMaxClass="h-10 max-h-10"
      dialogContentClassName="max-h-[min(92vh,900px)] w-full max-w-[min(36rem,calc(100vw-1rem))] gap-4 overflow-y-auto sm:max-w-xl"
      dialogTextareaClassName="field-sizing-fixed max-h-[65vh] min-h-52 overflow-y-auto md:max-h-[50vh]"
      className="h-full min-h-10 min-w-0 max-w-full overflow-hidden"
      collapsedClassName="min-h-10 w-full min-w-0 border-0 bg-transparent px-2 py-1 text-start text-sm shadow-none"
      triggerClassName="h-full min-h-10 w-full min-w-0 justify-start rounded-none border-0 bg-transparent p-0 shadow-none hover:bg-muted/30 focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=open]:bg-muted/20"
    />
  );
}
