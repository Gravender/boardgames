import type { Theme } from "@react-navigation/native";
import { useColorScheme } from "react-native";
import { Drawer } from "expo-router/drawer";
import { StatusBar } from "expo-status-bar";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { PortalHost } from "@rn-primitives/portal";

import { setAndroidNavigationBar } from "~/lib/android-navigation-bar";
import { NAV_THEME } from "~/lib/constants";
import { queryClient } from "~/utils/api";

import "../styles.css";

import { useLayoutEffect, useRef, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { QueryClientProvider } from "@tanstack/react-query";

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
  const hasMounted = useRef(false);
  const colorScheme = useColorScheme();
  const [isColorSchemeLoaded, setIsColorSchemeLoaded] = useState(false);
  useLayoutEffect(() => {
    if (hasMounted.current) {
      return;
    }
    void setAndroidNavigationBar(colorScheme == "dark" ? "dark" : "light");
    setIsColorSchemeLoaded(true);
    hasMounted.current = true;
  }, [colorScheme]);

  if (!isColorSchemeLoaded) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider value={colorScheme == "dark" ? DARK_THEME : LIGHT_THEME}>
        <StatusBar style={colorScheme == "dark" ? "dark" : "light"} />
        <GestureHandlerRootView style={{ flex: 1 }}>
          <Drawer
            screenOptions={{
              drawerStyle: {
                backgroundColor: colorScheme
                  ? "hsl(240, 5.9%, 10%)"
                  : "hsl(0, 0%, 98%)",
              },
              drawerLabelStyle: {
                color:
                  colorScheme == "dark"
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
                  <Dices className="text-primary" size={25} strokeWidth={1.5} />
                ),
              }}
            />
            <Drawer.Screen
              name="games/[id]/[matchId]/index"
              options={{
                drawerItemStyle: { display: "none" }, // Hide from drawer
                title: "Match Details",
              }}
            />
            <Drawer.Screen
              name="games/[id]/[matchId]/scoresheet"
              options={{
                drawerItemStyle: { display: "none" }, // Hide from drawer
                title: "Match Scoresheet",
              }}
            />
            <Drawer.Screen
              name="games/[id]/index"
              options={{
                drawerItemStyle: { display: "none" }, // Hide from drawer
                title: "Game Details",
              }}
            />
          </Drawer>
          <PortalHost />
        </GestureHandlerRootView>
      </ThemeProvider>
    </QueryClientProvider>
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
