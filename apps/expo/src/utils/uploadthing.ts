import { generateReactNativeHelpers } from "@uploadthing/expo";

import type { uploadRouter } from "@board-games/api/uploadthing";

import { getBaseUrl } from "./base-url";

export const { useImageUploader, useDocumentUploader } =
  generateReactNativeHelpers<uploadRouter>({
    /**
     * Your server url.
     * @default process.env.EXPO_PUBLIC_SERVER_URL
     * @remarks In dev we will also try to use Expo.debuggerHost
     */
    url: `${getBaseUrl()}/api/uploadthing`,
  });
