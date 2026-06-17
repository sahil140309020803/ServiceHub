import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    StatusBar,
    Image,
    ScrollView,
    TextInput
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";
import api from "../src/services/api";
import useLocationStore from "../src/store/useLocationStore";
import useAuthStore from "../src/store/useAuthStore";

export default function CategoryWorkersScreen() {
    const router = useRouter();
    const { categoryId, categoryName, searchQuery } = useLocalSearchParams();
    const { location } = useLocationStore();
    const { user } = useAuthStore();
    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === "dark";

    const [workers, setWorkers] = useState([]);
    const [filteredWorkers, setFilteredWorkers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedFilter, setSelectedFilter] = useState("all"); // "all", "nearby", "top-rated", "available"
    const [sortBy, setSortBy] = useState("rating"); // "rating", "experience", "distance"
    const [favorites, setFavorites] = useState({});

    // Filter drawer states
    const [showFilters, setShowFilters] = useState(false);
    const [cityFilter, setCityFilter] = useState("");
    const [minRatingFilter, setMinRatingFilter] = useState(0);
    const [minExperienceFilter, setMinExperienceFilter] = useState(0);

    // Fetch user favorites on mount
    useEffect(() => {
        const fetchFavorites = async () => {
            if (!user) return;
            try {
                const response = await api.get("/api/favorites");
                if (response.data.success) {
                    const favs = {};
                    (response.data.data || []).forEach(favItem => {
                        if (favItem.workerId) {
                            const wId = favItem.workerId._id || favItem.workerId;
                            favs[wId] = true;
                        }
                    });
                    setFavorites(favs);
                }
            } catch (err) {
                console.error("Error fetching favorites:", err);
            }
        };
        fetchFavorites();
    }, [user]);

    // Fetch workers
    useEffect(() => {
        const fetchWorkers = async () => {
            setIsLoading(true);
            try {
                const queryParams = {};
                if (categoryId) queryParams.category = categoryId;
                if (searchQuery) queryParams.search = searchQuery;

                if (location) {
                    queryParams.lat = location.latitude;
                    queryParams.lng = location.longitude;
                }

                const response = await api.get("/api/workers", { params: queryParams });
                if (response.data.success) {
                    setWorkers(response.data.data || []);
                } else {
                    setError("Failed to retrieve specialists");
                }
            } catch (err) {
                console.error("Error fetching category workers:", err);
                setError("Failed to connect to service providers");
            } finally {
                setIsLoading(false);
            }
        };

        if (categoryId || searchQuery) {
            fetchWorkers();
        }
    }, [categoryId, searchQuery, location]);

    // Apply filter and sort
    useEffect(() => {
        let result = [...workers];

        // Apply tab filters
        if (selectedFilter === "nearby") {
            result = result.filter(w => w.distance !== undefined && w.distance < 16);
        } else if (selectedFilter === "top-rated") {
            result = result.filter(w => w.averageRating >= 4);
        } else if (selectedFilter === "available") {
            result = result.filter(w => w.availabilityStatus === "available");
        }

        // Apply drawer filters
        if (cityFilter.trim()) {
            const regex = new RegExp(cityFilter.trim(), "i");
            result = result.filter(w => w.serviceAreas && w.serviceAreas.some(area => regex.test(area.city)));
        }
        if (minRatingFilter > 0) {
            result = result.filter(w => w.averageRating >= minRatingFilter);
        }
        if (minExperienceFilter > 0) {
            result = result.filter(w => w.experienceYears >= minExperienceFilter);
        }

        // Apply sorting
        if (sortBy === "rating") {
            result.sort((a, b) => (b.averageRating || 0) - (a.averageRating || 0));
        } else if (sortBy === "experience") {
            result.sort((a, b) => (b.experienceYears || 0) - (a.experienceYears || 0));
        } else if (sortBy === "distance") {
            result.sort((a, b) => (a.distance || 9999) - (b.distance || 9999));
        }

        setFilteredWorkers(result);
    }, [workers, selectedFilter, sortBy, cityFilter, minRatingFilter, minExperienceFilter]);

    const getShortAddress = (addr) => {
        if (!addr) return "Select Location";
        const parts = addr.split(",");
        return parts.slice(0, 2).join(",").trim();
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

    const toggleFavorite = async (workerId) => {
        if (!user) return;
        try {
            const response = await api.post("/api/favorites/toggle", { workerId });
            if (response.data.success) {
                setFavorites(prev => ({
                    ...prev,
                    [workerId]: !prev[workerId]
                }));
            }
        } catch (err) {
            console.error("Error toggling favorite:", err);
        }
    };

    const renderWorkerItem = ({ item }) => {
        const userDetails = item.userId || {};
        const fullName = userDetails.fullName || "Professional";
        const profileImage = userDetails.profileImage || "";
        const isFav = !!favorites[item._id];
        const isAvailable = item.availabilityStatus === "available";
        const cityLoc = item.serviceAreas?.[0]?.city || "Local Area";

        // Predefined or fallback skills
        const skillsList = item.skills && item.skills.length > 0
            ? item.skills
            : ["General Service", "Maintenance", "Consultation"];

        return (
            <TouchableOpacity
                activeOpacity={0.95}
                onPress={() => router.push(`/worker-profile?workerId=${item._id}`)}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-3xl p-5 mb-4 relative shadow-lg shadow-slate-200/40 dark:shadow-slate-950/40"
            >
                {/* Heart/Favorite Icon */}
                <TouchableOpacity
                    onPress={() => toggleFavorite(item._id)}
                    className="absolute top-5 right-5 z-10 w-9 h-9 items-center justify-center rounded-full bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800"
                >
                    <Ionicons
                        name={isFav ? "heart" : "heart-outline"}
                        size={18}
                        color={isFav ? "#ef4444" : (isDark ? "#94a3b8" : "#64748b")}
                    />
                </TouchableOpacity>

                <View className="flex-row">
                    {/* Avatar with Status indicator dot */}
                    <View className="mr-4 relative">
                        {profileImage ? (
                            <Image
                                source={{ uri: profileImage }}
                                className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                            />
                        ) : (
                            <View className="w-16 h-16 rounded-full bg-indigo-600 items-center justify-center border border-indigo-500/30">
                                <Text className="text-white text-xl font-bold">
                                    {getInitials(fullName)}
                                </Text>
                            </View>
                        )}
                        <View className={`absolute bottom-0 right-0 w-4.5 h-4.5 rounded-full border-2 border-white dark:border-slate-900 ${isAvailable ? "bg-emerald-500" : "bg-amber-500"
                            }`} />
                    </View>

                    {/* Information */}
                    <View className="flex-1 pr-10">
                        <Text className="text-slate-900 dark:text-white font-extrabold text-base tracking-tight" numberOfLines={1}>
                            {fullName}
                        </Text>
                        <Text className="text-indigo-600 dark:text-indigo-400 text-xs font-semibold mt-0.5">
                            {item.profession || categoryName || "Specialist"}
                        </Text>

                        {/* Rating & Exp */}
                        <View className="flex-row items-center mt-2.5">
                            <Ionicons name="star" size={12} color="#f59e0b" />
                            <Text className="text-slate-900 dark:text-white text-xs font-extrabold ml-1">
                                {item.averageRating > 0 ? item.averageRating.toFixed(1) : "New"}
                            </Text>
                             <Text className="text-slate-500 dark:text-slate-400 text-[10px] font-semibold ml-0.5">
                                ({item.totalReviews})
                            </Text>
                            <Text className="text-slate-300 dark:text-slate-700 text-xs mx-1.5">•</Text>
                            <Text className="text-slate-600 dark:text-slate-300 text-[11px] font-semibold">
                                {item.experienceYears} Years Exp.
                            </Text>
                        </View>

                        {/* Location/Distance & Available badge */}
                        <View className="flex-row items-center justify-between mt-2 pr-4">
                            <View className="flex-row items-center">
                                <Ionicons name="location-outline" size={13} color="#6366f1" />
                                 <Text className="text-slate-500 dark:text-slate-400 text-xs font-semibold ml-1">
                                    {item.distance !== undefined && item.distance !== 999999
                                        ? `${item.distance.toFixed(1)} km away`
                                        : cityLoc}
                                </Text>
                            </View>

                            <View className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 rounded-full px-2 py-0.5 flex-row items-center">
                                <View className={`w-1.5 h-1.5 rounded-full mr-1.5 ${isAvailable ? "bg-emerald-500" : "bg-amber-500"
                                    }`} />
                                <Text className={`text-[9px] font-extrabold uppercase tracking-wider ${isAvailable ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"
                                    }`}>
                                    {isAvailable ? "Available" : "Busy"}
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Skills & Action bottom Row */}
                <View className="flex-row justify-between items-center mt-4 pt-3.5 border-t border-slate-100 dark:border-slate-800/60">
                    <View className="flex-row flex-wrap gap-1.5 flex-1 mr-2">
                        {skillsList.slice(0, 3).map((skill, idx) => (
                            <View key={idx} className="bg-indigo-500/5 dark:bg-indigo-50/5 border border-indigo-500/10 px-2.5 py-1 rounded-xl">
                                <Text className="text-indigo-600 dark:text-indigo-300 text-[9px] font-semibold">
                                    {skill}
                                </Text>
                            </View>
                        ))}
                        {skillsList.length > 3 && (
                            <View className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-2 py-1 rounded-xl">
                                <Text className="text-slate-600 dark:text-slate-400 text-[9px] font-extrabold">
                                    +{skillsList.length - 3}
                                </Text>
                            </View>
                        )}
                    </View>

                    <View className="bg-indigo-600 px-4 py-2 rounded-2xl flex-row items-center border border-indigo-500/30 shadow-md shadow-indigo-500/20">
                        <Text className="text-white font-black text-[10px] uppercase tracking-wider mr-1">View Profile</Text>
                        <Ionicons name="chevron-forward-circle" size={14} color="white" />
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950">
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

            {/* Header */}
            <View className="flex-row items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-900 bg-white dark:bg-slate-950">
                <View className="flex-row items-center flex-1 mr-4">
                    <TouchableOpacity
                        onPress={() => router.canGoBack() ? router.back() : router.replace("/(tabs)/Home")}
                        className="w-10 h-10 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full items-center justify-center mr-3"
                    >
                        <Ionicons name="arrow-back" size={20} color={isDark ? "white" : "#0f172a"} />
                    </TouchableOpacity>
                    <View className="flex-1">
                        <Text className="text-lg font-extrabold text-slate-900 dark:text-white" numberOfLines={1}>
                            {searchQuery ? `Search: "${searchQuery}"` : (categoryName || "Specialists")}
                        </Text>
                        <TouchableOpacity className="flex-row items-center mt-0.5">
                            <Ionicons name="location" size={12} color="#6366f1" className="mr-1" />
                            <Text className="text-slate-500 dark:text-slate-400 text-xs font-semibold mr-1" numberOfLines={1}>
                                {location?.address ? getShortAddress(location.address) : "Koramangala, Bangalore"}
                            </Text>
                            <Ionicons name="chevron-down" size={12} color={isDark ? "#64748b" : "#475569"} />
                        </TouchableOpacity>
                    </View>
                </View>
                <View className="flex-row items-center gap-x-2">
                    <TouchableOpacity onPress={() => router.push("/search")} className="w-10 h-10 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl items-center justify-center">
                        <Ionicons name="search" size={18} color={isDark ? "white" : "#0f172a"} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => setShowFilters(!showFilters)}
                        className={`w-10 h-10 border rounded-xl items-center justify-center ${showFilters || cityFilter || minRatingFilter > 0 || minExperienceFilter > 0
                            ? "bg-indigo-600/20 border-indigo-500"
                            : "bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                            }`}
                    >
                        <Ionicons name="options-outline" size={18} color={showFilters || cityFilter || minRatingFilter > 0 || minExperienceFilter > 0 ? "#818cf8" : (isDark ? "white" : "#0f172a")} />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Filter Expandable Panel */}
            {showFilters && (
                <View className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-5">
                    <Text className="text-slate-900 dark:text-white font-extrabold text-base mb-3">Filters</Text>
                    <ScrollView showsVerticalScrollIndicator={false} className="max-h-[300px]">
                        {/* City Filter */}
                        <Text className="text-slate-500 dark:text-slate-400 text-xs font-bold mb-2 uppercase tracking-wide">City</Text>
                        <View className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 mb-4">
                            <TextInput
                                value={cityFilter}
                                onChangeText={setCityFilter}
                                placeholder="Enter city name (e.g. New York)"
                                placeholderTextColor={isDark ? "#64748b" : "#94a3b8"}
                                className="text-slate-800 dark:text-white text-sm"
                            />
                        </View>

                        {/* Minimum Rating stars */}
                        <Text className="text-slate-500 dark:text-slate-400 text-xs font-bold mb-2 uppercase tracking-wide">Minimum Rating</Text>
                        <View className="flex-row gap-x-2 mb-4">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <TouchableOpacity
                                    key={star}
                                    onPress={() => setMinRatingFilter(star)}
                                    className={`flex-row items-center px-3 py-2 rounded-xl border ${minRatingFilter === star
                                        ? "bg-indigo-600 border-indigo-500"
                                        : "bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800"
                                        }`}
                                >
                                    <Text className={`text-xs font-extrabold mr-1 ${minRatingFilter === star ? "text-white" : "text-slate-600 dark:text-slate-400"}`}>
                                        {star}
                                    </Text>
                                    <Ionicons name="star" size={12} color={minRatingFilter === star ? "white" : "#64748b"} />
                                </TouchableOpacity>
                            ))}
                            {minRatingFilter > 0 && (
                                <TouchableOpacity
                                    onPress={() => setMinRatingFilter(0)}
                                    className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 justify-center"
                                >
                                    <Text className="text-slate-500 dark:text-slate-400 text-xs">Clear</Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        {/* Experience Years */}
                        <Text className="text-slate-500 dark:text-slate-400 text-xs font-bold mb-2 uppercase tracking-wide">Minimum Experience</Text>
                        <View className="flex-row gap-x-2 mb-2">
                            {[0, 1, 3, 5, 8].map((exp) => (
                                <TouchableOpacity
                                    key={exp}
                                    onPress={() => setMinExperienceFilter(exp)}
                                    className={`px-3 py-2 rounded-xl border ${minExperienceFilter === exp
                                        ? "bg-indigo-600 border-indigo-500"
                                        : "bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800"
                                        }`}
                                >
                                    <Text className={`text-xs font-bold ${minExperienceFilter === exp ? "text-white" : "text-slate-600 dark:text-slate-400"}`}>
                                        {exp === 0 ? "Any" : `${exp}+ Yrs`}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </ScrollView>

                    {/* Filter actions */}
                    <View className="flex-row gap-x-4 border-t border-slate-200 dark:border-slate-800/80 pt-4 mt-2">
                        <TouchableOpacity
                            onPress={() => {
                                setCityFilter("");
                                setMinRatingFilter(0);
                                setMinExperienceFilter(0);
                                setShowFilters(false);
                            }}
                            className="flex-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 py-3 rounded-xl items-center"
                        >
                            <Text className="text-slate-600 dark:text-slate-400 font-bold">Reset</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => setShowFilters(false)}
                            className="flex-1 bg-indigo-600 py-3 rounded-xl items-center"
                        >
                            <Text className="text-white font-bold">Apply Filters</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {/* Sub-header info & Filter options */}
            <View className="px-5 py-3 border-b border-slate-200 dark:border-slate-900/40 bg-white dark:bg-slate-950">
                <View className="flex-row justify-between items-center mb-3">
                    <Text className="text-slate-800 dark:text-slate-300 font-extrabold text-base">
                        {filteredWorkers.length} {searchQuery ? "Result" : (categoryName || "Specialist")}s Found
                    </Text>
                    {/* Sort selector */}
                    <TouchableOpacity
                        onPress={() => {
                            // Rotate sort option
                            if (sortBy === "rating") setSortBy("experience");
                            else if (sortBy === "experience") setSortBy("distance");
                            else setSortBy("rating");
                        }}
                        className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-2 rounded-xl flex-row items-center ml-2"
                    >
                        <Text className="text-slate-700 dark:text-slate-300 text-xs font-bold mr-1 uppercase">
                            Sort: {sortBy}
                        </Text>
                        <Ionicons name="chevron-down" size={12} color={isDark ? "#94a3b8" : "#475569"} />
                    </TouchableOpacity>
                </View>

                {/* Filter Chips row */}
                <View className="flex-row items-center">
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{ gap: 8 }}
                        className="flex-row"
                    >
                        {[
                            { id: "all", label: "All" },
                            { id: "nearby", label: "Nearby" },
                            { id: "top-rated", label: "Top Rated" },
                            { id: "available", label: "Available Now" },
                        ].map((chip) => {
                            const active = selectedFilter === chip.id;
                            return (
                                <TouchableOpacity
                                    key={chip.id}
                                    onPress={() => setSelectedFilter(chip.id)}
                                    className={`px-4 py-2 rounded-full border ${active
                                        ? "bg-indigo-600 border-indigo-500"
                                        : "bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
                                        }`}
                                >
                                     <Text className={`text-xs font-bold ${active ? "text-white" : "text-slate-500 dark:text-slate-400"}`}>
                                        {chip.label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>

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
                    <Text className="text-slate-900 dark:text-white text-base font-bold mt-4 text-center">{error}</Text>
                    <TouchableOpacity
                        onPress={() => router.canGoBack() ? router.back() : router.replace("/(tabs)/Home")}
                        className="mt-6 bg-indigo-600 px-6 py-3 rounded-xl"
                    >
                        <Text className="text-white font-bold">Go Back</Text>
                    </TouchableOpacity>
                </View>
            ) : filteredWorkers.length === 0 ? (
                <View className="flex-1 items-center justify-center px-6">
                    <View className="w-20 h-20 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full items-center justify-center mb-4">
                        <Ionicons name="people-outline" size={32} color="#64748b" />
                    </View>
                    <Text className="text-slate-900 dark:text-white text-lg font-bold text-center">
                        No professionals found
                    </Text>
                    <Text className="text-slate-500 dark:text-slate-400 text-sm mt-1 text-center max-w-xs">
                        There are currently no specialists matching the selected filters.
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={filteredWorkers}
                    keyExtractor={(item) => item._id}
                    renderItem={renderWorkerItem}
                    contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24 }}
                    showsVerticalScrollIndicator={false}
                />
            )}
        </SafeAreaView>
    );
}
