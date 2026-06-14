import React from "react";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import useAuthStore from "../../src/store/useAuthStore";

export default function TabsLayout() {
    const { user } = useAuthStore();
    const isWorker = user?.role === "worker" || user?.role === "admin";

    return (
        <Tabs
            screenOptions={{
                tabBarStyle: {
                    backgroundColor: "#0f172a", // slate-900
                    borderTopColor: "#1e293b", // slate-800
                    paddingBottom: 8,
                    paddingTop: 8,
                    height: 65,
                },
                tabBarActiveTintColor: "#6366f1", // indigo-500
                tabBarInactiveTintColor: "#64748b", // slate-500
                headerStyle: {
                    backgroundColor: "#0f172a", // slate-900
                },
                headerTitleStyle: {
                    color: "#ffffff",
                    fontWeight: "bold",
                },
                headerTintColor: "#ffffff",
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
                    tabBarButton: isWorker ? () => null : undefined, // Hide for workers
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
                    tabBarButton: !isWorker ? () => null : undefined, // Hide for customers
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="images" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="reviews"
                options={{
                    title: "Reviews",
                    headerShown: true,
                    tabBarButton: !isWorker ? () => null : undefined, // Hide for customers
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
