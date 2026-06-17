import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    StatusBar,
    Image,
    Alert,
    ScrollView
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useIsFocused } from "@react-navigation/native";
import { useColorScheme } from "nativewind";
import api from "../../src/services/api";
import useAuthStore from "../../src/store/useAuthStore";

export default function FavoritesScreen() {
    const { user } = useAuthStore();
    const isWorker = user?.role === "worker" || user?.role === "admin";

    if (isWorker) {
        return <WorkerInsightsTab />;
    }

    return <CustomerFavoritesTab />;
}

// ----------------------------------------------------
// WORKER INSIGHTS VIEW
// ----------------------------------------------------
function WorkerInsightsTab() {
    const isFocused = useIsFocused();
    const [stats, setStats] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === "dark";

    const fetchStats = async (showLoader = true) => {
        if (showLoader) setIsLoading(true);
        try {
            const response = await api.get("/api/extensions/contacts/stats");
            if (response.data.success) {
                setStats(response.data.data);
            }
        } catch (err) {
            console.error("Error fetching contact stats:", err);
            // Don't show Alert modal immediately if tab changes focus
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        if (isFocused) {
            fetchStats(true);
        }
    }, [isFocused]);

    const handleRefresh = () => {
        setIsRefreshing(true);
        fetchStats(false);
    };

    const getInitials = (name) => {
        if (!name) return "C";
        return name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);
    };

    const totalLeads = stats?.totalClicks || 0;
    const whatsappLeads = stats?.whatsappClicks || 0;
    const callLeads = stats?.callClicks || 0;
    const recentClicks = stats?.recentClicks || [];

    return (
        <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950" edges={["top", "left", "right"]}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

            {/* Header */}
            <View className="px-5 py-4 border-b border-slate-200 dark:border-slate-900 bg-white dark:bg-slate-950">
                <Text className="text-2xl font-extrabold text-slate-900 dark:text-white">Professional Insights</Text>
                <Text className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">Leads analytics and profile engagement</Text>
            </View>

            {isLoading ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color="#6366f1" />
                </View>
            ) : (
                <ScrollView
                    className="flex-1 px-5"
                    showsVerticalScrollIndicator={false}
                    onRefresh={handleRefresh}
                    refreshing={isRefreshing}
                >
                    {/* Metrics Cards Grid */}
                    <View className="flex-row gap-x-4 mt-6">
                        {/* Total Leads Card */}
                        <View className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 items-center justify-center relative overflow-hidden shadow-lg shadow-black/10 dark:shadow-black/40">
                            <View className="absolute right-[-10] top-[-10] opacity-5">
                                <Ionicons name="people" size={80} color={isDark ? "white" : "black"} />
                            </View>
                            <Text className="text-slate-500 dark:text-slate-400 text-[10px] font-extrabold uppercase tracking-wider text-center">
                                Total Leads
                            </Text>
                            <Text className="text-slate-900 dark:text-white text-3xl font-black mt-2 text-center">
                                {totalLeads}
                            </Text>
                        </View>

                        {/* WhatsApp Card */}
                        <View className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 items-center justify-center relative overflow-hidden shadow-lg shadow-black/10 dark:shadow-black/40">
                            <View className="absolute right-[-10] top-[-10] opacity-5">
                                <Ionicons name="logo-whatsapp" size={80} color={isDark ? "white" : "black"} />
                            </View>
                            <Text className="text-emerald-500 dark:text-emerald-400 text-[10px] font-extrabold uppercase tracking-wider text-center">
                                WhatsApp
                            </Text>
                            <Text className="text-slate-900 dark:text-white text-3xl font-black mt-2 text-center">
                                {whatsappLeads}
                            </Text>
                        </View>

                        {/* Calls Card */}
                        <View className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 items-center justify-center relative overflow-hidden shadow-lg shadow-black/10 dark:shadow-black/40">
                            <View className="absolute right-[-10] top-[-10] opacity-5">
                                <Ionicons name="call" size={80} color={isDark ? "white" : "black"} />
                            </View>
                            <Text className="text-indigo-600 dark:text-indigo-400 text-[10px] font-extrabold uppercase tracking-wider text-center">
                                Phone Calls
                            </Text>
                            <Text className="text-slate-900 dark:text-white text-3xl font-black mt-2 text-center">
                                {callLeads}
                            </Text>
                        </View>
                    </View>

                    {/* Recent Inquiries Section */}
                    <Text className="text-slate-900 dark:text-white font-extrabold text-base mt-8 mb-4">Recent Inquiries</Text>

                    {recentClicks.length === 0 ? (
                        <View className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 items-center justify-center mb-10 shadow-sm">
                            <Ionicons name="stats-chart-outline" size={36} color="#64748b" />
                            <Text className="text-slate-500 dark:text-slate-400 text-sm mt-3 font-semibold text-center">
                                No inquiries recorded yet
                            </Text>
                            <Text className="text-slate-600 dark:text-slate-500 text-xs mt-1 text-center max-w-xs leading-relaxed">
                                Once customers tap Call or WhatsApp on your profile page, their contact requests will appear here.
                            </Text>
                        </View>
                    ) : (
                        <View className="gap-y-3 pb-10">
                            {recentClicks.map((click) => {
                                const customer = click.customerId || {};
                                const custName = customer.fullName || "Guest User";
                                const hasContact = customer.phoneNumber || customer.email;

                                return (
                                    <View
                                        key={click._id}
                                        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex-row items-center justify-between shadow-sm"
                                    >
                                        <View className="flex-row items-center flex-1 mr-2">
                                            <View className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 items-center justify-center border border-slate-200 dark:border-slate-700 mr-3">
                                                <Text className="text-indigo-600 dark:text-indigo-400 font-bold text-sm">
                                                    {getInitials(custName)}
                                                </Text>
                                            </View>
                                            <View className="flex-1">
                                                <Text className="text-slate-900 dark:text-white font-bold text-sm" numberOfLines={1}>
                                                    {custName}
                                                </Text>
                                                {hasContact ? (
                                                    <Text className="text-slate-500 dark:text-slate-400 text-xs mt-0.5" numberOfLines={1}>
                                                        {customer.phoneNumber || customer.email}
                                                    </Text>
                                                ) : (
                                                    <Text className="text-slate-600 dark:text-slate-500 text-xs mt-0.5 italic">
                                                        Guest contact lead
                                                    </Text>
                                                )}
                                            </View>
                                        </View>

                                        <View className="items-end">
                                            <View className="flex-row items-center bg-slate-50 dark:bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800/80">
                                                <Ionicons
                                                    name={click.contactType === "whatsapp" ? "logo-whatsapp" : "call-outline"}
                                                    size={12}
                                                    color={click.contactType === "whatsapp" ? "#10b981" : "#6366f1"}
                                                />
                                                <Text className="text-slate-700 dark:text-slate-300 text-[10px] font-bold uppercase tracking-wider ml-1">
                                                    {click.contactType}
                                                </Text>
                                            </View>
                                            <Text className="text-slate-500 text-[9px] font-semibold mt-1">
                                                {new Date(click.createdAt).toLocaleDateString()}
                                            </Text>
                                        </View>
                                    </View>
                                );
                            })}
                        </View>
                    )}
                </ScrollView>
            )}
        </SafeAreaView>
    );
}

// ----------------------------------------------------
// CUSTOMER SAVED LIST VIEW
// ----------------------------------------------------
function CustomerFavoritesTab() {
    const router = useRouter();
    const isFocused = useIsFocused();
    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === "dark";

    const [favorites, setFavorites] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const fetchFavorites = async (showLoader = true) => {
        if (showLoader) setIsLoading(true);
        try {
            const response = await api.get("/api/favorites");
            if (response.data.success) {
                setFavorites(response.data.data || []);
            }
        } catch (err) {
            console.error("Error fetching favorites list:", err);
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        if (isFocused) {
            fetchFavorites(true);
        }
    }, [isFocused]);

    const handleRefresh = () => {
        setIsRefreshing(true);
        fetchFavorites(false);
    };

    const handleRemoveFavorite = (workerId, fullName) => {
        Alert.alert(
            "Remove Saved Specialist",
            `Are you sure you want to remove ${fullName} from your saved list?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Remove",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            const response = await api.post("/api/favorites/toggle", { workerId });
                            if (response.data.success) {
                                setFavorites((prev) => prev.filter((fav) => fav.workerId?._id !== workerId));
                            }
                        } catch (err) {
                            console.error("Error removing favorite:", err);
                            Alert.alert("Error", "Failed to remove specialist from favorites");
                        }
                    }
                }
            ]
        );
    };

    const getInitials = (name) => {
        if (!name) return "P";
        return name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);
    };

    const renderFavoriteItem = ({ item }) => {
        const worker = item.workerId || {};
        const userDetails = worker.userId || {};
        const fullName = userDetails.fullName || "Service Specialist";
        const profileImage = userDetails.profileImage || "";
        const city = worker.serviceAreas?.[0]?.city || "Local Area";

        return (
            <TouchableOpacity
                onPress={() => router.push(`/worker-profile?workerId=${worker._id}`)}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 mb-4 flex-row active:opacity-95 shadow-sm"
            >
                <View className="mr-4">
                    {profileImage ? (
                        <Image
                            source={{ uri: profileImage }}
                            className="w-16 h-16 rounded-xl bg-slate-100 dark:bg-slate-800"
                        />
                    ) : (
                        <View className="w-16 h-16 rounded-xl bg-indigo-600 items-center justify-center">
                            <Text className="text-white text-xl font-bold">
                                {getInitials(fullName)}
                            </Text>
                        </View>
                    )}
                </View>

                <View className="flex-1 justify-between">
                    <View>
                        <View className="flex-row items-center justify-between">
                            <Text className="text-slate-900 dark:text-white font-extrabold text-base flex-1 mr-1" numberOfLines={1}>
                                {fullName}
                            </Text>
                            <TouchableOpacity
                                onPress={() => handleRemoveFavorite(worker._id, fullName)}
                                className="w-7 h-7 bg-indigo-600/10 border border-indigo-500/20 rounded-full items-center justify-center"
                            >
                                <Ionicons name="heart" size={14} color="#6366f1" />
                            </TouchableOpacity>
                        </View>
                        <Text className="text-slate-500 dark:text-slate-400 text-xs font-semibold mt-0.5">
                            {worker.profession}
                        </Text>
                    </View>

                    <View className="flex-row items-center justify-between mt-3">
                        <View className="flex-row items-center space-x-3">
                            <View className="flex-row items-center">
                                <Ionicons name="star" size={14} color="#f59e0b" />
                                <Text className="text-slate-800 dark:text-white text-xs font-bold ml-1">
                                    {worker.averageRating > 0 ? worker.averageRating.toFixed(1) : "New"}
                                </Text>
                                <Text className="text-slate-500 dark:text-slate-400 text-[10px] font-semibold ml-0.5">
                                    ({worker.totalReviews || 0})
                                </Text>
                            </View>
                            <Text className="text-slate-300 dark:text-slate-700 text-xs">|</Text>
                            <Text className="text-slate-600 dark:text-slate-300 text-xs font-semibold">
                                {worker.experienceYears} Years Exp
                            </Text>
                        </View>

                        <View className="flex-row items-center">
                            <Ionicons name="location-outline" size={12} color="#6366f1" />
                            <Text className="text-slate-500 dark:text-slate-400 text-xs font-semibold ml-1">
                                {city}
                            </Text>
                        </View>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950" edges={["top", "left", "right"]}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

            <View className="px-5 py-4 border-b border-slate-200 dark:border-slate-900 bg-white dark:bg-slate-950">
                <Text className="text-2xl font-extrabold text-slate-900 dark:text-white">Saved Specialists</Text>
                <Text className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">Your bookmarked service professionals</Text>
            </View>

            {isLoading ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color="#6366f1" />
                </View>
            ) : favorites.length === 0 ? (
                <View className="flex-1 items-center justify-center px-6">
                    <View className="w-20 h-20 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full items-center justify-center mb-4">
                        <Ionicons name="heart-outline" size={32} color="#64748b" />
                    </View>
                    <Text className="text-slate-900 dark:text-white text-lg font-bold text-center">
                        No saved professionals yet
                    </Text>
                    <Text className="text-slate-500 dark:text-slate-400 text-sm mt-1 text-center max-w-xs leading-relaxed">
                        {"Tap the heart icon on any specialist's profile to save them here for quick access."}
                    </Text>
                    <TouchableOpacity
                        onPress={() => router.push("/search")}
                        className="mt-6 bg-indigo-600 px-6 py-3.5 rounded-xl shadow-lg shadow-indigo-500/25 active:opacity-90"
                    >
                        <Text className="text-white font-bold text-sm">Discover Professionals</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <FlatList
                    data={favorites}
                    keyExtractor={(item) => item._id}
                    renderItem={renderFavoriteItem}
                    contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24 }}
                    showsVerticalScrollIndicator={false}
                    onRefresh={handleRefresh}
                    refreshing={isRefreshing}
                />
            )}
        </SafeAreaView>
    );
}
