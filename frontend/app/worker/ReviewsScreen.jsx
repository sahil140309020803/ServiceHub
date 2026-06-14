import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    FlatList,
    ActivityIndicator,
    StatusBar,
    RefreshControl
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useIsFocused } from "@react-navigation/native";
import api from "../../src/services/api";

export default function ReviewsScreen() {
    const isFocused = useIsFocused();
    const [reviews, setReviews] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [stats, setStats] = useState({ averageRating: 0, totalReviews: 0 });

    const fetchReviewsAndStats = async (showLoader = true) => {
        if (showLoader) setIsLoading(true);
        try {
            // 1. Fetch own worker profile details
            const profileRes = await api.get("/api/workers/me");
            if (profileRes.data.success && profileRes.data.data) {
                const profile = profileRes.data.data;
                setStats({
                    averageRating: profile.averageRating || 0,
                    totalReviews: profile.totalReviews || 0
                });

                // 2. Fetch reviews
                const reviewsRes = await api.get(`/api/reviews/worker/${profile._id}`);
                if (reviewsRes.data.success) {
                    setReviews(reviewsRes.data.data || []);
                }
            }
        } catch (err) {
            console.error("Error loading reviews feed:", err);
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        if (isFocused) {
            fetchReviewsAndStats(true);
        }
    }, [isFocused]);

    const handleRefresh = () => {
        setIsRefreshing(true);
        fetchReviewsAndStats(false);
    };

    const getInitials = (name) => {
        if (!name) return "U";
        return name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);
    };

    const renderReviewCard = ({ item }) => {
        const customer = item.customerId || {};
        const custName = customer.fullName || "Customer";

        return (
            <View className="bg-slate-900 border border-slate-800 rounded-2xl p-4.5 mb-3 shadow-sm">
                <View className="flex-row justify-between items-start">
                    <View className="flex-row items-center flex-1 mr-2">
                        {/* Initial Circle */}
                        <View className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 items-center justify-center mr-3">
                            <Text className="text-white font-bold text-sm">
                                {getInitials(custName)}
                            </Text>
                        </View>
                        <View className="flex-1">
                            <Text className="text-white font-bold text-sm" numberOfLines={1}>
                                {custName}
                            </Text>
                            <Text className="text-slate-400 text-[10px] font-semibold mt-0.5">
                                {new Date(item.createdAt).toLocaleDateString()}
                            </Text>
                        </View>
                    </View>
                    
                    {/* Star Rating Badge */}
                    <View className="flex-row items-center bg-slate-950 border border-slate-800 px-2.5 py-1 rounded-lg">
                        <Text className="text-amber-400 text-xs font-black mr-1">{item.rating}</Text>
                        <Ionicons name="star" size={12} color="#f59e0b" />
                    </View>
                </View>

                {item.reviewText ? (
                    <Text className="text-slate-300 text-xs leading-relaxed mt-3.5 pl-1">
                        {item.reviewText}
                    </Text>
                ) : (
                    <Text className="text-slate-500 text-xs italic mt-3 pl-1">
                        No review comments left.
                    </Text>
                )}
            </View>
        );
    };

    return (
        <SafeAreaView className="flex-1 bg-slate-950" edges={["top", "left", "right"]}>
            <StatusBar barStyle="light-content" />

            {/* Header section with ratings summary card */}
            <View className="px-5 py-4 border-b border-slate-900 bg-slate-950 flex-row items-center justify-between">
                <View>
                    <Text className="text-2xl font-extrabold text-white">Client Reviews</Text>
                    <Text className="text-slate-400 text-xs mt-0.5">Ratings and feedback from completed orders</Text>
                </View>
                {/* Aggregate Summary */}
                {stats.totalReviews > 0 && (
                    <View className="bg-slate-900 border border-slate-800/80 px-3 py-1.5 rounded-xl flex-row items-center space-x-1">
                        <Ionicons name="star" size={14} color="#f59e0b" />
                        <Text className="text-white font-black text-sm">{stats.averageRating.toFixed(1)}</Text>
                        <Text className="text-slate-400 text-[10px] font-bold">({stats.totalReviews})</Text>
                    </View>
                )}
            </View>

            {isLoading ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color="#6366f1" />
                </View>
            ) : reviews.length === 0 ? (
                <View className="flex-1 items-center justify-center px-6">
                    <View className="w-16 h-16 bg-slate-900 border border-slate-800 rounded-full items-center justify-center mb-4">
                        <Ionicons name="chatbox-outline" size={28} color="#64748b" />
                    </View>
                    <Text className="text-white text-base font-bold text-center">No reviews received yet</Text>
                    <Text className="text-slate-500 text-xs mt-1 text-center max-w-xs leading-relaxed">
                        Once clients book your services and complete their orders, their ratings and reviews will show up here.
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={reviews}
                    keyExtractor={(item) => item._id}
                    renderItem={renderReviewCard}
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
