import {
  generateReactHelpers,
  generateUploadButton,
  generateUploadDropzone,
} from "@uploadthing/react";

import type { uploadRouter } from "@board-games/api/uploadthing";

export const UploadButton = generateUploadButton<uploadRouter>();
export const UploadDropzone = generateUploadDropzone<uploadRouter>();

export const { useUploadThing, uploadFiles } =
  generateReactHelpers<uploadRouter>();
