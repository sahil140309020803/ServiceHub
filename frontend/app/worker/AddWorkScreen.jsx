import React, { useState } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    StatusBar,
    ScrollView,
    Image,
    Alert
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";
import * as ImagePicker from "expo-image-picker";
import { uploadGalleryItem } from "../../src/api/galleryApi";

export default function AddWorkScreen() {
    const router = useRouter();
    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === "dark";

    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [selectedImage, setSelectedImage] = useState(null); // { uri, name, type }
    const [isUploading, setIsUploading] = useState(false);

    const handlePickImage = async () => {
        // Request library permissions
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
            Alert.alert("Permission Required", "Please grant photo library access to upload project photos.");
            return;
        }

        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                quality: 0.8,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                const asset = result.assets[0];
                const uri = asset.uri;
                const name = asset.fileName || uri.split("/").pop() || "project.jpg";
                const type = asset.mimeType || "image/jpeg";

                setSelectedImage({ uri, name, type });
            }
        } catch (err) {
            console.error("Error picking image:", err);
            Alert.alert("Error", "Failed to select image from gallery.");
        }
    };

    const handleUpload = async () => {
        if (!selectedImage) {
            Alert.alert("Error", "Please select a project photo to upload.");
            return;
        }
        if (!title.trim()) {
            Alert.alert("Error", "Project title is required.");
            return;
        }
        if (title.length > 100) {
            Alert.alert("Error", "Title cannot exceed 100 characters.");
            return;
        }
        if (description.length > 500) {
            Alert.alert("Error", "Description cannot exceed 500 characters.");
            return;
        }

        setIsUploading(true);
        try {
            const formData = new FormData();
            formData.append("title", title.trim());
            formData.append("description", description.trim());
            formData.append("image", {
                uri: selectedImage.uri,
                name: selectedImage.name,
                type: selectedImage.type
            });

            const res = await uploadGalleryItem(formData);
            if (res.data.success) {
                Alert.alert("Success", "Project photo uploaded successfully!", [
                    {
                        text: "OK",
                        onPress: () => {
                            if (router.canGoBack()) {
                                router.back();
                            } else {
                                router.replace("/(tabs)/gallery");
                            }
                        }
                    }
                ]);
            }
        } catch (err) {
            console.error("Gallery upload error:", err);
            const msg = err.response?.data?.message || "Failed to upload project photo. Please try again.";
            Alert.alert("Upload Failed", msg);
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950" edges={["top", "left", "right"]}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

            {/* Header */}
            <View className="flex-row items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-900 bg-white dark:bg-slate-950">
                <TouchableOpacity
                    onPress={() => router.back()}
                    className="w-10 h-10 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full items-center justify-center active:opacity-85"
                >
                    <Ionicons name="arrow-back" size={20} color={isDark ? "white" : "#0f172a"} />
                </TouchableOpacity>
                <Text className="text-lg font-bold text-slate-900 dark:text-white">Upload Project Photo</Text>
                <View className="w-10" />
            </View>

            <ScrollView className="flex-1 px-5 py-6" showsVerticalScrollIndicator={false}>
                {/* Photo Upload Card Selector */}
                <TouchableOpacity
                    onPress={handlePickImage}
                    className="bg-white dark:bg-slate-900 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl h-[200] items-center justify-center overflow-hidden mb-6 shadow-sm"
                >
                    {selectedImage ? (
                        <Image
                            source={{ uri: selectedImage.uri }}
                            className="w-full h-full"
                            resizeMode="cover"
                        />
                    ) : (
                        <View className="items-center">
                            <Ionicons name="cloud-upload-outline" size={40} color="#6366f1" />
                            <Text className="text-slate-800 dark:text-white font-bold text-sm mt-3">Select Project Photo</Text>
                            <Text className="text-slate-400 dark:text-slate-500 text-[10px] mt-1 font-medium">JPEG, JPG, PNG, WEBP (Max 5MB)</Text>
                        </View>
                    )}
                </TouchableOpacity>

                {/* Title input */}
                <View className="gap-y-1.5 mb-5">
                    <Text className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-widest pl-1">Project Title</Text>
                    <TextInput
                        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3.5 text-slate-900 dark:text-white text-sm"
                        placeholder="e.g. Living room wiring, kitchen sink pipe replacement"
                        placeholderTextColor={isDark ? "#64748b" : "#94a3b8"}
                        value={title}
                        onChangeText={setTitle}
                        maxLength={100}
                    />
                    <Text className="text-slate-400 dark:text-slate-500 text-[9px] text-right font-medium pr-1">
                        {title.length}/100
                    </Text>
                </View>

                {/* Description input */}
                <View className="gap-y-1.5 mb-8">
                    <Text className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-widest pl-1">Project Description (Optional)</Text>
                    <TextInput
                        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3.5 text-slate-900 dark:text-white text-sm min-h-[100]"
                        placeholder="Describe what work was done, materials used, etc..."
                        placeholderTextColor={isDark ? "#64748b" : "#94a3b8"}
                        multiline
                        textAlignVertical="top"
                        value={description}
                        onChangeText={setDescription}
                        maxLength={500}
                    />
                    <Text className="text-slate-400 dark:text-slate-500 text-[9px] text-right font-medium pr-1">
                        {description.length}/500
                    </Text>
                </View>

                {/* Submit Action Button */}
                <TouchableOpacity
                    onPress={handleUpload}
                    disabled={isUploading}
                    className="bg-indigo-600 py-4 rounded-xl items-center justify-center active:opacity-90 shadow-lg shadow-indigo-600/25 mb-10"
                >
                    {isUploading ? (
                        <ActivityIndicator size="small" color="white" />
                    ) : (
                        <Text className="text-white font-bold text-sm">Upload Project</Text>
                    )}
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}
