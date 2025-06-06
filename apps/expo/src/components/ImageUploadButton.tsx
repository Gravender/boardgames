import { useState } from "react";
import { Alert, Image } from "react-native";
import * as FileSystem from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import { useAuth } from "@clerk/clerk-expo";

import { Button } from "~/components/ui/button";
import { Text } from "~/components/ui/text";
import { useUploadThing } from "~/utils/uploadthing";

export default function ImageUploadButton() {
  const [image, setImage] = useState<string | null>(null);
  const { getToken } = useAuth();
  const { startUpload } = useUploadThing("imageUploader", {
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
  });
  async function onMediaCaptured(media: ImagePicker.ImagePickerAsset) {
    try {
      setImage(media.uri);
      console.log("Media URI:", media.uri);
      const fileInfo = await FileSystem.getInfoAsync(media.uri);
      if (!fileInfo.exists) {
        throw new Error("File does not exist");
      }

      // Create a file-like object that UploadThing can handle
      const fileToUpload = {
        name: media.fileName ?? "image.jpg",
        type: media.mimeType ?? media.type ?? "image/jpeg",
        uri: media.uri,
        size: fileInfo.size,
      } as unknown as File;
      await startUpload([fileToUpload], {
        usageType: "game",
      });
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
