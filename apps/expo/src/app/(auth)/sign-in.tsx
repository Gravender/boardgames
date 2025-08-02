import React from "react";
import { Button, Text, TextInput, View } from "react-native";
import { Link, useRouter } from "expo-router";

import { authClient } from "~/utils/auth";

export default function Page() {
  const router = useRouter();

  const [emailAddress, setEmailAddress] = React.useState("");
  const [password, setPassword] = React.useState("");

  // Handle the submission of the sign-in form
  const onSignInPress = React.useCallback(async () => {
    try {
      await authClient.signIn.email({
        email: emailAddress,
        password,
      });
      router.replace("/");
    } catch (err) {
      console.error("Sign in error:", err);
    }
  }, [emailAddress, password, router]);

  const handleSignInWithGitHub = React.useCallback(async () => {
    try {
      await authClient.signIn.social({
        provider: "github",
        callbackURL: "/",
      });
    } catch (err) {
      console.log("error signing in with GitHub", err);
    }
  }, []);

  const handleSignInWithGoogle = React.useCallback(async () => {
    try {
      await authClient.signIn.social({
        provider: "google",
        callbackURL: "/",
      });
    } catch (err) {
      console.log("error signing in with Google", err);
    }
  }, []);

  return (
    <View>
      <Button title="Sign in with GitHub" onPress={handleSignInWithGitHub} />
      <Button title="Sign in with Google" onPress={handleSignInWithGoogle} />
      <TextInput
        autoCapitalize="none"
        value={emailAddress}
        placeholder="Enter email"
        onChangeText={(emailAddress) => setEmailAddress(emailAddress)}
      />
      <TextInput
        value={password}
        placeholder="Enter password"
        secureTextEntry={true}
        onChangeText={(password) => setPassword(password)}
      />
      <Button title="Sign in" onPress={onSignInPress} />

      <View>
        <Text>Don't have an account?</Text>
        <Link href="/sign-up">
          <Text>Sign up</Text>
        </Link>
      </View>
    </View>
  );
}
