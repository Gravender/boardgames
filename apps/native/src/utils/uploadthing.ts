import { generateReactNativeHelpers } from "@uploadthing/expo";

import type { uploadRouter } from "@board-games/api/uploadthing";

import { getBaseUrl } from "./base-url";

export const { useUploadThing } = generateReactNativeHelpers<uploadRouter>({
  url: `${getBaseUrl()}/api/uploadthing`,
});
