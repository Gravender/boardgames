import { SignIn } from "@clerk/nextjs";

export function LoginForm() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <SignIn />
    </div>
  );
}
