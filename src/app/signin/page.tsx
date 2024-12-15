"use server";

import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";

import { LoginForm } from "./_components/login-form";

export default async function LoginPage() {
  const { userId } = await auth();

  if (userId) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <LoginForm />
      </div>
    </div>
  );
}
