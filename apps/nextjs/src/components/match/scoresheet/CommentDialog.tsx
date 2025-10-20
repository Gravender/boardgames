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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  useForm,
} from "@board-games/ui/form";
import { ScrollArea } from "@board-games/ui/scroll-area";
import { Textarea } from "@board-games/ui/textarea";

import type { MatchInput } from "../types/input";
import { useUpdateMatchCommentMutation } from "~/components/match/hooks/scoresheet";

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
            <p className="max-h-[5vh] w-full text-wrap text-start">
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
  const form = useForm({
    schema: FormSchema,
    defaultValues: { comment },
  });
  function onSubmitForm(values: z.infer<typeof FormSchema>) {
    updateMatchCommentMutation.mutate(
      {
        match: match,
        comment: values.comment,
      },
      {
        onSuccess: () => {
          setIsOpen(false);
        },
      },
    );
  }
  return (
    <>
      <DialogHeader>
        <DialogTitle>Match Comment</DialogTitle>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmitForm)} className="space-y-8">
          <FormField
            control={form.control}
            name="comment"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="hidden">Comment:</FormLabel>
                <FormControl>
                  <Textarea {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
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
      </Form>
    </>
  );
}
