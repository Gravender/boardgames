import React, { useState } from "react";
import { View } from "react-native";
import Modal from "react-native-modal";

import { Button } from "~/components/ui/button";
import { CardContent, CardFooter } from "~/components/ui/card";
import { Text } from "~/components/ui/text";

export function AddPlayersModal() {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <View className="flex-1 items-center justify-center">
      <Button onPress={() => setIsVisible(true)}>
        <Text>Add Players</Text>
      </Button>
      <Modal
        isVisible={isVisible}
        onBackdropPress={() => setIsVisible(false)}
        // Animations that slide in/out from the right
        animationIn="fadeIn"
        animationOut="fadeOut"
        // Make sure we push it to the right side
        style={{
          margin: 0, // no outer margin
          justifyContent: "flex-end",
          alignItems: "flex-end",
        }}
      >
        {/* Right-side modal container */}
        <View className="h-full w-full bg-white p-4 dark:bg-neutral-900">
          <CardContent></CardContent>
          <CardFooter>
            <Button
              onPress={() => {
                setIsVisible(false);
              }}
            >
              <Text>Reset & Close</Text>
            </Button>
          </CardFooter>
        </View>
      </Modal>
    </View>
  );
}
