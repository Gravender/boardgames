import { createRouteHandler } from "uploadthing/next";

import { createUploadRouter } from "@board-games/file-upload";

import { auth } from "~/auth/server";

const uploadRouter = createUploadRouter(auth);

// Export routes for Next App Router
export const { GET, POST } = createRouteHandler({
  router: uploadRouter,
});
