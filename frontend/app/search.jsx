import React, { useState, useEffect, useRef } from "react";
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
    const [isLoading, setIsLoading] = useState(params.query ? true : false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState(null);

    // Search History States
    const [recentSearches, setRecentSearches] = useState([]);
    const [isFocused, setIsFocused] = useState(false);
    const searchInputRef = useRef(null);

    // Popular Searches Predefined List
    const popularSearches = [
        { name: "Electrician", icon: "flash-outline", color: "#fbbf24" },
        { name: "Plumber", icon: "water-outline", color: "#38bdf8" },
        { name: "Home Cleaning", icon: "sparkles-outline", color: "#c084fc" },
        { name: "Painter", icon: "brush-outline", color: "#f87171" },
        { name: "Carpenter", icon: "hammer-outline", color: "#fb923c" },
        { name: "AC Repair", icon: "snow-outline", color: "#60a5fa" },
        { name: "RO Service", icon: "water-outline", color: "#2dd4bf" },
        { name: "Pest Control", icon: "bug-outline", color: "#34d399" }
    ];

    // Helper to get category/query specific icon
    const getQueryIconName = (text) => {
        const lower = text.toLowerCase();
        if (lower.includes("elect")) return "flash-outline";
        if (lower.includes("plumb")) return "water-outline";
        if (lower.includes("paint")) return "brush-outline";
        if (lower.includes("clean")) return "sparkles-outline";
        if (lower.includes("carpenter")) return "hammer-outline";
        if (lower.includes("ac") || lower.includes("air")) return "snow-outline";
        if (lower.includes("ro") || lower.includes("water")) return "water-outline";
        if (lower.includes("pest") || lower.includes("bug")) return "bug-outline";
        return "search-outline";
    };

    // Helper to get color for icons
    const getQueryIconColor = (text) => {
        const lower = text.toLowerCase();
        if (lower.includes("elect")) return "#fbbf24";
        if (lower.includes("plumb")) return "#38bdf8";
        if (lower.includes("paint")) return "#f87171";
        if (lower.includes("clean")) return "#c084fc";
        if (lower.includes("carpenter")) return "#fb923c";
        if (lower.includes("ac") || lower.includes("air")) return "#60a5fa";
        if (lower.includes("ro") || lower.includes("water")) return "#2dd4bf";
        if (lower.includes("pest") || lower.includes("bug")) return "#34d399";
        return "#6366f1";
    };

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
        setIsFocused(false);
        searchInputRef.current?.blur();
        saveSearchToHistory(term);
        router.push(`/category-workers?searchQuery=${encodeURIComponent(term)}&categoryName=${encodeURIComponent(term)}`);
    };

    const handleClearHistory = async () => {
        try {
            await api.delete("/api/extensions/search-history");
            setRecentSearches([]);
        } catch (err) {
            console.error("Error clearing search history:", err);
        }
    };

    const handleDeleteHistoryItem = async (historyId) => {
        try {
            await api.delete(`/api/extensions/search-history/${historyId}`);
            setRecentSearches((prev) => prev.filter((item) => item._id !== historyId));
        } catch (err) {
            console.error("Error deleting specific search history item:", err);
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
        if (params.query) {
            const timer = setTimeout(() => {
                handleRecentSearchClick(params.query);
            }, 50);
            return () => clearTimeout(timer);
        } else {
            setIsLoading(false);
        }
        if (user) {
            fetchSearchHistory();
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Trigger Search
    const handleSearch = () => {
        if (searchQuery.trim()) {
            saveSearchToHistory(searchQuery);
            router.push(`/category-workers?searchQuery=${encodeURIComponent(searchQuery.trim())}&categoryName=${encodeURIComponent(searchQuery.trim())}`);
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

    // Filter services and skills for Screenshot 3 suggestions
    const getServiceSuggestions = () => {
        if (!searchQuery.trim()) return [];
        const matchedCats = categories.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));
        const matchedSkills = [];
        workers.forEach(w => {
            if (w.skills) {
                w.skills.forEach(s => {
                    if (s.toLowerCase().includes(searchQuery.toLowerCase()) && !matchedSkills.includes(s)) {
                        matchedSkills.push(s);
                    }
                });
            }
        });
        return [
            ...matchedCats.map(c => ({ name: c.name, type: "category", id: c._id })),
            ...matchedSkills.map(s => ({ name: s, type: "skill" }))
        ].slice(0, 5);
    };

    const matchedServices = getServiceSuggestions();
    const showSuggestions = isFocused && searchQuery.trim() !== "";

    return (
        <SafeAreaView className="flex-1 bg-slate-950">
            <StatusBar barStyle="light-content" />

            {/* Sticky Header: Back Button & Search Input Bar */}
            <View className="px-5 pt-3 pb-2 border-b border-slate-900 bg-slate-950">
                <View className="flex-row items-center">
                    <TouchableOpacity
                        onPress={() => {
                            if (isFocused) {
                                setIsFocused(false);
                                searchInputRef.current?.blur();
                            } else {
                                router.canGoBack() ? router.back() : router.replace("/(tabs)/Home");
                            }
                        }}
                        className="w-10 h-10 bg-slate-900 border border-slate-800 rounded-full items-center justify-center mr-3"
                    >
                        <Ionicons name="arrow-back" size={20} color="white" />
                    </TouchableOpacity>

                    {/* Search Input Box with Mic */}
                    <View className="flex-1 flex-row items-center bg-slate-900 border border-slate-800 rounded-xl px-3 py-2">
                        <Ionicons name="search" size={18} color="#64748b" className="mr-2" />
                        <TextInput
                            ref={searchInputRef}
                            value={searchQuery}
                            autoFocus={true}
                            onChangeText={(text) => {
                                setSearchQuery(text);
                                if (text.trim()) {
                                    // Trigger instant search for suggestions
                                    api.get("/api/workers", { params: { search: text.trim() } })
                                        .then(res => {
                                            if (res.data.success) {
                                                setWorkers(res.data.data || []);
                                            }
                                        }).catch(err => console.error("Error fetching suggestions:", err));
                                }
                            }}
                            onFocus={() => {
                                setIsFocused(true);
                                if (user) {
                                    fetchSearchHistory();
                                }
                            }}
                            onSubmitEditing={() => {
                                handleSearch();
                                setIsFocused(false);
                            }}
                            placeholder="Search services or professionals..."
                            placeholderTextColor="#64748b"
                            className="flex-1 text-white text-sm py-1"
                            returnKeyType="search"
                        />
                        {searchQuery.length > 0 && (
                            <TouchableOpacity onPress={() => setSearchQuery("")} className="p-1 mr-1">
                                <Ionicons name="close-circle" size={16} color="#64748b" />
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity className="p-1">
                            <Ionicons name="mic-outline" size={18} color="#64748b" />
                        </TouchableOpacity>
                    </View>

                    {/* Filter Drawer Toggle */}
                    <TouchableOpacity
                        onPress={() => setShowFilters(!showFilters)}
                        className={`w-10 h-10 border rounded-xl items-center justify-center ml-3 relative ${showFilters || isAnyFilterActive()
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
                                className={`px-4 py-2 rounded-xl border ${selectedCategory === ""
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
                                    className={`px-4 py-2 rounded-xl border ${selectedCategory === cat._id
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
                                    className={`flex-row items-center px-3 py-2 rounded-xl border ${minRating === star
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
                                    className={`px-3 py-2 rounded-xl border ${minExperience === exp
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

            {/* Content Display Switch */}
            {searchQuery.trim() === "" ? (
                /* SCREEN 1: Empty Search Dashboard layout */
                <ScrollView
                    className="flex-1 px-5"
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    {/* Recent Searches */}
                    {user && recentSearches.length > 0 && (
                        <View className="mt-5">
                            <View className="flex-row justify-between items-center mb-3">
                                <Text className="text-white font-extrabold text-base">Recent Searches</Text>
                                <TouchableOpacity onPress={handleClearHistory} className="py-1 px-2">
                                    <Text className="text-indigo-400 text-xs font-bold">Clear All</Text>
                                </TouchableOpacity>
                            </View>
                            <View className="flex-row flex-wrap gap-2">
                                {recentSearches.map((item) => (
                                    <View key={item._id} className="flex-row items-center bg-slate-900 border border-slate-800 px-3.5 py-2 rounded-full">
                                        <TouchableOpacity
                                            onPress={() => handleRecentSearchClick(item.searchText)}
                                            className="flex-row items-center"
                                        >
                                            <Ionicons name={getQueryIconName(item.searchText)} size={14} color={getQueryIconColor(item.searchText)} className="mr-1.5" />
                                            <Text className="text-slate-200 text-xs font-semibold">{item.searchText}</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            onPress={() => handleDeleteHistoryItem(item._id)}
                                            className="ml-2 pl-2 border-l border-slate-800"
                                        >
                                            <Ionicons name="close" size={14} color="#64748b" />
                                        </TouchableOpacity>
                                    </View>
                                ))}
                            </View>
                        </View>
                    )}

                    {/* Popular Searches */}
                    <View className="mt-6">
                        <Text className="text-white font-extrabold text-base mb-3.5">Popular Searches 🔥</Text>
                        <View className="flex-row flex-wrap justify-between gap-y-3">
                            {popularSearches.map((item, idx) => (
                                <TouchableOpacity
                                    key={idx}
                                    onPress={() => handleRecentSearchClick(item.name)}
                                    className="w-[48.5%] bg-slate-900 border border-slate-800 p-3.5 rounded-2xl flex-row items-center active:bg-slate-800"
                                >
                                    <View className="w-8 h-8 rounded-full bg-slate-950 border border-slate-850 items-center justify-center mr-2.5">
                                        <Ionicons name={item.icon} size={16} color={item.color} />
                                    </View>
                                    <Text className="text-slate-200 text-xs font-bold">{item.name}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* Browse Categories */}
                    <View className="mt-6 mb-8">
                        <View className="flex-row justify-between items-center mb-3">
                            <Text className="text-white font-extrabold text-base">Browse Categories</Text>
                            <TouchableOpacity onPress={() => setSelectedCategory("")}>
                                <Text className="text-indigo-400 text-xs font-bold">View All</Text>
                            </TouchableOpacity>
                        </View>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={{ gap: 14 }}
                            className="flex-row mt-1"
                        >
                            {categories.map((cat) => (
                                <TouchableOpacity
                                    key={cat._id}
                                    onPress={() => router.push(`/category-workers?categoryId=${cat._id}&categoryName=${cat.name}`)}
                                    className="items-center"
                                >
                                    <View className="w-14 h-14 rounded-full bg-slate-900 border border-slate-800 items-center justify-center mb-1.5">
                                        <Ionicons name={getQueryIconName(cat.name)} size={22} color={getQueryIconColor(cat.name)} />
                                    </View>
                                    <Text className="text-slate-300 text-[10px] font-semibold">{cat.name}</Text>
                                </TouchableOpacity>
                            ))}
                            <TouchableOpacity
                                onPress={handleResetFilters}
                                className="items-center"
                            >
                                <View className="w-14 h-14 rounded-full bg-slate-900 border border-slate-800 items-center justify-center mb-1.5">
                                    <Ionicons name="grid-outline" size={22} color="#94a3b8" />
                                </View>
                                <Text className="text-slate-400 text-[10px] font-semibold">More</Text>
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </ScrollView>
            ) : showSuggestions ? (
                /* SCREEN 3: Active Typing Search Suggestions layout */
                <ScrollView
                    className="flex-1 px-5"
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    {/* Services section */}
                    {matchedServices.length > 0 && (
                        <View className="mt-5">
                            <View className="flex-row justify-between items-center mb-3">
                                <Text className="text-white font-extrabold text-base">Services</Text>
                                <TouchableOpacity onPress={handleSearch} className="py-1 px-2">
                                    <Text className="text-indigo-400 text-xs font-bold">View all</Text>
                                </TouchableOpacity>
                            </View>
                            <View className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                                {matchedServices.map((item, idx) => (
                                    <TouchableOpacity
                                        key={idx}
                                        onPress={() => handleRecentSearchClick(item.name)}
                                        className="flex-row items-center justify-between px-4 py-3.5 border-b border-slate-800/60 last:border-0"
                                    >
                                        <View className="flex-row items-center">
                                            <Ionicons name={getQueryIconName(item.name)} size={16} color={getQueryIconColor(item.name)} className="mr-3" />
                                            <Text className="text-slate-200 text-sm font-semibold">{item.name}</Text>
                                        </View>
                                        <Ionicons name="chevron-forward" size={16} color="#64748b" />
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    )}

                    {/* Professionals section */}
                    {workers.length > 0 && (
                        <View className="mt-6 mb-8">
                            <View className="flex-row justify-between items-center mb-3">
                                <Text className="text-white font-extrabold text-base">Professionals</Text>
                                <TouchableOpacity onPress={handleSearch} className="py-1 px-2">
                                    <Text className="text-indigo-400 text-xs font-bold">View all</Text>
                                </TouchableOpacity>
                            </View>
                            <View className="gap-y-3">
                                {workers.slice(0, 3).map((item) => {
                                    const userDetails = item.userId || {};
                                    const fullName = userDetails.fullName || "Professional";
                                    const profileImage = userDetails.profileImage || "";
                                    const cityLoc = item.serviceAreas?.[0]?.city || "Local Area";
                                    const isAvailable = item.availabilityStatus === "available";

                                    return (
                                        <TouchableOpacity
                                            key={item._id}
                                            onPress={() => router.push(`/worker-profile?workerId=${item._id}`)}
                                            className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex-row items-center justify-between"
                                        >
                                            <View className="flex-row items-center flex-1 mr-3">
                                                {profileImage ? (
                                                    <Image
                                                        source={{ uri: profileImage }}
                                                        className="w-12 h-12 rounded-full bg-slate-800 mr-3"
                                                    />
                                                ) : (
                                                    <View className="w-12 h-12 rounded-full bg-indigo-600 items-center justify-center mr-3">
                                                        <Text className="text-white text-base font-bold">
                                                            {getInitials(fullName)}
                                                        </Text>
                                                    </View>
                                                )}
                                                <View className="flex-1">
                                                    <Text className="text-white font-bold text-sm" numberOfLines={1}>
                                                        {fullName}
                                                    </Text>
                                                    <Text className="text-slate-400 text-xs mt-0.5" numberOfLines={1}>
                                                        {item.profession || "Specialist"}
                                                    </Text>
                                                    <View className="flex-row items-center mt-1">
                                                        <Ionicons name="star" size={12} color="#f59e0b" />
                                                        <Text className="text-white text-[10px] font-extrabold ml-1">
                                                            {item.averageRating > 0 ? item.averageRating.toFixed(1) : "New"}
                                                        </Text>
                                                        <Text className="text-slate-700 text-xs mx-1.5">|</Text>
                                                        <Text className="text-slate-300 text-[10px] font-semibold">
                                                            {item.experienceYears} Years Exp
                                                        </Text>
                                                        <Text className="text-slate-700 text-xs mx-1.5">|</Text>
                                                        <Text className="text-slate-400 text-[10px]" numberOfLines={1}>
                                                            {cityLoc}
                                                        </Text>
                                                    </View>
                                                </View>
                                            </View>

                                            {/* Availability Badge */}
                                            <View className="flex-row items-center bg-slate-950 border border-slate-850 rounded-full px-2 py-1">
                                                <View className={`w-1.5 h-1.5 rounded-full mr-1 ${isAvailable ? "bg-emerald-500" : "bg-amber-500"
                                                    }`} />
                                                <Text className="text-slate-300 text-[9px] font-bold">
                                                    {isAvailable ? "Available" : "Busy"}
                                                </Text>
                                            </View>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </View>
                    )}
                </ScrollView>
            ) : (
                /* Fallback if suggestions are not showing but query is not empty */
                <ScrollView className="flex-1 px-5" keyboardShouldPersistTaps="handled">
                    <View className="mt-20 items-center justify-center">
                        <Ionicons name="search-outline" size={48} color="#64748b" />
                        <Text className="text-slate-400 text-sm font-bold mt-4">Press search or select a suggestion to search</Text>
                    </View>
                </ScrollView>
            )}
        </SafeAreaView>
    );
}
