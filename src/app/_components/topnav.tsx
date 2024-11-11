import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";
import { ModeToggle } from "~/components/theme-toggle";

export function TopNav() {
  return (
    <nav className="flex w-full items-center justify-end border-b p-4 text-xl font-semibold">
        <ModeToggle />
    </nav>
  );
}
