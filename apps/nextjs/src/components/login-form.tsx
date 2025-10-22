"use client";

import { useState } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Loader2 } from "lucide-react";
import { z } from "zod/v4";

import { Button } from "@board-games/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
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
import { Icons } from "@board-games/ui/icons";
import { Input } from "@board-games/ui/input";
import { toast } from "@board-games/ui/toast";
import { cn } from "@board-games/ui/utils";

import { authClient } from "~/auth/client";

const formSchema = z.object({
  username: z.string(),
  password: z.string().min(8),
});

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm({
    schema: formSchema,
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const signInWithGoogle = async () => {
    const res = await authClient.signIn.social({
      provider: "google",
      callbackURL: "/dashboard",
    });
    if (!res.data?.url) {
      throw new Error("No URL returned from signInSocial");
    } else {
      redirect(res.data.url);
    }
  };
  const signInWithGithub = async () => {
    const res = await authClient.signIn.social({
      provider: "github",
      callbackURL: "/dashboard",
    });
    if (!res.data?.url) {
      throw new Error("No URL returned from signInSocial");
    } else {
      redirect(res.data.url);
    }
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);

    await authClient.signIn.username({
      username: values.username,
      password: values.password,
      fetchOptions: {
        onSuccess: () => {
          toast.success("Successfully logged in");
          redirect("/dashboard");
        },
        onError: () => {
          toast.error("Invalid username or password");
        },
      },
    });

    setIsLoading(false);
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Welcome back</CardTitle>
          <CardDescription>Login with your Google account</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <div className="grid gap-6">
                <div className="flex flex-col gap-4">
                  <Button
                    variant="outline"
                    className="w-full"
                    type="button"
                    onClick={signInWithGoogle}
                  >
                    <Icons.google className="mr-2 size-4" />
                    Login with Google
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    type="button"
                    onClick={signInWithGithub}
                  >
                    <Icons.gitHub className="mr-2 size-4" />
                    Login with Github
                  </Button>
                </div>
                <div className="after:border-border relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t">
                  <span className="bg-card text-muted-foreground relative z-10 px-2">
                    Or continue with
                  </span>
                </div>
                <div className="grid gap-6">
                  <div className="grid gap-3">
                    <FormField
                      control={form.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Username</FormLabel>
                          <FormControl>
                            <Input placeholder="username" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid gap-3">
                    <div className="flex flex-col gap-2">
                      <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="********"
                                {...field}
                                type="password"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Link
                        href="/forgot-password"
                        className="ml-auto text-sm underline-offset-4 hover:underline"
                      >
                        Forgot your password?
                      </Link>
                    </div>
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      "Login"
                    )}
                  </Button>
                </div>
                <div className="text-center text-sm">
                  Don&apos;t have an account?{" "}
                  <Link href="/signup" className="underline underline-offset-4">
                    Sign up
                  </Link>
                </div>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
      <div className="*:[a]:hover:text-primary text-muted-foreground text-center text-xs text-balance *:[a]:underline *:[a]:underline-offset-4">
        By clicking continue, you agree to our{" "}
        <Link href="#">Terms of Service</Link> and{" "}
        <Link href="#">Privacy Policy</Link>.
      </div>
    </div>
  );
}
