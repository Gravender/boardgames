import { Text, View } from "react-native";
import { Link } from "expo-router";
import { SignedIn, SignedOut, useUser } from "@clerk/clerk-expo";

export default function Page() {
  const { user } = useUser();

  return (
    <View>
      <SignedIn>
        <Text>Hello {user?.fullName}</Text>
      </SignedIn>
      <SignedOut>
        <Link href="/(auth)/sign-in">
          <Text>Sign in</Text>
        </Link>
        <Link href="/(auth)/sign-up">
          <Text>Sign up</Text>
        </Link>
      </SignedOut>
    </View>
  );
}
