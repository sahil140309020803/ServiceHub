import { useEffect, useState, useRef } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { Animated, StyleSheet, View } from "react-native";
import useAuthStore from "../src/store/useAuthStore";
import { useColorScheme } from "nativewind";
import storage from "../src/utils/storage";
import Toast from "react-native-toast-message";
import { toastConfig } from "../config/toastConfig";
import AnimatedSplashScreen from "../src/components/AnimatedSplashScreen";
import "@/global.css";

export default function RootLayout() {
  const { token, isLoading, loadUser, user, profileCompleted } = useAuthStore();
  const { setColorScheme } = useColorScheme();
  const segments = useSegments();
  const router = useRouter();

  const [showSplash, setShowSplash] = useState(true);
  const splashOpacity = useRef(new Animated.Value(1)).current;

  // Load user profile on initial mount with a minimum splash display duration
  useEffect(() => {
    const checkUser = async () => {
      const startTime = Date.now();
      await loadUser();
      const elapsedTime = Date.now() - startTime;
      const minDisplayTime = 3000; // 3 seconds minimum display time
      const remainingTime = Math.max(0, minDisplayTime - elapsedTime);

      setTimeout(() => {
        // Fade out splash screen smoothly
        Animated.timing(splashOpacity, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }).start(() => {
          setShowSplash(false);
        });
      }, remainingTime);
    };
    checkUser();
  }, [loadUser, splashOpacity]);

  // Synchronize user-specific or global theme state
  useEffect(() => {
    if (isLoading) return;
    const syncTheme = async () => {
      try {
        let activeTheme = "light";
        if (user && user._id) {
          const savedUserTheme = await storage.getItem(`theme_user_${user._id}`);
          if (savedUserTheme === "light" || savedUserTheme === "dark") {
            activeTheme = savedUserTheme;
          } else {
            // Check if global theme exists
            const savedGlobalTheme = await storage.getItem("theme");
            if (savedGlobalTheme === "light" || savedGlobalTheme === "dark") {
              activeTheme = savedGlobalTheme;
            }
            // Save it for this user so it persists
            await storage.setItem(`theme_user_${user._id}`, activeTheme);
          }
        } else {
          const savedTheme = await storage.getItem("theme");
          if (savedTheme === "light" || savedTheme === "dark") {
            activeTheme = savedTheme;
          }
        }
        setColorScheme(activeTheme as "light" | "dark");
      } catch (err) {
        console.error("Failed to load saved theme:", err);
        setColorScheme("dark");
      }
    };
    syncTheme();
  }, [user, isLoading]);

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

  return (
    <View style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false, animation: "fade" }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="register" />
        <Stack.Screen name="(tabs)" />
      </Stack>

      {showSplash && (
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: splashOpacity, zIndex: 9999 }]}>
          <AnimatedSplashScreen />
        </Animated.View>
      )}

      <Toast
        config={toastConfig}
        position="top"
        topOffset={60}
      />
    </View>
  );
}
