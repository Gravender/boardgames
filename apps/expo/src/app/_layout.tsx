import type { Theme } from "@react-navigation/native";
import { Drawer } from "expo-router/drawer";
import { StatusBar } from "expo-status-bar";
import { ClerkLoaded, ClerkProvider } from "@clerk/clerk-expo";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { PortalHost } from "@rn-primitives/portal";

import { setAndroidNavigationBar } from "~/lib/android-navigation-bar";
import { NAV_THEME } from "~/lib/constants";
import { useColorScheme } from "~/lib/useColorScheme";
import { TRPCProvider } from "~/utils/api";
import { tokenCache } from "~/utils/cache";

import "../styles.css";

import { useLayoutEffect, useRef, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { ThemeToggle } from "~/components/ThemeToggle";
import { Text } from "~/components/ui/text";
import { Dices } from "~/lib/icons/Dices";

const LIGHT_THEME: Theme = {
  ...DefaultTheme,
  colors: NAV_THEME.light,
};
const DARK_THEME: Theme = {
  ...DarkTheme,
  colors: NAV_THEME.dark,
};

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from "expo-router";

export default function RootLayout() {
  const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;

  if (!publishableKey) {
    throw new Error("Add EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY to your .env file");
  }
  const hasMounted = useRef(false);
  const { colorScheme, isDarkColorScheme } = useColorScheme();
  const [isColorSchemeLoaded, setIsColorSchemeLoaded] = useState(false);
  useLayoutEffect(() => {
    if (hasMounted.current) {
      return;
    }
    setAndroidNavigationBar(colorScheme);
    setIsColorSchemeLoaded(true);
    hasMounted.current = true;
  }, []);

  if (!isColorSchemeLoaded) {
    return null;
  }

  return (
    <ClerkProvider tokenCache={tokenCache} publishableKey={publishableKey}>
      <TRPCProvider>
        <ClerkLoaded>
          <ThemeProvider value={isDarkColorScheme ? DARK_THEME : LIGHT_THEME}>
            <StatusBar style={isDarkColorScheme ? "light" : "dark"} />
            <GestureHandlerRootView style={{ flex: 1 }}>
              <Drawer
                screenOptions={{
                  drawerStyle: {
                    backgroundColor: isDarkColorScheme
                      ? "hsl(240, 5.9%, 10%)"
                      : "hsl(0, 0%, 98%)",
                  },
                  drawerLabelStyle: {
                    color: isDarkColorScheme
                      ? "hsl(240, 4.8%, 95.9%)"
                      : "hsl(240, 5.9%, 10%)",
                  },
                  headerTitle(props) {
                    return (
                      <Text className="text-xl font-semibold">
                        {toOptions(props.children)}
                      </Text>
                    );
                  },
                  headerRight: () => <ThemeToggle />,
                }}
              >
                <Drawer.Screen
                  name="index"
                  options={{ drawerLabel: "home", title: "Home" }}
                />
                <Drawer.Screen
                  name="games/index"
                  options={{
                    drawerLabel: "Games",
                    title: "Games",
                    drawerIcon: () => (
                      <Dices
                        className="text-primary"
                        size={25}
                        strokeWidth={1.5}
                      />
                    ),
                  }}
                />
              </Drawer>
              <PortalHost />
            </GestureHandlerRootView>
          </ThemeProvider>
        </ClerkLoaded>
      </TRPCProvider>
    </ClerkProvider>
  );
}
function toOptions(name: string) {
  const title = name
    .split("-")
    .map(function (str: string) {
      return str.replace(/\b\w/g, function (char) {
        return char.toUpperCase();
      });
    })
    .join(" ");
  return title;
}
