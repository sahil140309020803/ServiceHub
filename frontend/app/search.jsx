import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    FlatList,
    ActivityIndicator,
    Image,
    StatusBar,
    ScrollView
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import api from "../src/services/api";
import useAuthStore from "../src/store/useAuthStore";
import useLocationStore from "../src/store/useLocationStore";

export default function SearchScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const { user } = useAuthStore();
    const { location } = useLocationStore();

    // Search and filter states
    const [searchQuery, setSearchQuery] = useState(params.query || "");
    const [city, setCity] = useState("");
    const [minRating, setMinRating] = useState(0);
    const [minExperience, setMinExperience] = useState(0);
    const [selectedCategory, setSelectedCategory] = useState("");
    
    // UI Panel States
    const [showFilters, setShowFilters] = useState(false);
    const [categories, setCategories] = useState([]);
    
    // Data & Pagination States
    const [workers, setWorkers] = useState([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalWorkers, setTotalWorkers] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState(null);

    // Search History States
    const [recentSearches, setRecentSearches] = useState([]);

    // Fetch categories on mount
    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const response = await api.get("/api/categories");
                if (response.data.success) {
                    const activeCats = response.data.data.filter((c) => c.isActive);
                    setCategories(activeCats);
                }
            } catch (err) {
                console.error("Error fetching categories in search:", err);
            }
        };
        fetchCategories();
    }, []);

    const fetchSearchHistory = async () => {
        try {
            const response = await api.get("/api/extensions/search-history");
            if (response.data.success) {
                setRecentSearches(response.data.data || []);
            }
        } catch (err) {
            console.error("Error fetching search history:", err);
        }
    };

    const saveSearchToHistory = async (queryText) => {
        if (!queryText.trim()) return;
        try {
            await api.post("/api/extensions/search-history", { searchText: queryText.trim() });
            fetchSearchHistory();
        } catch (err) {
            console.error("Error saving search query:", err);
        }
    };

    const handleRecentSearchClick = (term) => {
        setSearchQuery(term);
        
        // Execute search query directly
        const queryParams = {
            page: 1,
            limit: 10,
            search: term
        };
        if (selectedCategory) queryParams.category = selectedCategory;
        if (city.trim()) queryParams.city = city.trim();
        if (minRating > 0) queryParams.rating = minRating;
        if (minExperience > 0) queryParams.experience = minExperience;

        if (location) {
            queryParams.lat = location.latitude;
            queryParams.lng = location.longitude;
        }

        setIsLoading(true);
        api.get("/api/workers", { params: queryParams })
            .then((res) => {
                if (res.data.success) {
                    setWorkers(res.data.data || []);
                    setPage(1);
                    setTotalPages(res.data.pagination?.totalPages || 1);
                    setTotalWorkers(res.data.pagination?.totalWorkers || 0);
                }
            })
            .catch((err) => console.error("Error searching via recent term:", err))
            .finally(() => setIsLoading(false));

        saveSearchToHistory(term);
    };

    const handleClearHistory = async () => {
        try {
            await api.delete("/api/extensions/search-history");
            setRecentSearches([]);
        } catch (err) {
            console.error("Error clearing search history:", err);
        }
    };

    // Main fetch worker profiles function
    const fetchWorkers = async (pageNum = 1, append = false, resetFilters = false) => {
        if (pageNum === 1 && !append) {
            setIsLoading(true);
        } else {
            setIsLoadingMore(true);
        }
        setError(null);

        try {
            const queryParams = {
                page: pageNum,
                limit: 10,
            };

            // Apply filters unless we are resetting them
            if (!resetFilters) {
                if (searchQuery.trim()) queryParams.search = searchQuery.trim();
                if (selectedCategory) queryParams.category = selectedCategory;
                if (city.trim()) queryParams.city = city.trim();
                if (minRating > 0) queryParams.rating = minRating;
                if (minExperience > 0) queryParams.experience = minExperience;
            }

            if (location) {
                queryParams.lat = location.latitude;
                queryParams.lng = location.longitude;
            }

            const response = await api.get("/api/workers", { params: queryParams });
            
            if (response.data.success) {
                const fetchedData = response.data.data || [];
                const pag = response.data.pagination || { page: 1, totalPages: 1, totalWorkers: 0 };

                if (pageNum === 1) {
                    setWorkers(fetchedData);
                } else {
                    setWorkers((prev) => [...prev, ...fetchedData]);
                }

                setPage(pag.page);
                setTotalPages(pag.totalPages);
                setTotalWorkers(pag.totalWorkers);
            } else {
                setError("Failed to fetch search results");
            }
        } catch (err) {
            console.error("Error searching workers:", err);
            setError("Failed to connect to search service");
        } finally {
            setIsLoading(false);
            setIsLoadingMore(false);
            setIsRefreshing(false);
        }
    };

    // Initial load on mount or when route param changes
    useEffect(() => {
        fetchWorkers(1);
        if (user) {
            fetchSearchHistory();
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Trigger Search
    const handleSearch = () => {
        fetchWorkers(1);
        if (user && searchQuery.trim()) {
            saveSearchToHistory(searchQuery);
        }
    };

    // Reset all filters
    const handleResetFilters = () => {
        setCity("");
        setMinRating(0);
        setMinExperience(0);
        setSelectedCategory("");
        setSearchQuery("");
        setShowFilters(false);
        fetchWorkers(1, false, true);
    };

    // Apply filters explicitly
    const handleApplyFilters = () => {
        setShowFilters(false);
        fetchWorkers(1);
    };

    // Load next page
    const handleLoadMore = () => {
        if (!isLoadingMore && page < totalPages) {
            fetchWorkers(page + 1, true);
        }
    };

    // Refresh control
    const handleRefresh = () => {
        setIsRefreshing(true);
        fetchWorkers(1);
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

    const isAnyFilterActive = () => {
        return city !== "" || minRating > 0 || minExperience > 0 || selectedCategory !== "";
    };

    // Render each worker item card
    const renderWorkerItem = ({ item }) => {
        const userDetails = item.userId || {};
        const fullName = userDetails.fullName || "Professional";
        const profileImage = userDetails.profileImage || "";
        const availability = getAvailabilityBadge(item.availabilityStatus);
        const cityLoc = item.serviceAreas?.[0]?.city || "Local Area";

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

                    {/* Stats & Location */}
                    <View className="flex-row items-center justify-between mt-3">
                        <View className="flex-row items-center space-x-3">
                            <View className="flex-row items-center">
                                <Ionicons name="star" size={14} color="#f59e0b" />
                                <Text className="text-white text-xs font-bold ml-1">
                                    {item.averageRating > 0 ? item.averageRating.toFixed(1) : "New"}
                                </Text>
                                <Text className="text-slate-400 text-[10px] font-semibold ml-0.5">
                                    ({item.totalReviews})
                                </Text>
                            </View>

                            <Text className="text-slate-700 text-xs">|</Text>

                            <Text className="text-slate-300 text-xs font-semibold">
                                {item.experienceYears} Years Exp
                            </Text>
                        </View>

                        <View className="flex-row items-center">
                            <Ionicons name="location-outline" size={12} color="#6366f1" />
                            <Text className="text-slate-400 text-xs font-semibold ml-1">
                                {item.distance !== undefined && item.distance !== 999999
                                    ? `${item.distance.toFixed(1)} km away`
                                    : cityLoc}
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

            {/* Sticky Header: Back Button & Search Input Bar */}
            <View className="px-5 pt-3 pb-2 border-b border-slate-900 bg-slate-950">
                <View className="flex-row items-center">
                    <TouchableOpacity
                        onPress={() => router.canGoBack() ? router.back() : router.replace("/(tabs)/Home")}
                        className="w-10 h-10 bg-slate-900 border border-slate-800 rounded-full items-center justify-center mr-3"
                    >
                        <Ionicons name="arrow-back" size={20} color="white" />
                    </TouchableOpacity>
                    
                    {/* Search Input Box */}
                    <View className="flex-1 flex-row items-center bg-slate-900 border border-slate-800 rounded-xl px-3 py-2">
                        <Ionicons name="search" size={18} color="#64748b" className="mr-2" />
                        <TextInput
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            onSubmitEditing={handleSearch}
                            placeholder="Search by name, skill, profession..."
                            placeholderTextColor="#64748b"
                            className="flex-1 text-white text-sm py-1"
                            returnKeyType="search"
                        />
                        {searchQuery.length > 0 && (
                            <TouchableOpacity onPress={() => setSearchQuery("")} className="p-1">
                                <Ionicons name="close-circle" size={16} color="#64748b" />
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Filter Drawer Toggle */}
                    <TouchableOpacity
                        onPress={() => setShowFilters(!showFilters)}
                        className={`w-10 h-10 border rounded-xl items-center justify-center ml-3 relative ${
                            showFilters || isAnyFilterActive()
                                ? "bg-indigo-600/20 border-indigo-500"
                                : "bg-slate-900 border-slate-800"
                        }`}
                    >
                        <Ionicons
                            name="options-outline"
                            size={20}
                            color={showFilters || isAnyFilterActive() ? "#818cf8" : "white"}
                        />
                        {isAnyFilterActive() && (
                            <View className="absolute top-1 right-1 w-2.5 h-2.5 bg-indigo-500 rounded-full border border-slate-950" />
                        )}
                    </TouchableOpacity>
                </View>

                {/* Recent Searches Row */}
                {user && recentSearches.length > 0 && (
                    <View className="flex-row items-center mt-3 mb-1">
                        <Text className="text-slate-400 text-xs font-bold mr-2">Recent:</Text>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={{ gap: 6 }}
                            className="flex-row"
                        >
                            {recentSearches.map((item) => (
                                <TouchableOpacity
                                    key={item._id}
                                    onPress={() => handleRecentSearchClick(item.searchText)}
                                    className="bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-full active:opacity-85"
                                >
                                    <Text className="text-slate-300 text-xs font-semibold">
                                        {item.searchText}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                            <TouchableOpacity onPress={handleClearHistory} className="px-2 py-1 justify-center">
                                <Text className="text-slate-500 text-xs font-bold">Clear</Text>
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                )}

                {/* Inline active filter badges display */}
                {isAnyFilterActive() && (
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        className="mt-3 py-1 flex-row"
                        contentContainerStyle={{ gap: 8 }}
                    >
                        {selectedCategory && (
                            <View className="flex-row items-center bg-indigo-500/10 border border-indigo-500/30 px-3 py-1 rounded-full">
                                <Text className="text-indigo-400 text-xs font-bold mr-1">
                                    Cat: {categories.find(c => c._id === selectedCategory)?.name || "Selected"}
                                </Text>
                                <TouchableOpacity onPress={() => { setSelectedCategory(""); fetchWorkers(1); }}>
                                    <Ionicons name="close-circle" size={14} color="#818cf8" />
                                </TouchableOpacity>
                            </View>
                        )}
                        {city !== "" && (
                            <View className="flex-row items-center bg-indigo-500/10 border border-indigo-500/30 px-3 py-1 rounded-full">
                                <Text className="text-indigo-400 text-xs font-bold mr-1">
                                    City: {city}
                                </Text>
                                <TouchableOpacity onPress={() => { setCity(""); fetchWorkers(1); }}>
                                    <Ionicons name="close-circle" size={14} color="#818cf8" />
                                </TouchableOpacity>
                            </View>
                        )}
                        {minRating > 0 && (
                            <View className="flex-row items-center bg-indigo-500/10 border border-indigo-500/30 px-3 py-1 rounded-full">
                                <Text className="text-indigo-400 text-xs font-bold mr-1 flex-row items-center">
                                    Rating: {minRating}★+
                                </Text>
                                <TouchableOpacity onPress={() => { setMinRating(0); fetchWorkers(1); }}>
                                    <Ionicons name="close-circle" size={14} color="#818cf8" />
                                </TouchableOpacity>
                            </View>
                        )}
                        {minExperience > 0 && (
                            <View className="flex-row items-center bg-indigo-500/10 border border-indigo-500/30 px-3 py-1 rounded-full">
                                <Text className="text-indigo-400 text-xs font-bold mr-1">
                                    Exp: {minExperience}+ Yrs
                                </Text>
                                <TouchableOpacity onPress={() => { setMinExperience(0); fetchWorkers(1); }}>
                                    <Ionicons name="close-circle" size={14} color="#818cf8" />
                                </TouchableOpacity>
                            </View>
                        )}
                        <TouchableOpacity
                            onPress={handleResetFilters}
                            className="bg-slate-900 border border-slate-800 px-3 py-1 rounded-full justify-center"
                        >
                            <Text className="text-slate-400 text-xs font-bold">Clear All</Text>
                        </TouchableOpacity>
                    </ScrollView>
                )}
            </View>

            {/* Filter Expandable Panel */}
            {showFilters && (
                <View className="bg-slate-900 border-b border-slate-800 p-5">
                    <Text className="text-white font-extrabold text-base mb-3">Filters</Text>
                    <ScrollView showsVerticalScrollIndicator={false} className="max-h-[320px]">
                        
                        {/* Service Category */}
                        <Text className="text-slate-400 text-xs font-bold mb-2 uppercase tracking-wide">Category</Text>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            className="mb-4"
                            contentContainerStyle={{ gap: 8 }}
                        >
                            <TouchableOpacity
                                onPress={() => setSelectedCategory("")}
                                className={`px-4 py-2 rounded-xl border ${
                                    selectedCategory === ""
                                        ? "bg-indigo-600 border-indigo-500"
                                        : "bg-slate-950 border-slate-800"
                                }`}
                            >
                                <Text className={`text-xs font-bold ${selectedCategory === "" ? "text-white" : "text-slate-400"}`}>
                                    All
                                </Text>
                            </TouchableOpacity>
                            {categories.map((cat) => (
                                <TouchableOpacity
                                    key={cat._id}
                                    onPress={() => setSelectedCategory(cat._id)}
                                    className={`px-4 py-2 rounded-xl border ${
                                        selectedCategory === cat._id
                                            ? "bg-indigo-600 border-indigo-500"
                                            : "bg-slate-950 border-slate-800"
                                    }`}
                                >
                                    <Text className={`text-xs font-bold ${selectedCategory === cat._id ? "text-white" : "text-slate-400"}`}>
                                        {cat.name}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        {/* City Filter */}
                        <Text className="text-slate-400 text-xs font-bold mb-2 uppercase tracking-wide">City</Text>
                        <View className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 mb-4">
                            <TextInput
                                value={city}
                                onChangeText={setCity}
                                placeholder="Enter city name (e.g. New York)"
                                placeholderTextColor="#64748b"
                                className="text-white text-sm"
                            />
                        </View>

                        {/* Minimum Rating stars */}
                        <Text className="text-slate-400 text-xs font-bold mb-2 uppercase tracking-wide">Minimum Rating</Text>
                        <View className="flex-row gap-x-2 mb-4">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <TouchableOpacity
                                    key={star}
                                    onPress={() => setMinRating(star)}
                                    className={`flex-row items-center px-3 py-2 rounded-xl border ${
                                        minRating === star
                                            ? "bg-indigo-600 border-indigo-500"
                                            : "bg-slate-950 border-slate-800"
                                    }`}
                                >
                                    <Text className={`text-xs font-extrabold mr-1 ${minRating === star ? "text-white" : "text-slate-400"}`}>
                                        {star}
                                    </Text>
                                    <Ionicons name="star" size={12} color={minRating === star ? "white" : "#64748b"} />
                                </TouchableOpacity>
                            ))}
                            {minRating > 0 && (
                                <TouchableOpacity
                                    onPress={() => setMinRating(0)}
                                    className="px-3 py-2 rounded-xl border border-slate-800 bg-slate-950 justify-center"
                                >
                                    <Text className="text-slate-400 text-xs">Clear</Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        {/* Experience Years */}
                        <Text className="text-slate-400 text-xs font-bold mb-2 uppercase tracking-wide">Minimum Experience</Text>
                        <View className="flex-row gap-x-2 mb-2">
                            {[0, 1, 3, 5, 8].map((exp) => (
                                <TouchableOpacity
                                    key={exp}
                                    onPress={() => setMinExperience(exp)}
                                    className={`px-3 py-2 rounded-xl border ${
                                        minExperience === exp
                                            ? "bg-indigo-600 border-indigo-500"
                                            : "bg-slate-950 border-slate-800"
                                    }`}
                                >
                                    <Text className={`text-xs font-bold ${minExperience === exp ? "text-white" : "text-slate-400"}`}>
                                        {exp === 0 ? "Any" : `${exp}+ Yrs`}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </ScrollView>

                    {/* Filter actions */}
                    <View className="flex-row gap-x-4 border-t border-slate-800/80 pt-4 mt-2">
                        <TouchableOpacity
                            onPress={handleResetFilters}
                            className="flex-1 bg-slate-950 border border-slate-800 py-3 rounded-xl items-center"
                        >
                            <Text className="text-slate-400 font-bold">Reset</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={handleApplyFilters}
                            className="flex-1 bg-indigo-600 py-3 rounded-xl items-center"
                        >
                            <Text className="text-white font-bold">Apply Filters</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {/* Workers Result List */}
            {isLoading ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color="#6366f1" />
                </View>
            ) : error ? (
                <View className="flex-1 items-center justify-center px-6">
                    <Ionicons name="alert-circle-outline" size={48} color="#f43f5e" />
                    <Text className="text-white text-base font-bold mt-4 text-center">{error}</Text>
                    <TouchableOpacity
                        onPress={() => fetchWorkers(1)}
                        className="mt-6 bg-indigo-600 px-6 py-3 rounded-xl"
                    >
                        <Text className="text-white font-bold">Retry</Text>
                    </TouchableOpacity>
                </View>
            ) : workers.length === 0 ? (
                <View className="flex-1 items-center justify-center px-6">
                    <View className="w-20 h-20 bg-slate-900 border border-slate-800 rounded-full items-center justify-center mb-4">
                        <Ionicons name="search-outline" size={32} color="#64748b" />
                    </View>
                    <Text className="text-white text-lg font-bold text-center">
                        No professionals found
                    </Text>
                    <Text className="text-slate-400 text-sm mt-1 text-center max-w-xs">
                        Try adjusting your search queries or resetting active filters to discover experts.
                    </Text>
                    <TouchableOpacity
                        onPress={handleResetFilters}
                        className="mt-6 bg-slate-900 border border-slate-800 px-6 py-3 rounded-xl"
                    >
                        <Text className="text-slate-200 font-semibold">Clear Search & Filters</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <View className="flex-1">
                    <View className="px-5 py-3 flex-row justify-between items-center bg-slate-950">
                        <Text className="text-slate-400 text-xs font-semibold">
                            Showing {workers.length} of {totalWorkers} professionals
                        </Text>
                    </View>
                    
                    <FlatList
                        data={workers}
                        keyExtractor={(item) => item._id}
                        renderItem={renderWorkerItem}
                        contentContainerStyle={{ paddingHorizontal: 20, pb: 40 }}
                        showsVerticalScrollIndicator={false}
                        onRefresh={handleRefresh}
                        refreshing={isRefreshing}
                        onEndReached={handleLoadMore}
                        onEndReachedThreshold={0.3}
                        ListFooterComponent={() => {
                            if (!isLoadingMore) return null;
                            return (
                                <View className="py-4 items-center justify-center">
                                    <ActivityIndicator size="small" color="#6366f1" />
                                </View>
                            );
                        }}
                    />
                </View>
            )}
        </SafeAreaView>
    );
}
