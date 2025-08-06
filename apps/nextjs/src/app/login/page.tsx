import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { Button } from "@board-games/ui/button";

import { LoginForm } from "~/components/login-form";

export default function LoginPage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted p-6 md:p-10">
      <Link href="/" className="absolute left-5 top-5">
        <Button variant="ghost">
          <ChevronLeft />
          back
        </Button>
      </Link>

      <div className="flex w-full max-w-sm flex-col gap-6">
        <Link
          href="/"
          className="flex items-center gap-2 self-center font-medium"
        >
          Board Games Tracker
        </Link>
        <LoginForm />
      </div>
    </div>
  );
}
