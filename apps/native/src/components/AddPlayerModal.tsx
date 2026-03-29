import React, { useState } from "react";
import { Modal, View } from "react-native";

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
        visible={isVisible}
        onRequestClose={() => setIsVisible(false)}
        animationType="fade"
        style={{
          margin: 0, // no outer margin
          justifyContent: "flex-end",
          alignItems: "flex-end",
        }}
      >
        {/* Right-side modal container */}
        <View className="h-full w-full bg-card">
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
