"use client";

import { useState } from "react";
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
import { ScrollArea, ScrollBar } from "@board-games/ui/scroll-area";

import type { MatchInput } from "../types/input";
import { useUpdateMatchDetailsMutation } from "~/hooks/mutations/match/scoresheet";
import { useAppForm } from "~/hooks/form";

export function DetailDialog({
  match,
  data,
  placeholder,
}: {
  match: MatchInput;
  data: {
    id: number;
    name: string;
    details: string | null;
    type: "player" | "team";
  };
  placeholder?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          className="w-full min-w-20 items-start justify-start p-0 px-1"
        >
          <ScrollArea>
            <div className="max-h-10 w-full">
              {data.details && data.details !== "" ? (
                <p className="text-start text-wrap wrap-break-word whitespace-normal">
                  {data.details}
                </p>
              ) : (
                <p>{placeholder ?? ""}</p>
              )}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <Content setIsOpen={setIsOpen} match={match} data={data} />
      </DialogContent>
    </Dialog>
  );
}
const FormSchema = z.object({
  detail: z.string(),
});
function Content({
  match,
  data,
  setIsOpen,
}: {
  match: MatchInput;
  data: {
    id: number;
    name: string;
    details: string | null;
    type: "player" | "team";
  };
  setIsOpen: (isOpen: boolean) => void;
}) {
  const { updateMatchDetailsMutation } = useUpdateMatchDetailsMutation(match);
  const form = useAppForm({
    defaultValues: { detail: data.details ?? "" },
    validators: {
      onSubmit: FormSchema,
    },
    onSubmit: async ({ value }) => {
      const trimmedDetail = value.detail.trim();
      const details = trimmedDetail === "" ? null : trimmedDetail;
      updateMatchDetailsMutation.mutate(
        data.type === "player"
          ? {
              type: "player",
              match,
              id: data.id,
              details,
            }
          : {
              type: "team",
              match,
              teamId: data.id,
              details,
            },
        {
          onSuccess: () => {
            setIsOpen(false);
          },
        },
      );
    },
  });
  return (
    <>
      <DialogHeader>
        <DialogTitle>
          {data.type === "team" ? `Team: ${data.name}` : data.name}
        </DialogTitle>
      </DialogHeader>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          await form.handleSubmit();
        }}
        className="space-y-8"
      >
        <form.AppField name="detail">
          {(field) => <field.TextAreaField label="Details" rows={6} />}
        </form.AppField>
        <DialogFooter className="flex gap-2">
          <Button
            variant="secondary"
            type="button"
            onClick={() => setIsOpen(false)}
          >
            Cancel
          </Button>
          <Button type="submit">Ok</Button>
        </DialogFooter>
      </form>
    </>
  );
}
