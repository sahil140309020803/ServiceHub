import React from "react";
import { View, Text, TouchableOpacity, StatusBar } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";

export default function WelcomeScreen() {
    const router = useRouter();
    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === "dark";

    return (
        <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950">
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
            
            {/* Background design elements */}
            <View className="absolute top-[-20%] left-[-20%] w-[100%] h-[50%] bg-indigo-900/10 dark:bg-indigo-900/20 rounded-full" style={{ borderRadius: 9999, transform: [{ scale: 1.5 }] }} />
            <View className="absolute bottom-[-10%] right-[-10%] w-[80%] h-[40%] bg-violet-900/10 dark:bg-violet-900/20 rounded-full" style={{ borderRadius: 9999, transform: [{ scale: 1.5 }] }} />

            <View className="flex-1 justify-between px-6 py-8">
                {/* Brand / Logo Section */}
                <View className="items-center mt-12">
                    <View className="w-20 h-20 bg-indigo-600 rounded-2xl items-center justify-center mb-6 shadow-xl shadow-indigo-500/50">
                        <Ionicons name="construct" size={40} color="white" />
                    </View>
                    <Text className="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight text-center">
                        Service<Text className="text-indigo-500">Hub</Text>
                    </Text>
                    <Text className="text-slate-500 dark:text-slate-400 text-center mt-2 text-base max-w-xs leading-relaxed">
                        Your trusted destination for local experts and home services.
                    </Text>
                </View>

                {/* Tagline & Core Features Illustration */}
                <View className="my-10 gap-y-4">
                    <View className="flex-row items-center bg-white dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800/80 shadow-sm">
                        <View className="w-10 h-10 bg-indigo-500/10 rounded-lg items-center justify-center">
                            <Ionicons name="shield-checkmark" size={22} color="#6366f1" />
                        </View>
                        <View className="flex-1 ml-3">
                            <Text className="text-slate-900 dark:text-white font-semibold text-base">Verified Professionals</Text>
                            <Text className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">Top-rated local experts handpicked for quality.</Text>
                        </View>
                    </View>

                    <View className="flex-row items-center bg-white dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800/80 shadow-sm">
                        <View className="w-10 h-10 bg-violet-500/10 rounded-lg items-center justify-center">
                            <Ionicons name="flash" size={22} color="#8b5cf6" />
                        </View>
                        <View className="flex-1 ml-3">
                            <Text className="text-slate-900 dark:text-white font-semibold text-base">Fast Response</Text>
                            <Text className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">Hire nearby professionals instantly when you need them.</Text>
                        </View>
                    </View>
                </View>

                {/* Actions / Buttons Section */}
                <View className="gap-y-4 mb-6">
                    <TouchableOpacity
                        onPress={() => router.push("/login")}
                        className="bg-indigo-600 py-4 rounded-xl items-center justify-center shadow-lg shadow-indigo-500/30 active:opacity-90"
                    >
                        <Text className="text-white font-bold text-lg">Sign In</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={() => router.push("/register")}
                        className="bg-white dark:bg-slate-900 py-4 rounded-xl items-center justify-center border border-slate-200 dark:border-slate-800 active:opacity-90 shadow-sm"
                    >
                        <Text className="text-slate-800 dark:text-slate-200 font-semibold text-lg">Create Account</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </SafeAreaView>
    );
}