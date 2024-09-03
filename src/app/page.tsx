
import { db } from "~/server/db";
import { api, HydrateClient } from "~/trpc/server";
import { LatestPost } from "./_components/post";

export default async function Home() {
  const posts = await db.query.posts.findMany();
  void api.post.getLatest.prefetch();
  console.log(posts);
  return (
    <HydrateClient>
      <main className="flex min-h-screen flex-col items-center justify-center bg-black text-white">
        <div className="container flex flex-col items-center justify-center gap-12 px-4 py-16">
         <LatestPost></LatestPost>
        </div>
      </main>
    </HydrateClient>
  );
}
