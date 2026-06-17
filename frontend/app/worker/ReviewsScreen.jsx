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
import { useColorScheme } from "nativewind";
import api from "../../src/services/api";

export default function ReviewsScreen() {
    const isFocused = useIsFocused();
    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === "dark";

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

    const renderHeader = () => {
        if (stats.totalReviews === 0) return null;

        let ratingText = "Outstanding";
        if (stats.averageRating < 4.8) ratingText = "Excellent";
        if (stats.averageRating < 4.0) ratingText = "Very Good";
        if (stats.averageRating < 3.0) ratingText = "Average";

        return (
            <View className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-3xl p-5 mb-5 flex-row items-center justify-between shadow-sm relative overflow-hidden">
                <View className="absolute top-[-30] right-[-30] w-28 h-28 bg-indigo-600/10 rounded-full blur-xl" />

                <View className="flex-1">
                    <View className="flex-row items-baseline">
                        <Text className="text-4xl font-black text-slate-900 dark:text-white">{stats.averageRating.toFixed(1)}</Text>
                        <Text className="text-slate-500 text-xs font-semibold ml-1.5">/5</Text>
                    </View>

                    <View className="flex-row items-center mt-2 space-x-0.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                            <Ionicons
                                key={s}
                                name={s <= Math.round(stats.averageRating) ? "star" : "star-outline"}
                                size={14}
                                color="#f59e0b"
                            />
                        ))}
                    </View>

                    <Text className="text-slate-500 dark:text-slate-400 text-xs mt-2 font-medium">
                        Based on {stats.totalReviews} customer feedback{stats.totalReviews > 1 ? "s" : ""}
                    </Text>
                </View>

                <View className="bg-indigo-50 dark:bg-indigo-600/10 border border-indigo-100 dark:border-indigo-500/20 rounded-2xl px-4 py-3 items-center justify-center">
                    <Ionicons name="ribbon-outline" size={22} color="#6366f1" />
                    <Text className="text-indigo-600 dark:text-indigo-400 font-extrabold text-xs mt-1.5">{ratingText}</Text>
                </View>
            </View>
        );
    };

    const renderReviewCard = ({ item }) => {
        const customer = item.customerId || {};
        const custName = customer.fullName || "Customer";

        return (
            <View className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/70 rounded-3xl p-5 mb-4 shadow-sm relative overflow-hidden">
                {/* Background double quotation mark for visual flair */}
                <View className="absolute right-4 bottom-2 opacity-5">
                    <Ionicons name="chatbubbles" size={60} color="#64748b" />
                </View>

                <View className="flex-row justify-between items-start">
                    <View className="flex-row items-center flex-1 mr-2">
                        {/* Initial Circle with indigo gradient */}
                        <View className="w-11 h-11 rounded-full bg-indigo-600 items-center justify-center mr-3.5 border border-indigo-500/30">
                            <Text className="text-white font-extrabold text-sm">
                                {getInitials(custName)}
                            </Text>
                        </View>

                        <View className="flex-1">
                            <Text className="text-slate-900 dark:text-white font-extrabold text-sm" numberOfLines={1}>
                                {custName}
                            </Text>
                            <Text className="text-slate-500 dark:text-slate-400 text-[10px] font-semibold mt-0.5">
                                {new Date(item.createdAt).toLocaleDateString()}
                            </Text>
                        </View>
                    </View>

                    {/* Render exact stars dynamically */}
                    <View className="flex-row items-center space-x-0.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                            <Ionicons
                                key={s}
                                name={s <= item.rating ? "star" : "star-outline"}
                                size={11}
                                color="#f59e0b"
                            />
                        ))}
                    </View>
                </View>

                {item.reviewText ? (
                    <Text className="text-slate-700 dark:text-slate-300 text-xs leading-relaxed mt-4 pl-0.5">
                        {"\""}{item.reviewText}{"\""}
                    </Text>
                ) : (
                    <Text className="text-slate-500 dark:text-slate-500 text-xs italic mt-4 pl-0.5">
                        No review comments left.
                    </Text>
                )}
            </View>
        );
    };

    return (
        <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950" edges={["top", "left", "right"]}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

            {/* Header section without static aggregate summaries */}
            <View className="px-5 py-4 border-b border-slate-200 dark:border-slate-900 bg-white dark:bg-slate-950">
                <Text className="text-2xl font-extrabold text-slate-900 dark:text-white">Client Reviews</Text>
                <Text className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">Ratings and feedback from completed orders</Text>
            </View>

            {isLoading ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color="#6366f1" />
                </View>
            ) : reviews.length === 0 ? (
                <View className="flex-1 items-center justify-center px-6">
                    <View className="w-16 h-16 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full items-center justify-center mb-4 shadow-sm">
                        <Ionicons name="chatbox-outline" size={28} color="#64748b" />
                    </View>
                    <Text className="text-slate-900 dark:text-white text-base font-bold text-center">No reviews received yet</Text>
                    <Text className="text-slate-500 dark:text-slate-400 text-xs mt-1 text-center max-w-xs leading-relaxed">
                        Once clients book your services and complete their orders, their ratings and reviews will show up here.
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={reviews}
                    keyExtractor={(item) => item._id}
                    renderItem={renderReviewCard}
                    ListHeaderComponent={renderHeader}
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
