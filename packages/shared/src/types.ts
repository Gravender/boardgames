export type ImagePreviewType =
  | {
      type: "file";
      url: string;
    }
  | {
      type: "svg";
      name: string;
    }
  | null;
