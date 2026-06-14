import { useEffect } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import useAuthStore from "../src/store/useAuthStore";
import "@/global.css";

export default function RootLayout() {
  const { token, isLoading, loadUser, user, profileCompleted } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  // Load user profile on initial mount
  useEffect(() => {
    loadUser();
  }, []);

  // Handle authentication navigation gate
  useEffect(() => {
    if (isLoading) return;

    const currentScreen = segments[0] as string;

    // Auth screens: welcome landing (index), login, and register
    const isAuthScreen =
      currentScreen === "login" ||
      currentScreen === "register" ||
      currentScreen === undefined ||
      currentScreen === "";

    // Protected screens: tab views, edit profile, and professional profile editors
    const isProtectedRoute =
      currentScreen === "(tabs)" ||
      currentScreen === "edit-profile" ||
      currentScreen === "manage-worker-profile" ||
      currentScreen === "insights";

    if (token) {
      if (user?.role === "worker" && profileCompleted === false) {
        // Force redirect to worker onboarding screen
        if (currentScreen !== "manage-worker-profile") {
          router.replace("/manage-worker-profile" as any);
        }
      } else {
        if (isAuthScreen) {
          // Redirect authenticated users away from Welcome/Login/Register to Home
          router.replace("/(tabs)/Home" as any);
        }
      }
    } else {
      if (isProtectedRoute) {
        // Redirect unauthenticated users trying to access protected screens back to Welcome
        router.replace("/" as any);
      }
    }
  }, [token, isLoading, segments, user, profileCompleted]);

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-slate-900">
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}
