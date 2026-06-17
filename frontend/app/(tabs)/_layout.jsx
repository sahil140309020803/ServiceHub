import React, { useState, useEffect } from "react";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import useAuthStore from "../../src/store/useAuthStore";
import { useColorScheme } from "nativewind";

export default function TabsLayout() {
    const { user } = useAuthStore();
    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === "dark";

    // Stabilize isWorker during logout to prevent React Navigation from mutating 
    // the tab configuration while screens are unmounting.
    const [isWorker, setIsWorker] = useState(() => {
        if (user) {
            return user.role === "worker" || user.role === "admin";
        }
        return false;
    });

    useEffect(() => {
        if (user) {
            setIsWorker(user.role === "worker" || user.role === "admin");
        }
    }, [user]);

    return (
        <Tabs
            screenOptions={{
                tabBarStyle: {
                    backgroundColor: isDark ? "#0f172a" : "#ffffff", // slate-900 vs white
                    borderTopColor: isDark ? "#1e293b" : "#e2e8f0", // slate-800 vs slate-200
                    paddingBottom: 8,
                    paddingTop: 8,
                    height: 69,
                },
                tabBarActiveTintColor: "#6366f1", // indigo-500
                tabBarInactiveTintColor: isDark ? "#64748b" : "#94a3b8", // slate-500 vs slate-400
                headerStyle: {
                    backgroundColor: isDark ? "#0f172a" : "#ffffff", // slate-900 vs white
                },
                headerTitleStyle: {
                    color: isDark ? "#ffffff" : "#0f172a",
                    fontWeight: "bold",
                },
                headerTintColor: isDark ? "#ffffff" : "#0f172a",
                headerShadowVisible: false,
            }}
        >
            <Tabs.Screen
                name="Home"
                options={{
                    title: isWorker ? "Dashboard" : "Home",
                    headerShown: false,
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name={isWorker ? "speedometer" : "home"} size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="favorites"
                options={{
                    title: "Saved",
                    headerShown: false,
                    href: isWorker ? null : undefined,
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="heart" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="gallery"
                options={{
                    title: "Gallery",
                    headerShown: false,
                    href: !isWorker ? null : undefined,
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="images" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="reviews"
                options={{
                    title: "Reviews",
                    headerShown: false,
                    href: !isWorker ? null : undefined,
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="star" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: "Profile",
                    headerShown: true,
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="person" size={size} color={color} />
                    ),
                }}
            />
        </Tabs>
    );
}
