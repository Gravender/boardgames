"use client";

import * as Clerk from "@clerk/elements/common";
import * as SignUp from "@clerk/elements/sign-up";

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

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen w-full justify-center p-6 md:p-10">
      <div className="w-full max-w-sm pt-10">
        <div className="grid w-full grow items-center px-4 sm:justify-center">
          <SignUp.Root>
            <Clerk.Loading>
              {(isGlobalLoading) => (
                <>
                  <SignUp.Step name="start">
                    <Card className="w-full sm:w-96 shadow-lg">
                      <CardHeader>
                        <CardTitle>Create your account</CardTitle>
                        <CardDescription>
                          Welcome! Please fill in the details to get started.
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
                            <Clerk.Link navigate="sign-in">
                              Already have an account? Sign in
                            </Clerk.Link>
                          </Button>
                        </div>
                      </CardFooter>
                    </Card>
                  </SignUp.Step>
                </>
              )}
            </Clerk.Loading>
          </SignUp.Root>
        </div>
      </div>
    </div>
  );
}
