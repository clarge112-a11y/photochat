import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AuthProvider } from "@/contexts/auth-context";
import { FriendsProvider } from "@/contexts/friends-context";
import { CallProvider } from "@/contexts/call-context";
import { SettingsProvider } from "@/contexts/settings-context";
import { TabLoadingProvider } from "@/contexts/tab-loading-context";
import CallHandler from "@/components/CallHandler";
import { trpc, trpcClient } from "@/lib/trpc";

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerBackTitle: "Back" }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="signup" options={{ headerShown: false }} />
      <Stack.Screen name="add-friend" options={{ title: "Add Friend", presentation: "modal" }} />
      <Stack.Screen name="incoming-call" options={{ headerShown: false, presentation: "fullScreenModal" }} />
      <Stack.Screen name="call" options={{ headerShown: false, presentation: "fullScreenModal" }} />
      <Stack.Screen name="group-settings" options={{ headerShown: false }} />
      <Stack.Screen name="snap-preview" options={{ headerShown: false, presentation: "fullScreenModal" }} />
      <Stack.Screen name="chat/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="group-chat/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="create-group" options={{ title: "Create Group", presentation: "modal" }} />
      <Stack.Screen name="group-call" options={{ headerShown: false, presentation: "fullScreenModal" }} />
      <Stack.Screen name="video-call" options={{ headerShown: false, presentation: "fullScreenModal" }} />
      <Stack.Screen name="debug" options={{ title: "Debug Console" }} />
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
    // Log tRPC client configuration on startup
    console.log('🚀 App started with fresh tRPC client');
  }, []);

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <SettingsProvider>
          <TabLoadingProvider>
            <AuthProvider>
              <FriendsProvider>
                <CallProvider>
                  <GestureHandlerRootView>
                    <CallHandler />
                    <RootLayoutNav />
                  </GestureHandlerRootView>
                </CallProvider>
              </FriendsProvider>
            </AuthProvider>
          </TabLoadingProvider>
        </SettingsProvider>
      </QueryClientProvider>
    </trpc.Provider>
  );
}
