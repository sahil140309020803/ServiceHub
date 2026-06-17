import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    StatusBar,
    KeyboardAvoidingView,
    Platform,
    ScrollView
} from "react-native";
import { useRouter } from "expo-router";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useColorScheme } from "nativewind";
import useAuthStore from "../src/store/useAuthStore";

// Form validation schema
const loginSchema = z.object({
    email: z
        .string()
        .trim()
        .min(1, "Email is required")
        .email("Please enter a valid email address"),
    password: z
        .string()
        .min(1, "Password is required"),
});

export default function LoginScreen() {
    const router = useRouter();
    const { login, isLoading, error: serverError, clearError } = useAuthStore();
    const [showPassword, setShowPassword] = useState(false);
    
    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === "dark";

    // Clear server errors when screen mounts or changes
    useEffect(() => {
        clearError();
    }, []);

    const {
        control,
        handleSubmit,
        formState: { errors }
    } = useForm({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            email: "",
            password: ""
        }
    });

    const onSubmit = async (data) => {
        await login(data.email, data.password);
    };

    return (
        <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950">
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                className="flex-1"
            >
                <ScrollView 
                    contentContainerStyle={{ flexGrow: 1 }}
                    keyboardShouldPersistTaps="handled"
                >
                    <View className="flex-1 justify-between px-6 py-6">
                        {/* Header Section */}
                        <View>
                            <TouchableOpacity
                                onPress={() => router.replace("/")}
                                className="w-10 h-10 bg-white dark:bg-slate-900 rounded-full items-center justify-center border border-slate-200 dark:border-slate-800 mb-6 active:opacity-80"
                            >
                                <Ionicons name="arrow-back" size={20} color={isDark ? "white" : "#0f172a"} />
                            </TouchableOpacity>

                            <Text className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                                Welcome Back
                            </Text>
                            <Text className="text-slate-500 dark:text-slate-400 text-sm mt-1.5">
                                Sign in to your ServiceHub account to connect with professionals.
                            </Text>
                        </View>

                        {/* Form Inputs Container */}
                        <View className="my-8 gap-y-5">
                            {/* Server-Side Errors */}
                            {!!serverError && (
                                <View className="bg-rose-500/10 border border-rose-500/20 p-3 rounded-lg flex-row items-center space-x-2">
                                    <Ionicons name="alert-circle" size={20} color="#f43f5e" />
                                    <Text className="text-rose-600 dark:text-rose-400 text-sm font-medium ml-2 flex-1">
                                        {serverError}
                                    </Text>
                                </View>
                            )}

                            {/* Email Input */}
                            <View className="gap-y-2">
                                <Text className="text-slate-700 dark:text-slate-300 font-semibold text-sm">Email Address</Text>
                                <Controller
                                    control={control}
                                    name="email"
                                    render={({ field: { onChange, onBlur, value } }) => (
                                        <View className={`flex-row items-center bg-white dark:bg-slate-900 border px-4 py-3.5 rounded-xl ${errors.email ? "border-rose-500" : "border-slate-200 dark:border-slate-800 focus:border-indigo-500"}`}>
                                            <Ionicons name="mail-outline" size={20} color="#94a3b8" />
                                            <TextInput
                                                className="flex-1 ml-3 text-slate-900 dark:text-white text-base"
                                                placeholder="Enter your email"
                                                placeholderTextColor={isDark ? "#64748b" : "#94a3b8"}
                                                keyboardType="email-address"
                                                autoCapitalize="none"
                                                onBlur={onBlur}
                                                onChangeText={onChange}
                                                value={value}
                                            />
                                        </View>
                                    )}
                                />
                                {errors.email && (
                                    <Text className="text-rose-500 text-xs mt-1 font-medium">
                                        {errors.email.message}
                                    </Text>
                                )}
                            </View>

                            {/* Password Input */}
                            <View className="gap-y-2">
                                <Text className="text-slate-700 dark:text-slate-300 font-semibold text-sm">Password</Text>
                                <Controller
                                    control={control}
                                    name="password"
                                    render={({ field: { onChange, onBlur, value } }) => (
                                        <View className={`flex-row items-center bg-white dark:bg-slate-900 border px-4 py-3.5 rounded-xl ${errors.password ? "border-rose-500" : "border-slate-200 dark:border-slate-800 focus:border-indigo-500"}`}>
                                            <Ionicons name="lock-closed-outline" size={20} color="#94a3b8" />
                                            <TextInput
                                                className="flex-1 ml-3 text-slate-900 dark:text-white text-base"
                                                placeholder="Enter your password"
                                                placeholderTextColor={isDark ? "#64748b" : "#94a3b8"}
                                                secureTextEntry={!showPassword}
                                                autoCapitalize="none"
                                                onBlur={onBlur}
                                                onChangeText={onChange}
                                                value={value}
                                            />
                                            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                                                <Ionicons
                                                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                                                    size={20}
                                                    color="#94a3b8"
                                                />
                                            </TouchableOpacity>
                                        </View>
                                    )}
                                />
                                {errors.password && (
                                    <Text className="text-rose-500 text-xs mt-1 font-medium">
                                        {errors.password.message}
                                    </Text>
                                )}
                            </View>
                        </View>

                        {/* Actions Section */}
                        <View className="gap-y-5">
                            <TouchableOpacity
                                disabled={isLoading}
                                onPress={handleSubmit(onSubmit)}
                                className="bg-indigo-600 py-4 rounded-xl items-center justify-center shadow-lg shadow-indigo-500/30 active:opacity-90 disabled:opacity-70"
                            >
                                {isLoading ? (
                                    <ActivityIndicator size="small" color="white" />
                                ) : (
                                    <Text className="text-white font-bold text-lg">Sign In</Text>
                                )}
                            </TouchableOpacity>

                            <View className="flex-row justify-center items-center py-2">
                                <Text className="text-slate-500 dark:text-slate-400 text-sm">{"Don't have an account?"}</Text>
                                <TouchableOpacity onPress={() => router.replace("/register")}>
                                    <Text className="text-indigo-600 dark:text-indigo-400 font-bold text-sm ml-1.5">Sign Up</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
