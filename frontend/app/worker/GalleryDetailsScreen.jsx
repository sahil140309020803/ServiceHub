import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    StatusBar,
    Image,
    Alert
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import useAuthStore from "../../src/store/useAuthStore";
import {
    getGalleryDetails,
    deleteGalleryItem,
    incrementView,
    likeGalleryItem,
    unlikeGalleryItem
} from "../../src/api/galleryApi";
import api from "../../src/services/api";

export default function GalleryDetailsScreen() {
    const router = useRouter();
    const { galleryId } = useLocalSearchParams();
    const { user } = useAuthStore();

    const [item, setItem] = useState(null);
    const [isOwner, setIsOwner] = useState(false);
    const [hasLiked, setHasLiked] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isDeleting, setIsDeleting] = useState(false);

    const loadDetails = async () => {
        setIsLoading(true);
        try {
            // 1. Log view count increase automatically
            await incrementView(galleryId).catch((err) =>
                console.error("View increment failed:", err)
            );

            // 2. Load item details
            const res = await getGalleryDetails(galleryId);
            if (res.data.success && res.data.data) {
                const galleryItem = res.data.data;
                setItem(galleryItem);
                setHasLiked(res.data.hasLiked || false);

                // 3. Verify ownership: check if logged-in user is the worker owner
                if (user && (user.role === "worker" || user.role === "admin")) {
                    const profileRes = await api.get("/api/workers/me").catch(() => null);
                    if (profileRes && profileRes.data.success && profileRes.data.data) {
                        const profile = profileRes.data.data;
                        if (String(profile._id) === String(galleryItem.workerId)) {
                            setIsOwner(true);
                        }
                    }
                }
            }
        } catch (err) {
            console.error("Error loading gallery item details:", err);
            Alert.alert("Error", "Failed to retrieve project details.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (galleryId) {
            loadDetails();
        }
    }, [galleryId]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleToggleLike = async () => {
        if (!user) {
            Alert.alert("Authentication Required", "Please log in to like project photos.");
            return;
        }

        try {
            if (hasLiked) {
                // Unlike item
                const res = await unlikeGalleryItem(galleryId);
                if (res.data.success) {
                    setHasLiked(false);
                    setItem((prev) => ({
                        ...prev,
                        likesCount: Math.max(0, (prev.likesCount || 0) - 1),
                    }));
                }
            } else {
                // Like item
                const res = await likeGalleryItem(galleryId);
                if (res.data.success) {
                    setHasLiked(true);
                    setItem((prev) => ({
                        ...prev,
                        likesCount: (prev.likesCount || 0) + 1,
                    }));
                }
            }
        } catch (err) {
            console.error("Error toggling like:", err);
            const msg = err.response?.data?.message || "Failed to update like status";
            Alert.alert("Error", msg);
        }
    };

    const handleDelete = () => {
        Alert.alert(
            "Delete Project Photo",
            "Are you sure you want to remove this project from your gallery?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        setIsDeleting(true);
                        try {
                            const res = await deleteGalleryItem(galleryId);
                            if (res.data.success) {
                                Alert.alert("Deleted", "Project photo removed successfully.", [
                                    {
                                        text: "OK",
                                        onPress: () => {
                                            if (router.canGoBack()) {
                                                router.back();
                                            } else {
                                                router.replace("/(tabs)/gallery");
                                            }
                                        },
                                    },
                                ]);
                            }
                        } catch (err) {
                            console.error("Deletion error:", err);
                            Alert.alert("Error", "Failed to delete project photo.");
                        } finally {
                            setIsDeleting(false);
                        }
                    },
                },
            ]
        );
    };

    if (isLoading) {
        return (
            <SafeAreaView className="flex-1 bg-slate-950 justify-center items-center">
                <ActivityIndicator size="large" color="#6366f1" />
            </SafeAreaView>
        );
    }

    if (!item) {
        return (
            <SafeAreaView className="flex-1 bg-slate-950 justify-center items-center px-6">
                <Ionicons name="alert-circle-outline" size={48} color="#f43f5e" />
                <Text className="text-white text-base font-bold mt-4 text-center">
                    Project photo not found
                </Text>
                <TouchableOpacity
                    onPress={() => router.back()}
                    className="mt-6 bg-indigo-600 px-6 py-3 rounded-xl"
                >
                    <Text className="text-white font-bold">Go Back</Text>
                </TouchableOpacity>
            </SafeAreaView>
        );
    }

    return (
        <View className="flex-1 bg-slate-950">
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

            {/* Immersive Full Screen Photo View */}
            <View className="absolute inset-0 w-full h-full justify-center items-center">
                <Image
                    source={{ uri: item.imageUrl }}
                    className="w-full h-full"
                    resizeMode="contain"
                />
            </View>

            {/* Absolute Top Header Actions */}
            <View className="absolute top-12 left-5 right-5 z-50 flex-row justify-between items-center">
                <TouchableOpacity
                    onPress={() => router.back()}
                    className="w-10 h-10 bg-slate-950/60 border border-slate-800/80 rounded-full items-center justify-center"
                >
                    <Ionicons name="arrow-back" size={20} color="white" />
                </TouchableOpacity>

                {/* Delete button (owner only) */}
                {isOwner ? (
                    <TouchableOpacity
                        onPress={handleDelete}
                        disabled={isDeleting}
                        className="w-10 h-10 bg-rose-500/20 border border-rose-500/30 rounded-full items-center justify-center"
                    >
                        {isDeleting ? (
                            <ActivityIndicator size="small" color="#f43f5e" />
                        ) : (
                            <Ionicons name="trash-outline" size={18} color="#f43f5e" />
                        )}
                    </TouchableOpacity>
                ) : (
                    <View className="w-10" />
                )}
            </View>

            {/* Floating Details Overlay Card */}
            <View className="absolute bottom-10 left-5 right-5 z-50 bg-slate-900/90 border border-slate-850 rounded-[28px] p-5 shadow-xl shadow-slate-950/50">
                <View className="flex-row justify-between items-start">
                    <View className="flex-1 mr-4">
                        <Text className="text-white font-black text-lg leading-tight">
                            {item.title || "Untitled Project"}
                        </Text>
                        <Text className="text-slate-500 text-[10px] font-bold mt-1">
                            Uploaded on {new Date(item.createdAt).toLocaleDateString()}
                        </Text>
                    </View>

                    {/* Heart/Like Button */}
                    <TouchableOpacity
                        onPress={handleToggleLike}
                        className={`w-11 h-11 rounded-full items-center justify-center border transition-all ${hasLiked
                                ? "bg-rose-500/10 border-rose-500/30"
                                : "bg-slate-950 border border-slate-850"
                            }`}
                    >
                        <Ionicons
                            name={hasLiked ? "heart" : "heart-outline"}
                            size={20}
                            color={hasLiked ? "#f43f5e" : "#94a3b8"}
                        />
                    </TouchableOpacity>
                </View>

                {/* Description Scrollbox */}
                {item.description ? (
                    <View className="mt-3.5 border-t border-slate-850/45 pt-3.5">
                        <ScrollView style={{ maxHeight: 75 }} showsVerticalScrollIndicator={false}>
                            <Text className="text-slate-300 text-xs leading-relaxed">
                                {item.description}
                            </Text>
                        </ScrollView>
                    </View>
                ) : null}

                {/* Stats Footer Row */}
                <View className="flex-row justify-start items-center space-x-3 mt-4 pt-3 border-t border-slate-850/45">
                    <View className="flex-row items-center bg-slate-950/60 border border-slate-850 px-2.5 py-1 rounded-lg">
                        <Ionicons name="eye-outline" size={11} color="#6366f1" />
                        <Text className="text-slate-400 text-[9px] font-bold ml-1">
                            {item.viewsCount || 0} views
                        </Text>
                    </View>
                    <View className="flex-row items-center bg-slate-950/60 border border-slate-850 px-2.5 py-1 rounded-lg">
                        <Ionicons name="heart-outline" size={11} color="#ef4444" />
                        <Text className="text-slate-400 text-[9px] font-bold ml-1">
                            {item.likesCount || 0} likes
                        </Text>
                    </View>
                </View>
            </View>
        </View>
    );
}
