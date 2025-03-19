import { HydrateClient } from "~/trpc/server";
import UploadBGGdata from "./_components/uploadBGGdata";

// eslint-disable-next-line @typescript-eslint/require-await
export default async function Page() {
  return (
    <HydrateClient>
      <div className="flex w-full items-center justify-center">
        <UploadBGGdata />
      </div>
    </HydrateClient>
  );
}
