"use client";

import * as Clerk from "@clerk/elements/common";
import * as SignIn from "@clerk/elements/sign-in";

import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Icons } from "~/components/ui/icons";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen w-full justify-center p-6 md:p-10">
      <div className="w-full max-w-sm pt-10">
        <div className="grid w-full grow items-center px-4 sm:justify-center">
          <SignIn.Root>
            <Clerk.Loading>
              {(isGlobalLoading) => (
                <>
                  <SignIn.Step name="start">
                    <Card className="w-full sm:w-96 shadow-lg">
                      <CardHeader>
                        <CardTitle>Sign in to Board Games Tracker</CardTitle>
                        <CardDescription>
                          Welcome back! Please sign in to continue
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="grid gap-y-4">
                        <div className="grid grid-cols-2 gap-x-4">
                          <Clerk.Connection name="github" asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              type="button"
                              disabled={isGlobalLoading}
                            >
                              <Clerk.Loading scope="provider:github">
                                {(isLoading) =>
                                  isLoading ? (
                                    <Icons.spinner className="size-4 animate-spin" />
                                  ) : (
                                    <>
                                      <Icons.gitHub className="mr-2 size-4" />
                                      GitHub
                                    </>
                                  )
                                }
                              </Clerk.Loading>
                            </Button>
                          </Clerk.Connection>
                          <Clerk.Connection name="google" asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              type="button"
                              disabled={isGlobalLoading}
                            >
                              <Clerk.Loading scope="provider:google">
                                {(isLoading) =>
                                  isLoading ? (
                                    <Icons.spinner className="size-4 animate-spin" />
                                  ) : (
                                    <>
                                      <Icons.google className="mr-2 size-4" />
                                      Google
                                    </>
                                  )
                                }
                              </Clerk.Loading>
                            </Button>
                          </Clerk.Connection>
                        </div>
                      </CardContent>
                      <CardFooter>
                        <div className="grid w-full gap-y-4">
                          <Button variant="link" size="sm" asChild>
                            <Clerk.Link navigate="sign-up">
                              Don&apos;t have an account? Sign up
                            </Clerk.Link>
                          </Button>
                        </div>
                      </CardFooter>
                    </Card>
                  </SignIn.Step>
                </>
              )}
            </Clerk.Loading>
          </SignIn.Root>
        </div>
      </div>
    </div>
  );
}
