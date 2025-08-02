import * as React from "react";
import { Button, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";

import { authClient } from "~/utils/auth";

export default function SignUpScreen() {
  const router = useRouter();

  const [emailAddress, setEmailAddress] = React.useState("");
  const [name, setName] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [username, setUsername] = React.useState("");

  const handleSignUpWithGitHub = React.useCallback(async () => {
    try {
      await authClient.signIn.social({
        provider: "github",
        callbackURL: "/",
      });
    } catch (err) {
      console.log("error signing up with GitHub", err);
    }
  }, []);

  const handleSignUpWithGoogle = React.useCallback(async () => {
    try {
      await authClient.signIn.social({
        provider: "google",
        callbackURL: "/",
      });
    } catch (err) {
      console.log("error signing up with Google", err);
    }
  }, []);

  // Handle submission of sign-up form
  const onSignUpPress = async () => {
    try {
      await authClient.signUp.email({
        email: emailAddress,
        name,
        username,
        password,
      });
      router.replace("/");
    } catch (err) {
      console.error("Sign up error:", err);
    }
  };

  return (
    <View>
      <>
        <Text>Sign up</Text>
        <Button title="Sign up with GitHub" onPress={handleSignUpWithGitHub} />
        <Button title="Sign Up with Google" onPress={handleSignUpWithGoogle} />
        <TextInput
          autoCapitalize="none"
          value={emailAddress}
          placeholder="Enter email"
          onChangeText={(email) => setEmailAddress(email)}
        />
        <TextInput
          value={name}
          placeholder="Enter name"
          onChangeText={(name) => setName(name)}
        />
        <TextInput
          value={username}
          placeholder="Enter username"
          onChangeText={(username) => setUsername(username)}
        />
        <TextInput
          value={password}
          placeholder="Enter password"
          secureTextEntry={true}
          onChangeText={(password) => setPassword(password)}
        />
        <Button title="Continue" onPress={onSignUpPress} />
      </>
    </View>
  );
}
