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
    ScrollView,
    Alert
} from "react-native";
import { useRouter } from "expo-router";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import useAuthStore from "../src/store/useAuthStore";

// Validation Schema
const editProfileSchema = z.object({
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
});

export default function EditProfileScreen() {
    const router = useRouter();
    const { user, updateProfile, isLoading, error: serverError, clearError } = useAuthStore();

    // Clear server errors when screen mounts
    useEffect(() => {
        clearError();
    }, []);

    const {
        control,
        handleSubmit,
        formState: { errors }
    } = useForm({
        resolver: zodResolver(editProfileSchema),
        defaultValues: {
            fullName: user?.fullName || "",
            email: user?.email || "",
            phoneNumber: user?.phoneNumber || ""
        }
    });

    const onSubmit = async (data) => {
        const success = await updateProfile(data.fullName, data.email, data.phoneNumber);
        if (success) {
            Alert.alert("Success", "Profile updated successfully!", [
                { text: "OK", onPress: () => router.canGoBack() ? router.back() : router.replace("/(tabs)/profile") }
            ]);
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-slate-950" edges={["top", "left", "right"]}>
            <StatusBar barStyle="light-content" />
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                className="flex-1"
            >
                {/* Header */}
                <View className="flex-row items-center justify-between px-5 py-4 border-b border-slate-900 bg-slate-950">
                    <TouchableOpacity
                        onPress={() => router.canGoBack() ? router.back() : router.replace("/(tabs)/profile")}
                        className="w-10 h-10 bg-slate-900 border border-slate-800 rounded-full items-center justify-center"
                    >
                        <Ionicons name="arrow-back" size={20} color="white" />
                    </TouchableOpacity>
                    <Text className="text-lg font-bold text-white">Edit Profile</Text>
                    <View className="w-10" />
                </View>

                <ScrollView 
                    contentContainerStyle={{ flexGrow: 1 }}
                    keyboardShouldPersistTaps="handled"
                >
                    <View className="flex-1 justify-between px-6 py-6">
                        <View className="gap-y-5">
                            {/* Server-Side Errors */}
                            {serverError && (
                                <View className="bg-rose-500/10 border border-rose-500/20 p-3 rounded-lg flex-row items-center">
                                    <Ionicons name="alert-circle" size={20} color="#f43f5e" />
                                    <Text className="text-rose-400 text-sm font-medium ml-2 flex-1">
                                        {serverError}
                                    </Text>
                                </View>
                            )}

                            {/* Full Name Input */}
                            <View className="gap-y-2">
                                <Text className="text-slate-300 font-semibold text-sm">Full Name</Text>
                                <Controller
                                    control={control}
                                    name="fullName"
                                    render={({ field: { onChange, onBlur, value } }) => (
                                        <View className={`flex-row items-center bg-slate-900 border px-4 py-3.5 rounded-xl ${errors.fullName ? "border-rose-500" : "border-slate-800 focus:border-indigo-500"}`}>
                                            <Ionicons name="person-outline" size={20} color="#94a3b8" />
                                            <TextInput
                                                className="flex-1 ml-3 text-white text-base"
                                                placeholder="Enter full name"
                                                placeholderTextColor="#64748b"
                                                onBlur={onBlur}
                                                onChangeText={onChange}
                                                value={value}
                                            />
                                        </View>
                                    )}
                                />
                                {errors.fullName && (
                                    <Text className="text-rose-500 text-xs mt-1 font-medium">
                                        {errors.fullName.message}
                                    </Text>
                                )}
                            </View>

                            {/* Email Input */}
                            <View className="gap-y-2">
                                <Text className="text-slate-300 font-semibold text-sm">Email Address</Text>
                                <Controller
                                    control={control}
                                    name="email"
                                    render={({ field: { onChange, onBlur, value } }) => (
                                        <View className={`flex-row items-center bg-slate-900 border px-4 py-3.5 rounded-xl ${errors.email ? "border-rose-500" : "border-slate-800 focus:border-indigo-500"}`}>
                                            <Ionicons name="mail-outline" size={20} color="#94a3b8" />
                                            <TextInput
                                                className="flex-1 ml-3 text-white text-base"
                                                placeholder="Enter email address"
                                                placeholderTextColor="#64748b"
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

                            {/* Phone Number Input */}
                            <View className="gap-y-2">
                                <Text className="text-slate-300 font-semibold text-sm">Phone Number</Text>
                                <Controller
                                    control={control}
                                    name="phoneNumber"
                                    render={({ field: { onChange, onBlur, value } }) => (
                                        <View className={`flex-row items-center bg-slate-900 border px-4 py-3.5 rounded-xl ${errors.phoneNumber ? "border-rose-500" : "border-slate-800 focus:border-indigo-500"}`}>
                                            <Ionicons name="call-outline" size={20} color="#94a3b8" />
                                            <TextInput
                                                className="flex-1 ml-3 text-white text-base"
                                                placeholder="Enter phone number"
                                                placeholderTextColor="#64748b"
                                                keyboardType="phone-pad"
                                                onBlur={onBlur}
                                                onChangeText={onChange}
                                                value={value}
                                            />
                                        </View>
                                    )}
                                />
                                {errors.phoneNumber && (
                                    <Text className="text-rose-500 text-xs mt-1 font-medium">
                                        {errors.phoneNumber.message}
                                    </Text>
                                )}
                            </View>
                        </View>

                        {/* Save Action button */}
                        <TouchableOpacity
                            disabled={isLoading}
                            onPress={handleSubmit(onSubmit)}
                            className="bg-indigo-600 py-4 rounded-xl items-center justify-center mt-8 shadow-lg shadow-indigo-500/30 active:opacity-90 disabled:opacity-70"
                        >
                            {isLoading ? (
                                <ActivityIndicator size="small" color="white" />
                            ) : (
                                <Text className="text-white font-bold text-lg">Save Changes</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
