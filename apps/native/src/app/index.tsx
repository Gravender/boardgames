import { View } from "react-native";

import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { Text } from "~/components/ui/text";
import { authClient } from "~/utils/auth";

export default function Index() {
  const { data: session } = authClient.useSession();

  return (
    <Card className="bg-card">
      {session !== null ? (
        <View>
          <Text>Hello {session.user.name}</Text>
          <Button onPress={() => authClient.signOut()}>
            <Text>Sign Out</Text>
          </Button>
        </View>
      ) : (
        <View>
          <Text>Not signed in</Text>
          <Button
            onPress={() =>
              authClient.signIn.social({
                provider: "github",
                callbackURL: "/",
              })
            }
          >
            <Text>Sign In with Github</Text>
          </Button>
          <Button
            onPress={() =>
              authClient.signIn.social({
                provider: "google",
                callbackURL: "/",
              })
            }
          >
            <Text>Sign In with Google</Text>
          </Button>
        </View>
      )}
    </Card>
  );
}
