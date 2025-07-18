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

export function DetailDialog({
  matchId,
  data,
  placeholder,
}: {
  matchId: number;
  data: {
    id: number;
    name: string;
    details: string | null;
    type: "Player" | "Team";
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
                <p className="whitespace-normal text-wrap break-words text-start">
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
        <Content setIsOpen={setIsOpen} matchId={matchId} data={data} />
      </DialogContent>
    </Dialog>
  );
}
const FormSchema = z.object({
  detail: z.string(),
});
function Content({
  matchId,
  data,
  setIsOpen,
}: {
  matchId: number;
  data: {
    id: number;
    name: string;
    details: string | null;
    type: "Player" | "Team";
  };
  setIsOpen: (isOpen: boolean) => void;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const updateDetails = useMutation(
    trpc.match.updateMatchDetails.mutationOptions({
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
    defaultValues: { detail: data.details ?? "" },
  });
  function onSubmitForm(values: z.infer<typeof FormSchema>) {
    updateDetails.mutate({
      id: data.id,
      type: data.type,
      details: values.detail,
    });
  }
  return (
    <>
      <DialogHeader>
        <DialogTitle>
          {data.type === "Team" ? `Team: ${data.name}` : data.name}
        </DialogTitle>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmitForm)} className="space-y-8">
          <FormField
            control={form.control}
            name="detail"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Details:</FormLabel>
                <FormControl>
                  <Textarea className="resize-none" {...field} />
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
