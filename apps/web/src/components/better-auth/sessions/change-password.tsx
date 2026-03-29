import type { ComponentProps } from "react";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { EyeIcon, EyeOffIcon, Loader2 } from "lucide-react";
import z from "zod/v4";

import { Button } from "@board-games/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@board-games/ui/card";
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
import { cn } from "@board-games/ui/utils";

import { authClient } from "~/auth/client";
import { InputFieldSkeleton } from "~/components/input-field-skeleton";
import { useListAccounts } from "~/hooks/queries/auth";

export function ChangePasswordCard() {
  const { data: sessionData } = authClient.useSession();
  const { accounts, isLoading } = useListAccounts();
  const formSchema = z
    .object({
      currentPassword: z.string().min(8),
      newPassword: z.string().min(8),
      confirmPassword: z.string().min(8),
    })
    .check((ctx) => {
      if (ctx.value.newPassword !== ctx.value.confirmPassword) {
        ctx.issues.push({
          code: "custom",
          input: ctx.value.confirmPassword,
          message: "Passwords do not match",
          path: ["confirmPassword"],
        });
      }
    });

  const form = useForm({
    schema: formSchema,
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });
  const changePassword = useMutation({
    mutationKey: ["setPassword"],
    mutationFn: async ({
      currentPassword,
      newPassword,
    }: {
      currentPassword: string;
      newPassword: string;
    }) => {
      await authClient.changePassword({
        currentPassword,
        newPassword,
        revokeOtherSessions: true,
        fetchOptions: { throw: true },
      });
    },
    onSuccess: () => {
      form.reset();
      toast.success("Password changed successfully");
    },
    onError: (err) => {
      console.error(err);
      toast.error("Error changing password");
    },
  });
  const setPassword = useMutation({
    mutationKey: ["setPassword"],
    mutationFn: async () => {
      if (!sessionData) return;
      const email = sessionData.user.email;
      await authClient.requestPasswordReset({
        email,
        redirectTo: "/reset-password",
        fetchOptions: { throw: true },
      });
    },
    onSuccess: () => {
      toast.success("Check your email for the password reset link.");
    },
    onError: (err) => {
      console.error(err);
      toast.error("Error sending password reset email");
    },
  });
  const onSubmit = (data: z.infer<typeof formSchema>) => {
    changePassword.mutate({
      currentPassword: data.currentPassword,
      newPassword: data.newPassword,
    });
  };
  const { isSubmitting } = form.formState;

  const credentialsLinked = accounts?.some(
    (acc) => acc.providerId === "credential",
  );
  if (!isLoading && !credentialsLinked) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Set Password</CardTitle>
          <CardDescription>
            Click the button below to receive an email to set up a password for
            your account.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <CardAction>
            <Button
              onClick={() => setPassword.mutate()}
              disabled={setPassword.isPending}
            >
              Set Password
            </Button>
          </CardAction>
        </CardFooter>
      </Card>
    );
  }
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Card>
          <CardHeader>
            <CardTitle>Change Password</CardTitle>
            <CardDescription>
              Change your password and revoke other sessions.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6">
            {isLoading || !accounts ? (
              <>
                <InputFieldSkeleton />
                <InputFieldSkeleton />
                <InputFieldSkeleton />
              </>
            ) : (
              <>
                <FormField
                  control={form.control}
                  name="currentPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Current Password</FormLabel>

                      <FormControl>
                        <PasswordInput
                          autoComplete="current-password"
                          placeholder={"Enter your current password"}
                          disabled={isSubmitting}
                          {...field}
                        />
                      </FormControl>

                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="newPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New Password</FormLabel>

                      <FormControl>
                        <PasswordInput
                          autoComplete="new-password"
                          disabled={isSubmitting}
                          placeholder={"Enter your new password"}
                          enableToggle
                          {...field}
                        />
                      </FormControl>

                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm Password</FormLabel>

                      <FormControl>
                        <PasswordInput
                          autoComplete="new-password"
                          placeholder={"Confirm your new password"}
                          disabled={isSubmitting}
                          enableToggle
                          {...field}
                        />
                      </FormControl>

                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}
          </CardContent>
          <CardFooter className="bg-sidebar flex flex-col justify-between gap-4 rounded-b-xl md:flex-row">
            <CardDescription className="text-muted-foreground text-center text-xs md:text-start md:text-sm">
              Please use 8 characters at a minimum.
            </CardDescription>
            <Button
              type="submit"
              disabled={isSubmitting}
              variant="default"
              className="md:ms-auto"
            >
              {isSubmitting && <Loader2 className="animate-spin" />}
              Save
            </Button>
          </CardFooter>
        </Card>
      </form>
    </Form>
  );
}
function PasswordInput({
  className,
  enableToggle,
  onChange,
  ...props
}: ComponentProps<typeof Input> & { enableToggle?: boolean }) {
  const [disabled, setDisabled] = useState(true);
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="relative">
      <Input
        className={cn(enableToggle && "pr-10", className)}
        {...props}
        type={isVisible && enableToggle ? "text" : "password"}
        onChange={(event) => {
          setDisabled(!event.target.value);
          onChange?.(event);
        }}
      />

      {enableToggle && (
        <>
          <Button
            className="absolute top-0 right-0 !bg-transparent"
            disabled={disabled}
            size="icon"
            type="button"
            variant="ghost"
            onClick={() => setIsVisible(!isVisible)}
          >
            {isVisible ? <EyeIcon /> : <EyeOffIcon />}
          </Button>

          <style>{`
                        .hide-password-toggle::-ms-reveal,
                        .hide-password-toggle::-ms-clear {
                            visibility: hidden;
                            pointer-events: none;
                            display: none;
                        }
                    `}</style>
        </>
      )}
    </div>
  );
}
