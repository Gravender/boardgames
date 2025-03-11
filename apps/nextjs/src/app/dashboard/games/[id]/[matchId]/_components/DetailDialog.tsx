import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

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
} from "@board-games/ui/form";
import { Input } from "@board-games/ui/input";

import { api } from "~/trpc/react";

export function DetailDialog({
  matchId,
  matchPlayer,
}: {
  matchId: number;
  matchPlayer: {
    id: number;
    name: string;
    details: string | null;
  };
}) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          className="h-fit w-full min-w-20 items-start justify-start"
        >
          <span className="text-wrap text-start text-base text-primary">
            {matchPlayer.details ?? ""}
          </span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <Content
          setIsOpen={setIsOpen}
          matchId={matchId}
          matchPlayer={matchPlayer}
        />
      </DialogContent>
    </Dialog>
  );
}
const FormSchema = z.object({
  detail: z.string(),
});
function Content({
  matchId,
  matchPlayer,
  setIsOpen,
}: {
  matchId: number;
  matchPlayer: {
    id: number;
    name: string;
    details: string | null;
  };
  setIsOpen: (isOpen: boolean) => void;
}) {
  const utils = api.useUtils();
  const updateComment = api.match.updateMatchPlayerDetails.useMutation({
    onSuccess: () => {
      void utils.match.getMatch.invalidate({ id: matchId });
      setIsOpen(false);
    },
  });
  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: { detail: matchPlayer.details ?? "" },
  });
  function onSubmitForm(values: z.infer<typeof FormSchema>) {
    updateComment.mutate({
      matchPlayer: { id: matchPlayer.id },
      details: values.detail,
    });
  }
  return (
    <>
      <DialogHeader>
        <DialogTitle>{matchPlayer.name}</DialogTitle>
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
                  <Input {...field} />
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
