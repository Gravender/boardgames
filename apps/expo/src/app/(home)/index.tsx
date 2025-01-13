import { Button, Text, View } from "react-native";
import { Link } from "expo-router";
import { SignedIn, SignedOut, useClerk, useUser } from "@clerk/clerk-expo";

export default function Page() {
  const { user } = useUser();
  const { signOut } = useClerk();
  return (
    <View className="bg-card">
      <SignedIn>
        <Text>Hello {user?.fullName}</Text>
        <Button title="Sign Out" onPress={() => signOut()} />
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
