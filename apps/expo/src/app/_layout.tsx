import "@bacons/text-decoder/install";

import { Drawer } from "expo-router/drawer";
import { StatusBar } from "expo-status-bar";
import { ClerkLoaded, ClerkProvider } from "@clerk/clerk-expo";
import { useColorScheme } from "nativewind";

import { TRPCProvider } from "~/utils/api";
import { tokenCache } from "~/utils/cache";

import "../styles.css";

// This is the main layout of the app
// It wraps your pages with the providers they need
export default function RootLayout() {
  const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;

  if (!publishableKey) {
    throw new Error("Add EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY to your .env file");
  }
  const { colorScheme } = useColorScheme();
  return (
    <ClerkProvider tokenCache={tokenCache} publishableKey={publishableKey}>
      <TRPCProvider>
        {/*
          The Stack component displays the current page.
          It also allows you to configure your screens 
        */}
        <ClerkLoaded>
          <Drawer
            screenOptions={{
              contentStyle: {
                backgroundColor: colorScheme == "dark" ? "#09090B" : "#FFFFFF",
              },
            }}
          >
            <Drawer.Screen
              name="(home)/index"
              options={{ drawerLabel: "home", title: "Home" }}
            />
            <Drawer.Screen
              name="games/index"
              options={{ drawerLabel: "Games", title: "Games" }}
            />
          </Drawer>
        </ClerkLoaded>
        <StatusBar />
      </TRPCProvider>
    </ClerkProvider>
  );
}
