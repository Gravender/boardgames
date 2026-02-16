import { useState } from "react";
import { Loader2 } from "lucide-react";
import z from "zod/v4";

import { Button } from "@board-games/ui/button";
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@board-games/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Input } from "@board-games/ui/input";
import { toast } from "@board-games/ui/toast";

import { authClient } from "~/auth/client";
import { useListAccounts } from "~/hooks/queries/auth";
import { UserView } from "../user-view";

export function DeleteAccountCard() {
  const { accounts, isLoading } = useListAccounts();
  const [showDialog, setShowDialog] = useState(false);
  return (
    <div>
      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle>Delete Account</CardTitle>
          <CardDescription>
            Permanently remove your account and all of its contents. This action
            is not reversible, so please continue with caution.
          </CardDescription>
        </CardHeader>
        <CardFooter className="border-destructive/30 bg-destructive/15 flex flex-col justify-between gap-4 rounded-b-xl md:flex-row">
          <CardAction>
            <Button
              onClick={() => setShowDialog(true)}
              disabled={isLoading}
              variant="destructive"
            >
              Delete Account
            </Button>
          </CardAction>
        </CardFooter>
      </Card>

      <DeleteAccountDialog
        accounts={accounts ?? []}
        open={showDialog}
        onOpenChange={setShowDialog}
      />
    </div>
  );
}
function DeleteAccountDialog({
  accounts,
  open,
  onOpenChange,
}: {
  accounts: {
    id: string;
    providerId: string;
    createdAt: Date;
    updatedAt: Date;
    accountId: string;
    scopes: string[];
  }[];
  open?: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: sessionData } = authClient.useSession();
  const session = sessionData?.session;
  const user = sessionData?.user;

  const isFresh = session
    ? // eslint-disable-next-line react-hooks/purity
      Date.now() - new Date(session.createdAt).getTime() < 60 * 60 * 24 * 1000
    : false;
  const credentialsLinked = accounts.some(
    (acc) => acc.providerId === "credential",
  );

  const formSchema = z.object({
    password: credentialsLinked
      ? z.string().min(3, { message: "Password is required" })
      : z.string().optional(),
  });

  const form = useForm({
    schema: formSchema,
    defaultValues: {
      password: "",
    },
  });
  const { isSubmitting } = form.formState;
  const deleteAccount = async ({ password }: z.infer<typeof formSchema>) => {
    const params = {} as Record<string, string>;

    if (credentialsLinked) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      params.password = password!;
    } else if (!isFresh) {
      await authClient.signOut();
      return;
    }

    try {
      await authClient.deleteUser({
        ...params,
        fetchOptions: {
          throw: true,
        },
      });

      toast.success(
        "Please check your email to verify the deletion of your account.",
      );
    } catch (error) {
      toast.error("Error deleting account");
      console.error(error);
    }

    onOpenChange(false);
  };
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg md:text-xl">
            Delete Account
          </DialogTitle>

          <DialogDescription className="text-xs md:text-sm">
            Permanently remove your account and all of its contents. This action
            is not reversible, so please continue with caution.
          </DialogDescription>
        </DialogHeader>

        <Card className="my-2 flex-row p-4">
          <UserView user={user} />
        </Card>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(deleteAccount)}
            className="grid gap-6"
          >
            {credentialsLinked && (
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>

                    <FormControl>
                      <Input
                        autoComplete="current-password"
                        placeholder={"Enter your password"}
                        type="password"
                        {...field}
                      />
                    </FormControl>

                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="secondary"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>

              <Button
                disabled={isSubmitting}
                variant="destructive"
                type="submit"
              >
                {isSubmitting && <Loader2 className="animate-spin" />}
                {isFresh ? "Delete Account" : "Sign Out"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
