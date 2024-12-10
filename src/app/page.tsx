import { redirect } from "next/navigation";

export default function Home() {
  redirect("/dashboard");
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-black text-white">
      <div className="container flex flex-col items-center justify-center gap-12 px-4 py-16">
        <div className="flex flex-col items-center gap-2">
          <p className="text-2xl text-white">test</p>
        </div>
      </div>
    </main>
  );
}
