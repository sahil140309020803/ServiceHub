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
    Alert,
    Image
} from "react-native";
import { useRouter } from "expo-router";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { useColorScheme } from "nativewind";
import useAuthStore from "../src/store/useAuthStore";
import api from "../src/services/api";

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
    const { user, updateProfile, isLoading, error: serverError, clearError, token } = useAuthStore();
    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === "dark";
    
    const [profileImage, setProfileImage] = useState(user?.profileImage || "");
    const [isUploading, setIsUploading] = useState(false);

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

    if (!user) {
        return null;
    }

    const pickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
            Alert.alert("Permission Denied", "We need gallery permissions to select a profile photo.");
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
            const selectedImageUri = result.assets[0].uri;
            uploadImage(selectedImageUri);
        }
    };

    const uploadImage = async (uri) => {
        setIsUploading(true);
        try {
            const formData = new FormData();
            
            // Format filename and type
            const uriParts = uri.split(".");
            const fileType = uriParts[uriParts.length - 1];
            
            formData.append("avatar", {
                uri,
                name: `avatar.${fileType}`,
                type: `image/${fileType === "jpg" ? "jpeg" : fileType}`,
            });

            const response = await api.post("/api/auth/upload-avatar", formData, {
                headers: {
                    "Content-Type": "multipart/form-data",
                    Authorization: `Bearer ${token}`,
                },
            });

            if (response.data.success) {
                setProfileImage(response.data.url);
                Alert.alert("Success", "Photo uploaded successfully!");
            } else {
                Alert.alert("Upload Failed", response.data.message || "Could not upload image");
            }
        } catch (err) {
            console.error("Image upload error:", err);
            Alert.alert("Error", "An error occurred while uploading the image.");
        } finally {
            setIsUploading(false);
        }
    };

    const onSubmit = async (data) => {
        const success = await updateProfile(data.fullName, data.email, data.phoneNumber, profileImage);
        if (success) {
            Alert.alert("Success", "Profile updated successfully!", [
                { text: "OK", onPress: () => router.canGoBack() ? router.back() : router.replace("/(tabs)/profile") }
            ]);
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950" edges={["top", "left", "right"]}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                className="flex-1"
            >
                {/* Header */}
                <View className="flex-row items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-900 bg-white dark:bg-slate-950">
                    <TouchableOpacity
                        onPress={() => router.canGoBack() ? router.back() : router.replace("/(tabs)/profile")}
                        className="w-10 h-10 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full items-center justify-center"
                    >
                        <Ionicons name="arrow-back" size={20} color={isDark ? "white" : "#0f172a"} />
                    </TouchableOpacity>
                    <Text className="text-lg font-bold text-slate-900 dark:text-white">Edit Profile</Text>
                    <View className="w-10" />
                </View>

                <ScrollView 
                    contentContainerStyle={{ flexGrow: 1 }}
                    keyboardShouldPersistTaps="handled"
                >
                    <View className="flex-1 justify-between px-6 py-6">
                        <View className="gap-y-5">
                            {/* Server-Side Errors */}
                            {!!serverError && (
                                <View className="bg-rose-500/10 border border-rose-500/20 p-3 rounded-lg flex-row items-center">
                                    <Ionicons name="alert-circle" size={20} color="#f43f5e" />
                                    <Text className="text-rose-400 text-sm font-medium ml-2 flex-1">
                                        {serverError}
                                    </Text>
                                </View>
                            )}

                            {/* Profile Image Picker */}
                            <View className="items-center my-4">
                                <TouchableOpacity 
                                    onPress={pickImage} 
                                    disabled={isUploading}
                                    className="relative active:opacity-90"
                                >
                                    <View className="w-28 h-28 rounded-full bg-white dark:bg-slate-900 border-2 border-indigo-500/50 justify-center items-center overflow-hidden shadow-lg shadow-indigo-500/20">
                                        {isUploading ? (
                                            <ActivityIndicator size="small" color="#6366f1" />
                                        ) : profileImage ? (
                                            <Image 
                                                source={{ uri: profileImage }} 
                                                className="w-full h-full"
                                            />
                                        ) : (
                                            <View className="items-center justify-center">
                                                <Ionicons name="person" size={48} color="#64748b" />
                                            </View>
                                        )}
                                    </View>
                                    
                                    {/* Edit Badge overlay */}
                                    <View className="absolute bottom-0 right-0 bg-indigo-600 border border-white dark:border-slate-950 w-8 h-8 rounded-full items-center justify-center shadow-md">
                                        <Ionicons name="camera" size={16} color="white" />
                                    </View>
                                </TouchableOpacity>
                                <Text className="text-slate-500 dark:text-slate-400 text-xs mt-2 font-medium">
                                    {isUploading ? "Uploading photo..." : "Tap to change photo"}
                                </Text>
                            </View>

                            {/* Full Name Input */}
                            <View className="gap-y-2">
                                <Text className="text-slate-700 dark:text-slate-300 font-semibold text-sm">Full Name</Text>
                                <Controller
                                    control={control}
                                    name="fullName"
                                    render={({ field: { onChange, onBlur, value } }) => (
                                        <View className={`flex-row items-center bg-white dark:bg-slate-900 border px-4 py-3.5 rounded-xl ${errors.fullName ? "border-rose-500" : "border-slate-200 dark:border-slate-800 focus:border-indigo-500"}`}>
                                            <Ionicons name="person-outline" size={20} color={isDark ? "#94a3b8" : "#64748b"} />
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
                                    <Text className="text-rose-500 text-xs mt-1 font-medium">
                                        {errors.fullName.message}
                                    </Text>
                                )}
                            </View>

                            {/* Email Input */}
                            <View className="gap-y-2">
                                <Text className="text-slate-700 dark:text-slate-300 font-semibold text-sm">Email Address</Text>
                                <Controller
                                    control={control}
                                    name="email"
                                    render={({ field: { onChange, onBlur, value } }) => (
                                        <View className={`flex-row items-center bg-white dark:bg-slate-900 border px-4 py-3.5 rounded-xl ${errors.email ? "border-rose-500" : "border-slate-200 dark:border-slate-800 focus:border-indigo-500"}`}>
                                            <Ionicons name="mail-outline" size={20} color={isDark ? "#94a3b8" : "#64748b"} />
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
                                    <Text className="text-rose-500 text-xs mt-1 font-medium">
                                        {errors.email.message}
                                    </Text>
                                )}
                            </View>

                            {/* Phone Number Input */}
                            <View className="gap-y-2">
                                <Text className="text-slate-700 dark:text-slate-300 font-semibold text-sm">Phone Number</Text>
                                <Controller
                                    control={control}
                                    name="phoneNumber"
                                    render={({ field: { onChange, onBlur, value } }) => (
                                        <View className={`flex-row items-center bg-white dark:bg-slate-900 border px-4 py-3.5 rounded-xl ${errors.phoneNumber ? "border-rose-500" : "border-slate-200 dark:border-slate-800 focus:border-indigo-500"}`}>
                                            <Ionicons name="call-outline" size={20} color={isDark ? "#94a3b8" : "#64748b"} />
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
