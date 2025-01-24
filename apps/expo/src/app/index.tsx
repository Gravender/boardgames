import { Link } from "expo-router";
import { SignedIn, SignedOut, useClerk, useUser } from "@clerk/clerk-expo";

import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { Text } from "~/components/ui/text";

export default function Index() {
  const { user } = useUser();
  const { signOut } = useClerk();
  return (
    <Card className="bg-card">
      <SignedIn>
        <Text>Hello {user?.fullName}</Text>
        <Button onPress={() => signOut()}>
          <Text>Sign Out</Text>
        </Button>
      </SignedIn>
      <SignedOut>
        <Link href="/(auth)/sign-in">
          <Text>Sign in</Text>
        </Link>
        <Link href="/(auth)/sign-up">
          <Text>Sign up</Text>
        </Link>
      </SignedOut>
    </Card>
  );
}
