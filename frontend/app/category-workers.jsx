import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    StatusBar,
    Image
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import api from "../src/services/api";

export default function CategoryWorkersScreen() {
    const router = useRouter();
    const { categoryId, categoryName } = useLocalSearchParams();

    const [workers, setWorkers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchWorkers = async () => {
            setIsLoading(true);
            try {
                // Fetch workers matching this category
                const response = await api.get(`/api/workers?category=${categoryId}`);
                if (response.data.success) {
                    setWorkers(response.data.data);
                } else {
                    setError("Failed to retrieve workers");
                }
            } catch (err) {
                console.error("Error fetching category workers:", err);
                setError("Failed to fetch service professionals");
            } finally {
                setIsLoading(false);
            }
        };

        if (categoryId) {
            fetchWorkers();
        }
    }, [categoryId]);

    const getInitials = (name) => {
        if (!name) return "P";
        return name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);
    };

    const getAvailabilityBadge = (status) => {
        switch (status) {
            case "available":
                return { text: "Available", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" };
            case "busy":
                return { text: "Busy", color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" };
            default:
                return { text: "Offline", color: "text-slate-400", bg: "bg-slate-500/10 border-slate-500/20" };
        }
    };

    const renderWorkerItem = ({ item }) => {
        const userDetails = item.userId || {};
        const fullName = userDetails.fullName || "Professional";
        const email = userDetails.email || "";
        const profileImage = userDetails.profileImage || "";
        const availability = getAvailabilityBadge(item.availabilityStatus);
        
        // Find default/first city in service areas
        const city = item.serviceAreas?.[0]?.city || "Local Area";

        return (
            <TouchableOpacity
                onPress={() => router.push(`/worker-profile?workerId=${item._id}`)}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-4 flex-row active:opacity-95"
            >
                {/* Profile Avatar */}
                <View className="mr-4">
                    {profileImage ? (
                        <Image
                            source={{ uri: profileImage }}
                            className="w-16 h-16 rounded-xl bg-slate-800"
                        />
                    ) : (
                        <View className="w-16 h-16 rounded-xl bg-indigo-600 items-center justify-center">
                            <Text className="text-white text-xl font-bold">
                                {getInitials(fullName)}
                            </Text>
                        </View>
                    )}
                    
                    {/* Verified indicator badge */}
                    {item.isVerified && (
                        <View className="absolute bottom-[-4] right-[-4] bg-indigo-500 rounded-full p-0.5 border-2 border-slate-900">
                            <Ionicons name="checkmark-circle" size={14} color="white" />
                        </View>
                    )}
                </View>

                {/* Info Content */}
                <View className="flex-1 justify-between">
                    <View>
                        <View className="flex-row items-center justify-between">
                            <Text className="text-white font-extrabold text-base flex-1 mr-1" numberOfLines={1}>
                                {fullName}
                            </Text>
                            
                            {/* Availability status */}
                            <View className={`px-2 py-0.5 rounded-full border ${availability.bg}`}>
                                <Text className={`text-[10px] font-bold uppercase tracking-wider ${availability.color}`}>
                                    {availability.text}
                                </Text>
                            </View>
                        </View>
                        <Text className="text-slate-400 text-xs font-semibold mt-0.5">
                            {item.profession}
                        </Text>
                    </View>

                    {/* Stats and metadata row */}
                    <View className="flex-row items-center justify-between mt-3">
                        <View className="flex-row items-center space-x-3">
                            {/* Rating */}
                            <View className="flex-row items-center">
                                <Ionicons name="star" size={14} color="#f59e0b" />
                                <Text className="text-white text-xs font-bold ml-1">
                                    {item.averageRating > 0 ? item.averageRating.toFixed(1) : "New"}
                                </Text>
                                <Text className="text-slate-400 text-[10px] font-semibold ml-0.5">
                                    ({item.totalReviews})
                                </Text>
                            </View>

                            {/* Divider line */}
                            <Text className="text-slate-700 text-xs">|</Text>

                            {/* Experience */}
                            <Text className="text-slate-300 text-xs font-semibold">
                                {item.experienceYears} Years Exp
                            </Text>
                        </View>

                        {/* Location */}
                        <View className="flex-row items-center">
                            <Ionicons name="location-outline" size={12} color="#6366f1" />
                            <Text className="text-slate-400 text-xs font-semibold ml-1">
                                {city}
                            </Text>
                        </View>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView className="flex-1 bg-slate-950">
            <StatusBar barStyle="light-content" />

            {/* Header */}
            <View className="flex-row items-center px-5 py-4 border-b border-slate-900 bg-slate-950">
                <TouchableOpacity
                    onPress={() => router.canGoBack() ? router.back() : router.replace("/(tabs)/Home")}
                    className="w-10 h-10 bg-slate-900 border border-slate-800 rounded-full items-center justify-center mr-4"
                >
                    <Ionicons name="arrow-back" size={20} color="white" />
                </TouchableOpacity>
                <View>
                    <Text className="text-xl font-extrabold text-white">
                        {categoryName || "Service"} Specialists
                    </Text>
                    <Text className="text-slate-400 text-xs mt-0.5">
                        Trusted local experts in your area
                    </Text>
                </View>
            </View>

            {/* Content List */}
            {isLoading ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color="#6366f1" />
                </View>
            ) : error ? (
                <View className="flex-1 items-center justify-center px-6">
                    <Ionicons name="alert-circle-outline" size={48} color="#f43f5e" />
                    <Text className="text-white text-base font-bold mt-4 text-center">{error}</Text>
                    <TouchableOpacity
                        onPress={() => router.canGoBack() ? router.back() : router.replace("/(tabs)/Home")}
                        className="mt-6 bg-indigo-600 px-6 py-3 rounded-xl"
                    >
                        <Text className="text-white font-bold">Go Back</Text>
                    </TouchableOpacity>
                </View>
            ) : workers.length === 0 ? (
                <View className="flex-1 items-center justify-center px-6">
                    <View className="w-20 h-20 bg-slate-900 border border-slate-800 rounded-full items-center justify-center mb-4">
                        <Ionicons name="people-outline" size={32} color="#64748b" />
                    </View>
                    <Text className="text-white text-lg font-bold text-center">
                        No professionals found
                    </Text>
                    <Text className="text-slate-400 text-sm mt-1 text-center max-w-xs">
                        There are currently no registered professionals for {categoryName} in this area yet.
                    </Text>
                    <TouchableOpacity
                        onPress={() => router.canGoBack() ? router.back() : router.replace("/(tabs)/Home")}
                        className="mt-6 bg-slate-900 border border-slate-800 px-6 py-3 rounded-xl"
                    >
                        <Text className="text-slate-200 font-semibold">Go Back</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <FlatList
                    data={workers}
                    keyExtractor={(item) => item._id}
                    renderItem={renderWorkerItem}
                    contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24 }}
                    showsVerticalScrollIndicator={false}
                />
            )}
        </SafeAreaView>
    );
}
