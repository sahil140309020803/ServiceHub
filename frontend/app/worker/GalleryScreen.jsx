import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    StatusBar,
    Image,
    Dimensions,
    RefreshControl
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useIsFocused } from "@react-navigation/native";
import api from "../../src/services/api";

const { width } = Dimensions.get("window");
// Compute item width: padding-horizontal = 20, gap = 8
const ITEM_WIDTH = (width - 40 - 16) / 3;

export default function GalleryScreen() {
    const router = useRouter();
    const isFocused = useIsFocused();

    const [gallery, setGallery] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const loadProfileAndGallery = async (showLoader = true) => {
        if (showLoader) setIsLoading(true);
        try {
            // 1. Fetch own worker profile
            const profileRes = await api.get("/api/workers/me");
            if (profileRes.data.success && profileRes.data.data) {
                const profile = profileRes.data.data;

                // 2. Fetch gallery items using worker profile ID
                const galleryRes = await api.get(`/api/gallery/worker/${profile._id}`);
                if (galleryRes.data.success) {
                    setGallery(galleryRes.data.data || []);
                }
            }
        } catch (err) {
            console.error("Error fetching gallery list:", err);
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        if (isFocused) {
            loadProfileAndGallery(true);
        }
    }, [isFocused]);

    const handleRefresh = () => {
        setIsRefreshing(true);
        loadProfileAndGallery(false);
    };

    const renderGalleryItem = ({ item }) => {
        return (
            <TouchableOpacity
                onPress={() => router.push(`/worker/GalleryDetailsScreen?galleryId=${item._id}`)}
                activeOpacity={0.9}
                style={{ width: ITEM_WIDTH, height: ITEM_WIDTH }}
                className="bg-slate-900 rounded-xl overflow-hidden mr-2 mb-2 relative border border-slate-800"
            >
                <Image
                    source={{ uri: item.imageUrl }}
                    className="w-full h-full"
                    resizeMode="cover"
                />
                
                {/* Visual Stats Bottom Bar Overlay */}
                <View className="absolute bottom-0 left-0 right-0 bg-black/60 px-1.5 py-1 flex-row items-center justify-between">
                    <View className="flex-row items-center space-x-0.5">
                        <Ionicons name="eye" size={9} color="#94a3b8" />
                        <Text className="text-[8px] font-extrabold text-slate-300 ml-0.5">
                            {item.viewsCount || 0}
                        </Text>
                    </View>
                    <View className="flex-row items-center space-x-0.5">
                        <Ionicons name="heart" size={9} color="#ef4444" />
                        <Text className="text-[8px] font-extrabold text-slate-300 ml-0.5">
                            {item.likesCount || 0}
                        </Text>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView className="flex-1 bg-slate-950" edges={["top", "left", "right"]}>
            <StatusBar barStyle="light-content" />

            {/* Header */}
            <View className="px-5 py-4 border-b border-slate-900 bg-slate-950 flex-row items-center justify-between">
                <View>
                    <Text className="text-2xl font-extrabold text-white">My Work Gallery</Text>
                    <Text className="text-slate-400 text-xs mt-0.5">Showcase your completed projects ({gallery.length}/20)</Text>
                </View>

                {/* Add Work Button */}
                <TouchableOpacity
                    onPress={() => router.push("/worker/AddWorkScreen")}
                    className="bg-indigo-600 px-3.5 py-2 rounded-xl flex-row items-center space-x-1 active:opacity-90 shadow-lg shadow-indigo-600/20"
                >
                    <Ionicons name="add" size={16} color="white" />
                    <Text className="text-white font-bold text-xs">Add Work</Text>
                </TouchableOpacity>
            </View>

            {isLoading ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color="#6366f1" />
                </View>
            ) : gallery.length === 0 ? (
                <View className="flex-1 items-center justify-center px-6">
                    <View className="w-20 h-20 bg-slate-900 border border-slate-800 rounded-full items-center justify-center mb-4">
                        <Ionicons name="images-outline" size={36} color="#64748b" />
                    </View>
                    <Text className="text-white text-base font-bold text-center">No projects in your gallery yet</Text>
                    <Text className="text-slate-500 text-xs mt-1 text-center max-w-xs leading-relaxed">
                        Upload photos of your completed projects (e.g. clean wiring, repaired plumbing, renovated room) to show clients your work quality!
                    </Text>
                    <TouchableOpacity
                        onPress={() => router.push("/worker/AddWorkScreen")}
                        className="bg-indigo-600 px-6 py-3.5 rounded-xl mt-6 active:opacity-90 shadow-md shadow-indigo-600/10"
                    >
                        <Text className="text-white font-bold text-sm">Upload Your First Project</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <FlatList
                    data={gallery}
                    keyExtractor={(item) => item._id}
                    renderItem={renderGalleryItem}
                    numColumns={3}
                    contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24 }}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor="#6366f1" />
                    }
                />
            )}
        </SafeAreaView>
    );
}
