import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { ScrollArea, ScrollBar } from "@board-games/ui/scroll-area";
import { Textarea } from "@board-games/ui/textarea";

import { useTRPC } from "~/trpc/react";

export function CommentDialog({
  matchId,
  comment,
}: {
  matchId: number;
  comment: string | null;
}) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          className="h-fit min-h-12 min-w-[50%] max-w-full items-start justify-start"
        >
          <ScrollArea>
            <p className="max-h-[10vh] w-full text-wrap text-start text-base text-primary">
              <b className="text-lg font-semibold text-primary">Comment:</b>
              {comment ?? "No comment"}
            </p>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <Content
          setIsOpen={setIsOpen}
          matchId={matchId}
          comment={comment ?? ""}
        />
      </DialogContent>
    </Dialog>
  );
}
const FormSchema = z.object({
  comment: z.string(),
});
function Content({
  matchId,
  comment,
  setIsOpen,
}: {
  matchId: number;
  setIsOpen: (isOpen: boolean) => void;
  comment: string;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const updateComment = useMutation(
    trpc.match.updateMatchComment.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.match.getMatch.queryOptions({ id: matchId }),
        );

        setIsOpen(false);
      },
    }),
  );
  const form = useForm({
    schema: FormSchema,
    defaultValues: { comment },
  });
  function onSubmitForm(values: z.infer<typeof FormSchema>) {
    updateComment.mutate({
      match: { id: matchId },
      comment: values.comment,
    });
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
