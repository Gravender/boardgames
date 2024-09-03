
import { db } from "~/server/db";
import { HydrateClient } from "~/trpc/server";

export default async function Home() {
  const posts = await db.query.posts.findMany();
  console.log(posts);
  return (
    <HydrateClient>
      <main className="flex min-h-screen flex-col items-center justify-center bg-black text-white">
        <div className="container flex flex-col items-center justify-center gap-12 px-4 py-16">
         {posts.map((post) => (
            <div key={post.id}>
              <h1>{post.name}</h1>
              <p>{post.createdAt.toLocaleDateString()}</p>
            </div>
          ))}
        </div>
      </main>
    </HydrateClient>
  );
}
