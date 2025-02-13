import { useState } from "react";
import { Alert, Image } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useAuth } from "@clerk/clerk-expo";

import { Button } from "~/components/ui/button";
import { Text } from "~/components/ui/text";
import { useUploadThing } from "~/utils/uploadthing";

export default function ImageUploadButton() {
  const [image, setImage] = useState<string | null>(null);
  const { getToken } = useAuth();
  const { startUpload, routeConfig } = useUploadThing("imageUploader", {
    /**
     * Set clerk headers for authentication
     */
    headers: async () => {
      const authToken = await getToken();
      return { Authorization: authToken ?? undefined };
    },
    onClientUploadComplete: () => Alert.alert("Upload Completed"),
    onUploadError: (error) => {
      console.log("Error: ", error);
      Alert.alert("Upload Error", error.message);
    },
    onUploadBegin: (fileName) => {
      console.log("upload has begun for", fileName);
    },
    onUploadProgress(p) {
      console.log("upload progress", p);
    },
  });
  async function onMediaCaptured(media: ImagePicker.ImagePickerAsset) {
    try {
      setImage(media.uri);
      console.log("Media URI:", media.uri);
      const response = await fetch(media.uri);
      if (!response.ok) throw new Error("Failed to fetch media file");

      const blob = await response.blob();
      console.log("Blob size:", blob.size);

      if (blob.size === 0) throw new Error("Blob is empty");
      const fileName =
        media.fileName ?? media.uri.split("/").pop() ?? "unknown.jpg";
      const file = new File([blob], fileName, {
        type: blob.type || "image/jpeg",
        lastModified: new Date().getTime(),
      });
      const rnCompatibleFile = Object.assign(file, { uri: media.uri });
      console.log("Uploading file:", rnCompatibleFile);
      const uploadResult = await startUpload([rnCompatibleFile]);
    } catch (error) {
      console.error("Upload error:", error);
    }
  }

  async function pickImage() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison
    if (status !== "granted") {
      Alert.alert(
        "Permission required",
        "Camera roll permissions are required.",
      );
      return;
    }

    const response = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      allowsEditing: false,
      quality: 1,
    });

    if (!response.canceled) {
      const [media] = response.assets;
      if (media) {
        await onMediaCaptured(media);
      }
    }
  }
  return (
    <>
      <Button variant="secondary" onPress={pickImage}>
        <Text>Upload Game</Text>
      </Button>
      {image && (
        <Image
          source={{ uri: image }}
          style={{
            width: 200,
            height: 200,
          }}
        />
      )}
    </>
  );
}
