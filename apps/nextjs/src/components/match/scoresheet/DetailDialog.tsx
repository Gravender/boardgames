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
import { ScrollArea, ScrollBar } from "@board-games/ui/scroll-area";
import { Textarea } from "@board-games/ui/textarea";

import type { MatchInput } from "../types/input";
import { useUpdateMatchDetailsMutation } from "../hooks/scoresheet";

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
                <p className="text-start text-wrap break-words whitespace-normal">
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
  const form = useForm({
    schema: FormSchema,
    defaultValues: { detail: data.details ?? "" },
  });
  function onSubmitForm(values: z.infer<typeof FormSchema>) {
    if (data.type === "player") {
      updateMatchDetailsMutation.mutate(
        {
          type: "player",
          match: match,
          id: data.id,
          details: values.detail,
        },
        {
          onSuccess: () => {
            setIsOpen(false);
          },
        },
      );
    } else {
      updateMatchDetailsMutation.mutate(
        {
          type: "team",
          match: match,
          teamId: data.id,
          details: values.detail,
        },
        {
          onSuccess: () => {
            setIsOpen(false);
          },
        },
      );
    }
  }
  return (
    <>
      <DialogHeader>
        <DialogTitle>
          {data.type === "team" ? `Team: ${data.name}` : data.name}
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
