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

// Registration validation schema
const registerSchema = z.object({
    fullName: z
        .string()
        .trim()
        .min(3, "Full Name must be at least 3 characters"),
    email: z
        .string()
        .trim()
        .min(1, "Email is required")
        .email("Please enter a valid email address"),
    phoneNumber: z
        .string()
        .trim()
        .min(10, "Phone number must be at least 10 digits"),
    password: z
        .string()
        .min(6, "Password must be at least 6 characters"),
    role: z.enum(["customer", "worker"]),
});

export default function RegisterScreen() {
    const router = useRouter();
    const { register, isLoading, error: serverError, clearError } = useAuthStore();
    const [showPassword, setShowPassword] = useState(false);
    
    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === "dark";

    // Clear server errors when screen mounts
    useEffect(() => {
        clearError();
    }, []);

    const {
        control,
        handleSubmit,
        formState: { errors },
        setValue,
        watch
    } = useForm({
        resolver: zodResolver(registerSchema),
        defaultValues: {
            fullName: "",
            email: "",
            phoneNumber: "",
            password: "",
            role: "customer" // default role
        }
    });

    const selectedRole = watch("role");

    const onSubmit = async (data) => {
        await register(
            data.fullName,
            data.email,
            data.phoneNumber,
            data.password,
            data.role
        );
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
                        {/* Header */}
                        <View>
                            <TouchableOpacity
                                onPress={() => router.replace("/")}
                                className="w-10 h-10 bg-white dark:bg-slate-900 rounded-full items-center justify-center border border-slate-200 dark:border-slate-800 mb-6 active:opacity-80"
                            >
                                <Ionicons name="arrow-back" size={20} color={isDark ? "white" : "#0f172a"} />
                            </TouchableOpacity>

                            <Text className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                                Create Account
                            </Text>
                            <Text className="text-slate-500 dark:text-slate-400 text-sm mt-1.5">
                                Join ServiceHub today and connect with trusted local professionals.
                            </Text>
                        </View>

                        {/* Form Body */}
                        <View className="my-6 gap-y-4">
                            {/* Server-Side Errors */}
                            {!!serverError && (
                                <View className="bg-rose-500/10 border border-rose-500/20 p-3 rounded-lg flex-row items-center">
                                    <Ionicons name="alert-circle" size={20} color="#f43f5e" />
                                    <Text className="text-rose-600 dark:text-rose-400 text-sm font-medium ml-2 flex-1">
                                        {serverError}
                                    </Text>
                                </View>
                            )}

                            {/* Full Name Input */}
                            <View className="gap-y-1.5">
                                <Text className="text-slate-700 dark:text-slate-300 font-semibold text-sm">Full Name</Text>
                                <Controller
                                    control={control}
                                    name="fullName"
                                    render={({ field: { onChange, onBlur, value } }) => (
                                        <View className={`flex-row items-center bg-white dark:bg-slate-900 border px-4 py-3 rounded-xl ${errors.fullName ? "border-rose-500" : "border-slate-200 dark:border-slate-800 focus:border-indigo-500"}`}>
                                            <Ionicons name="person-outline" size={18} color="#94a3b8" />
                                            <TextInput
                                                className="flex-1 ml-3 text-slate-900 dark:text-white text-base"
                                                placeholder="Enter full name"
                                                placeholderTextColor={isDark ? "#64748b" : "#94a3b8"}
                                                onBlur={onBlur}
                                                onChangeText={onChange}
                                                value={value}
                                            />
                                        </View>
                                    )}
                                />
                                {errors.fullName && (
                                    <Text className="text-rose-500 text-xs mt-0.5 font-medium">
                                        {errors.fullName.message}
                                    </Text>
                                )}
                            </View>

                            {/* Email Input */}
                            <View className="gap-y-1.5">
                                <Text className="text-slate-700 dark:text-slate-300 font-semibold text-sm">Email Address</Text>
                                <Controller
                                    control={control}
                                    name="email"
                                    render={({ field: { onChange, onBlur, value } }) => (
                                        <View className={`flex-row items-center bg-white dark:bg-slate-900 border px-4 py-3 rounded-xl ${errors.email ? "border-rose-500" : "border-slate-200 dark:border-slate-800 focus:border-indigo-500"}`}>
                                            <Ionicons name="mail-outline" size={18} color="#94a3b8" />
                                            <TextInput
                                                className="flex-1 ml-3 text-slate-900 dark:text-white text-base"
                                                placeholder="Enter email address"
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
                                    <Text className="text-rose-500 text-xs mt-0.5 font-medium">
                                        {errors.email.message}
                                    </Text>
                                )}
                            </View>

                            {/* Phone Number Input */}
                            <View className="gap-y-1.5">
                                <Text className="text-slate-700 dark:text-slate-300 font-semibold text-sm">Phone Number</Text>
                                <Controller
                                    control={control}
                                    name="phoneNumber"
                                    render={({ field: { onChange, onBlur, value } }) => (
                                        <View className={`flex-row items-center bg-white dark:bg-slate-900 border px-4 py-3 rounded-xl ${errors.phoneNumber ? "border-rose-500" : "border-slate-200 dark:border-slate-800 focus:border-indigo-500"}`}>
                                            <Ionicons name="call-outline" size={18} color="#94a3b8" />
                                            <TextInput
                                                className="flex-1 ml-3 text-slate-900 dark:text-white text-base"
                                                placeholder="Enter phone number"
                                                placeholderTextColor={isDark ? "#64748b" : "#94a3b8"}
                                                keyboardType="phone-pad"
                                                onBlur={onBlur}
                                                onChangeText={onChange}
                                                value={value}
                                            />
                                        </View>
                                    )}
                                />
                                {errors.phoneNumber && (
                                    <Text className="text-rose-500 text-xs mt-0.5 font-medium">
                                        {errors.phoneNumber.message}
                                    </Text>
                                )}
                            </View>

                            {/* Password Input */}
                            <View className="gap-y-1.5">
                                <Text className="text-slate-700 dark:text-slate-300 font-semibold text-sm">Password</Text>
                                <Controller
                                    control={control}
                                    name="password"
                                    render={({ field: { onChange, onBlur, value } }) => (
                                        <View className={`flex-row items-center bg-white dark:bg-slate-900 border px-4 py-3 rounded-xl ${errors.password ? "border-rose-500" : "border-slate-200 dark:border-slate-800 focus:border-indigo-500"}`}>
                                            <Ionicons name="lock-closed-outline" size={18} color="#94a3b8" />
                                            <TextInput
                                                className="flex-1 ml-3 text-slate-900 dark:text-white text-base"
                                                placeholder="Enter password"
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
                                                    size={18}
                                                    color="#94a3b8"
                                                />
                                            </TouchableOpacity>
                                        </View>
                                    )}
                                />
                                {errors.password && (
                                    <Text className="text-rose-500 text-xs mt-0.5 font-medium">
                                        {errors.password.message}
                                    </Text>
                                )}
                            </View>

                            {/* Role Selection Picker (Premium Custom Design) */}
                            <View className="gap-y-2">
                                <Text className="text-slate-700 dark:text-slate-300 font-semibold text-sm">Join As</Text>
                                <View className="flex-row gap-x-4">
                                    <TouchableOpacity
                                        onPress={() => setValue("role", "customer")}
                                        className={`flex-1 py-3 px-4 rounded-xl border flex-row items-center justify-center space-x-2 ${selectedRole === "customer" ? "bg-indigo-600/10 border-indigo-500" : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"}`}
                                    >
                                        <Ionicons
                                            name="people"
                                            size={18}
                                            color={selectedRole === "customer" ? "#6366f1" : "#94a3b8"}
                                        />
                                        <Text className={`font-semibold ml-2 text-sm ${selectedRole === "customer" ? "text-indigo-600 dark:text-indigo-400" : "text-slate-500 dark:text-slate-400"}`}>
                                            Customer
                                        </Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        onPress={() => setValue("role", "worker")}
                                        className={`flex-1 py-3 px-4 rounded-xl border flex-row items-center justify-center space-x-2 ${selectedRole === "worker" ? "bg-indigo-600/10 border-indigo-500" : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"}`}
                                    >
                                        <Ionicons
                                            name="construct"
                                            size={18}
                                            color={selectedRole === "worker" ? "#6366f1" : "#94a3b8"}
                                        />
                                        <Text className={`font-semibold ml-2 text-sm ${selectedRole === "worker" ? "text-indigo-600 dark:text-indigo-400" : "text-slate-500 dark:text-slate-400"}`}>
                                            Professional
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>

                        {/* Register Action Buttons */}
                        <View className="gap-y-4">
                            <TouchableOpacity
                                disabled={isLoading}
                                onPress={handleSubmit(onSubmit)}
                                className="bg-indigo-600 py-4 rounded-xl items-center justify-center shadow-lg shadow-indigo-500/30 active:opacity-90 disabled:opacity-70"
                            >
                                {isLoading ? (
                                    <ActivityIndicator size="small" color="white" />
                                ) : (
                                    <Text className="text-white font-bold text-lg">Sign Up</Text>
                                )}
                            </TouchableOpacity>

                            <View className="flex-row justify-center items-center py-2 mb-4">
                                <Text className="text-slate-500 dark:text-slate-400 text-sm">Already have an account?</Text>
                                <TouchableOpacity onPress={() => router.replace("/login")}>
                                    <Text className="text-indigo-600 dark:text-indigo-400 font-bold text-sm ml-1.5">Sign In</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
