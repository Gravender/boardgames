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
import { ScrollArea } from "@board-games/ui/scroll-area";

import type { MatchInput } from "../types/input";
import { useUpdateMatchCommentMutation } from "~/hooks/mutations/match/scoresheet";
import { useAppForm } from "~/hooks/form";

export function CommentDialog({
  match,
  comment,
}: {
  match: MatchInput;
  comment: string | null;
}) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          className="h-fit w-full items-start justify-start p-0"
        >
          <ScrollArea>
            <p className="max-h-[5vh] w-full text-start text-wrap">
              {comment ?? "No comment"}
            </p>
          </ScrollArea>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <Content setIsOpen={setIsOpen} match={match} comment={comment ?? ""} />
      </DialogContent>
    </Dialog>
  );
}
const FormSchema = z.object({
  comment: z.string(),
});
function Content({
  match,
  comment,
  setIsOpen,
}: {
  match: MatchInput;
  setIsOpen: (isOpen: boolean) => void;
  comment: string;
}) {
  const { updateMatchCommentMutation } = useUpdateMatchCommentMutation(match);
  const form = useAppForm({
    defaultValues: { comment },
    validators: {
      onSubmit: FormSchema,
    },
    onSubmit: ({ value }) => {
      updateMatchCommentMutation.mutate(
        {
          match,
          comment: value.comment,
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
        <DialogTitle>Match Comment</DialogTitle>
      </DialogHeader>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          await form.handleSubmit();
        }}
        className="space-y-8"
      >
        <form.AppField name="comment">
          {(field) => (
            <field.TextAreaField label="Comment" hideLabel rows={4} />
          )}
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
