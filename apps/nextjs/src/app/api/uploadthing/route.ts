import { createRouteHandler } from "uploadthing/next";

import { uploadRouter } from "@board-games/api/uploadthing";

// Export routes for Next App Router
export const { GET, POST } = createRouteHandler({
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  router: uploadRouter,
});
