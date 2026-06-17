import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    ScrollView,
    TextInput,
    TouchableOpacity,
    StatusBar,
    ActivityIndicator,
    Alert,
    Image
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useIsFocused } from "@react-navigation/native";
import { useColorScheme } from "nativewind";
import useAuthStore from "../../src/store/useAuthStore";
import useLocationStore from "../../src/store/useLocationStore";
import api from "../../src/services/api";
import storage from "../../src/utils/storage";
import Toast from "react-native-toast-message";

// Helper to resolve nice colors and styles for dynamic categories
const getCategoryStyles = (name) => {
    switch (name) {
        case "Electrician":
            return { color: "#f59e0b", bgColor: "bg-amber-500/10 border-amber-500/20" };
        case "Plumber":
        case "RO Repair":
            return { color: "#3b82f6", bgColor: "bg-blue-500/10 border-blue-500/20" };
        case "Carpenter":
            return { color: "#f97316", bgColor: "bg-orange-500/10 border-orange-500/20" };
        case "Painter":
            return { color: "#10b981", bgColor: "bg-emerald-500/10 border-emerald-500/20" };
        case "AC Repair":
        case "Refrigerator Repair":
            return { color: "#06b6d4", bgColor: "bg-cyan-500/10 border-cyan-500/20" };
        case "Cleaning":
            return { color: "#6366f1", bgColor: "bg-indigo-500/10 border-indigo-500/20" };
        case "TV Repair":
            return { color: "#8b5cf6", bgColor: "bg-violet-500/10 border-violet-500/20" };
        case "CCTV Installation":
            return { color: "#ec4899", bgColor: "bg-pink-500/10 border-pink-500/20" };
        default:
            return { color: "#8b5cf6", bgColor: "bg-indigo-500/10 border-indigo-500/20" };
    }
};

// Helper for saved location label icons
const getLabelIcon = (label) => {
    switch (label) {
        case "Home":
            return "home";
        case "Work":
            return "briefcase";
        default:
            return "location";
    }
};

export default function HomeDashboard() {
    const { user } = useAuthStore();
    const isFocused = useIsFocused();
    const displayName = user?.fullName || "User";
    const router = useRouter();

    const { colorScheme, setColorScheme } = useColorScheme();
    const isDark = colorScheme === "dark";
    const isWorker = user?.role === "worker" || user?.role === "admin";

    const toggleTheme = async () => {
        const nextTheme = isDark ? "light" : "dark";
        setColorScheme(nextTheme);
        await storage.setItem("theme", nextTheme);
        if (user && user._id) {
            await storage.setItem(`theme_user_${user._id}`, nextTheme);
        }
    };

    const { location, setLocation, getCurrentLocation, searchManualLocation, loadSavedLocation } = useLocationStore();

    const [categories, setCategories] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // Saved locations states
    const [savedLocations, setSavedLocations] = useState([]);
    const [isDeletingLocation, setIsDeletingLocation] = useState(false);

    // Location picker popup states
    const [showLocationModal, setShowLocationModal] = useState(false);
    const [isFetchingGps, setIsFetchingGps] = useState(false);
    const [manualSearchQuery, setManualSearchQuery] = useState("");
    const [manualSuggestions, setManualSuggestions] = useState([]);
    const [isManualSearching, setIsManualSearching] = useState(false);

    // Temp selection states for saving address
    const [tempResolvedLocation, setTempResolvedLocation] = useState(null); // { latitude, longitude, address }
    const [selectedLabel, setSelectedLabel] = useState("Home"); // "Home" | "Work" | "Other"
    const [isSavingAddress, setIsSavingAddress] = useState(false);

    // Worker Lists states
    const [nearbyWorkers, setNearbyWorkers] = useState([]);
    const [topRatedWorkers, setTopRatedWorkers] = useState([]);
    const [isWorkersLoading, setIsWorkersLoading] = useState(false);

    // Favorites states
    const [favorites, setFavorites] = useState({});

    // Worker Dashboard States
    const [workerProfile, setWorkerProfile] = useState(null);
    const [workerStats, setWorkerStats] = useState(null);
    const [isStatsLoading, setIsStatsLoading] = useState(false);
    const [isTogglingAvailability, setIsTogglingAvailability] = useState(false);
    const [showAllActivitiesModal, setShowAllActivitiesModal] = useState(false);

    // Relative Time Helper
    const getRelativeTime = (dateString) => {
        if (!dateString) return "";
        const now = new Date();
        const created = new Date(dateString);
        const diffMs = now - created;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return "Just now";
        if (diffMins < 60) return `${diffMins} min ago`;
        if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
        return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
    };

    const fetchWorkerProfile = async () => {
        try {
            const res = await api.get("/api/workers/me");
            if (res.data.success) {
                setWorkerProfile(res.data.data);
                // Sync current location state
                if (res.data.data.latitude && res.data.data.longitude) {
                    setLocation({
                        address: res.data.data.address || "Service Location",
                        latitude: res.data.data.latitude,
                        longitude: res.data.data.longitude
                    });
                }
            }
        } catch (err) {
            console.error("Error fetching worker profile in dashboard:", err);
        }
    };

    const fetchWorkerStats = async () => {
        setIsStatsLoading(true);
        try {
            const res = await api.get("/api/extensions/contacts/stats");
            if (res.data.success) {
                setWorkerStats(res.data.data);
            }
        } catch (err) {
            console.error("Error fetching worker stats in dashboard:", err);
        } finally {
            setIsStatsLoading(false);
        }
    };

    const handleToggleAvailability = async () => {
        if (!workerProfile) return;
        setIsTogglingAvailability(true);
        const nextStatus = workerProfile.availabilityStatus === "offline" ? "available" : "offline";
        try {
            const res = await api.post("/api/workers", {
                profession: workerProfile.profession,
                availabilityStatus: nextStatus
            });
            if (res.data.success) {
                setWorkerProfile(res.data.data);
                Toast.show({
                    type: 'success',
                    text1: `You are ${nextStatus === "available" ? "Online" : "Offline"} now`,
                });
            }
        } catch (err) {
            console.error("Failed to toggle availability status:", err);
            Toast.show({
                type: 'error',
                text1: `Failed to toggle availability status`,
            });
        } finally {
            setIsTogglingAvailability(false);
        }
    };

    // Fetch favorites
    const fetchFavorites = async () => {
        if (!user) return;
        try {
            const response = await api.get("/api/favorites");
            if (response.data.success) {
                const favMap = {};
                response.data.data.forEach(item => {
                    const wId = typeof item.workerId === 'object' ? item.workerId._id : item.workerId;
                    if (wId) favMap[wId] = true;
                });
                setFavorites(favMap);
            }
        } catch (err) {
            console.error("Error fetching favorites in Home:", err);
        }
    };

    const toggleFavorite = async (workerId) => {
        if (!user) {
            Toast.show({
                type: "error",
                text1: "Login Required",
                text2: "Please log in to add favorites.",
            });
            return;
        }
        try {
            const response = await api.post("/api/favorites/toggle", { workerId });
            if (response.data.success) {
                setFavorites(prev => ({
                    ...prev,
                    [workerId]: !prev[workerId]
                }));
            }
        } catch (err) {
            console.error("Error toggling favorite in Home:", err);
        }
    };

    // Fetch saved locations
    const fetchSavedLocations = async () => {
        if (!user) return;
        try {
            const response = await api.get("/api/extensions/locations");
            if (response.data.success) {
                setSavedLocations(response.data.data || []);
            }
        } catch (err) {
            console.error("Error fetching saved locations:", err);
        }
    };

    // Delete saved location
    const handleDeleteLocation = async (locId) => {
        setIsDeletingLocation(true);
        try {
            const response = await api.delete(`/api/extensions/locations/${locId}`);
            if (response.data.success) {
                setSavedLocations(prev => prev.filter(l => l._id !== locId));
                Toast.show({
                    type: "success",
                    text1: "Saved address removed.",
                });
            }
        } catch (err) {
            console.error("Failed to delete saved location:", err);
        } finally {
            setIsDeletingLocation(false);
        }
    };

    // Initial Load
    useEffect(() => {
        const isWorker = user?.role === "worker" || user?.role === "admin";
        if (isWorker) {
            fetchWorkerProfile();
            fetchWorkerStats();
            return;
        }

        const initHomeData = async () => {
            setIsLoading(true);
            try {
                // Fetch categories
                const catRes = await api.get("/api/categories");
                if (catRes.data.success) {
                    const activeCats = catRes.data.data.filter((cat) => cat.isActive);
                    setCategories(activeCats);
                } else {
                    setError("Failed to load categories");
                }
            } catch (err) {
                console.error("Error fetching categories:", err);
                setError("Failed to fetch categories");
            } finally {
                setIsLoading(false);
            }
        };

        const checkLocationOnStartup = async () => {
            await loadSavedLocation();
            const activeLoc = useLocationStore.getState().location;
            if (!activeLoc) {
                setShowLocationModal(true);
            }
        };

        checkLocationOnStartup();
        initHomeData();
        if (user) {
            fetchSavedLocations();
            fetchFavorites();
        }
    }, [user]);

    // Auto-refresh when screen gets focus
    useEffect(() => {
        if (isFocused) {
            const isWorker = user?.role === "worker" || user?.role === "admin";
            if (isWorker) {
                fetchWorkerProfile();
                fetchWorkerStats();
            } else {
                if (user) {
                    fetchSavedLocations();
                    fetchFavorites();
                }
                if (location) {
                    fetchWorkersNearby();
                }
            }
        }
    }, [isFocused]);

    // Nominatim autocomplete search inside modal
    useEffect(() => {
        if (!manualSearchQuery.trim() || manualSearchQuery.length < 3) {
            setManualSuggestions([]);
            return;
        }

        const delayDebounce = setTimeout(async () => {
            setIsManualSearching(true);
            try {
                const results = await searchManualLocation(manualSearchQuery);
                setManualSuggestions(results);
            } catch (err) {
                console.error("Home suggestions search failed:", err);
            } finally {
                setIsManualSearching(false);
            }
        }, 500);

        return () => clearTimeout(delayDebounce);
    }, [manualSearchQuery]);

    // Fetch Nearby and Top Rated when location changes
    const fetchWorkersNearby = async () => {
        if (!location) return;
        setIsWorkersLoading(true);
        try {
            const [nearbyRes, topRes] = await Promise.all([
                api.get("/api/workers", {
                    params: { lat: location.latitude, lng: location.longitude, limit: 6 }
                }),
                api.get("/api/workers", {
                    params: { lat: location.latitude, lng: location.longitude, sortBy: "rating", limit: 6 }
                })
            ]);

            if (nearbyRes.data.success) {
                setNearbyWorkers(nearbyRes.data.data || []);
            }
            if (topRes.data.success) {
                setTopRatedWorkers(topRes.data.data || []);
            }
        } catch (err) {
            console.error("Failed to load nearby workers:", err);
        } finally {
            setIsWorkersLoading(false);
        }
    };

    useEffect(() => {
        if (location) {
            fetchWorkersNearby();
        }
    }, [location]);

    if (!user) {
        return null;
    }

    // Action when user saves address
    const handleSaveAddressProceed = async () => {
        if (!tempResolvedLocation) return;
        setIsSavingAddress(true);
        try {
            const isWorker = user?.role === "worker" || user?.role === "admin";
            if (isWorker && workerProfile) {
                const res = await api.post("/api/workers", {
                    profession: workerProfile.profession,
                    address: tempResolvedLocation.address,
                    latitude: tempResolvedLocation.latitude,
                    longitude: tempResolvedLocation.longitude
                });
                if (res.data.success) {
                    setWorkerProfile(res.data.data);
                }
            } else if (user) {
                await api.post("/api/extensions/locations", {
                    locationName: tempResolvedLocation.address,
                    latitude: tempResolvedLocation.latitude,
                    longitude: tempResolvedLocation.longitude,
                    label: selectedLabel
                });
                fetchSavedLocations();
            }
            await setLocation(tempResolvedLocation);
            setTempResolvedLocation(null);
            setShowLocationModal(false);
            Toast.show({
                type: "success",
                text1: isWorker ? "Service location updated!" : `Active address set to ${selectedLabel}!`,
            });
        } catch (err) {
            console.error("Error saving address details:", err);
            Toast.show({
                type: "error",
                text1: "Failed to save address details.",
            });
        } finally {
            setIsSavingAddress(false);
        }
    };

    // Action when user bypasses saving address
    const handleProceedWithoutSaving = async () => {
        if (!tempResolvedLocation) return;
        const isWorker = user?.role === "worker" || user?.role === "admin";
        if (isWorker && workerProfile) {
            setIsSavingAddress(true);
            try {
                const res = await api.post("/api/workers", {
                    profession: workerProfile.profession,
                    address: tempResolvedLocation.address,
                    latitude: tempResolvedLocation.latitude,
                    longitude: tempResolvedLocation.longitude
                });
                if (res.data.success) {
                    setWorkerProfile(res.data.data);
                }
            } catch (err) {
                console.error("Failed to update profile location:", err);
            } finally {
                setIsSavingAddress(false);
            }
        }
        await setLocation(tempResolvedLocation);
        setTempResolvedLocation(null);
        setShowLocationModal(false);
    };

    const renderHorizontalWorkerItem = (item) => {
        const userDetails = item.userId || {};
        const fullName = userDetails.fullName || "Professional";
        const profileImage = userDetails.profileImage || "";
        const cityLoc = item.serviceAreas?.[0]?.city || "Local Area";
        const isAvailable = item.availabilityStatus === "available";
        const isFav = !!favorites[item._id];

        const initials = fullName
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);

        return (
            <TouchableOpacity
                key={item._id}
                activeOpacity={0.95}
                onPress={() => router.push(`/worker-profile?workerId=${item._id}`)}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 border-l-4 border-l-indigo-500 rounded-[20px] p-3 w-[240] h-[115] mr-4 flex-row items-center active:opacity-90 relative shadow-md shadow-slate-950/20"
            >
                {/* Floating Heart/Favorite Button */}
                <TouchableOpacity
                    onPress={() => toggleFavorite(item._id)}
                    className="absolute top-2.5 right-2.5 z-10 w-7 h-7 items-center justify-center rounded-full bg-slate-100/80 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800/50 active:scale-95"
                >
                    <Ionicons
                        name={isFav ? "heart" : "heart-outline"}
                        size={13}
                        color={isFav ? "#ef4444" : (isDark ? "#94a3b8" : "#64748b")}
                    />
                </TouchableOpacity>

                {/* Left Side: Modern Rounded-Square Avatar */}
                <View className="relative">
                    {profileImage ? (
                        <Image
                            source={{ uri: profileImage }}
                            className="w-16 h-16 rounded-[16px] bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-800"
                        />
                    ) : (
                        <View className="w-16 h-16 rounded-[16px] bg-indigo-600 items-center justify-center border border-indigo-500/30">
                            <Text className="text-white text-base font-bold">
                                {initials}
                            </Text>
                        </View>
                    )}
                    {/* Status Dot */}
                    <View className={`absolute bottom-[-1] right-[-1] w-3.5 h-3.5 rounded-full border-2 border-white dark:border-slate-900 ${isAvailable ? "bg-emerald-500" : "bg-amber-500"}`} />
                </View>

                {/* Right Side: Professional Details */}
                <View className="flex-1 ml-3.5 justify-center pr-4">
                    <Text className="text-slate-900 dark:text-white font-extrabold text-sm" numberOfLines={1}>
                        {fullName}
                    </Text>

                    <Text className="text-slate-500 dark:text-slate-400 text-[10px] font-semibold mt-0.5" numberOfLines={1}>
                        {item.profession || "Specialist"}
                    </Text>

                    {/* Rating & Experience Row */}
                    <View className="flex-row items-center mt-1">
                        <Ionicons name="star" size={10} color="#f59e0b" />
                        <Text className="text-slate-800 dark:text-white text-[10px] font-bold ml-1">
                            {item.averageRating > 0 ? item.averageRating.toFixed(1) : "New"}
                        </Text>
                        <Text className="text-slate-400 dark:text-slate-600 text-xs mx-1 font-medium">•</Text>
                        <Text className="text-slate-600 dark:text-slate-300 text-[9.5px] font-medium">
                            {item.experienceYears} Yrs
                        </Text>
                    </View>

                    {/* Location/Distance badge */}
                    <View className="flex-row items-center mt-1.5">
                        <Ionicons name="location-outline" size={10} color="#6366f1" />
                        <Text className="text-indigo-600 dark:text-indigo-400 text-[9px] font-bold ml-1" numberOfLines={1}>
                            {item.distance !== undefined && item.distance !== 999999
                                ? `${item.distance.toFixed(1)} km away`
                                : cityLoc}
                        </Text>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950">
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

            {isWorker ? (
                // ----------------------------------------------------
                // WORKER DASHBOARD (HOME SCREEN)
                // ----------------------------------------------------
                <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false}>
                    {/* Header */}
                    <View className="flex-row justify-between items-center mt-6">
                        <View>
                            <Text className="text-xl font-black text-slate-900 dark:text-white">
                                Hello, {displayName} 👋
                            </Text>
                            <View className="flex-row items-center mt-1.5">
                                <View className={`w-2.5 h-2.5 rounded-full mr-2 ${workerProfile?.availabilityStatus === "available" ? "bg-emerald-500" : "bg-slate-400"
                                    }`} />
                                <Text className="text-xs font-bold text-slate-500 dark:text-slate-400 capitalize">
                                    {workerProfile?.availabilityStatus === "available" ? "Available" : "Offline"}
                                </Text>
                            </View>
                        </View>
                        <View className="flex-row items-center gap-2">
                            <TouchableOpacity
                                onPress={toggleTheme}
                                className="w-9 h-9 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full items-center justify-center mr-1 active:opacity-80"
                            >
                                <Ionicons
                                    name={isDark ? "sunny-outline" : "moon-outline"}
                                    size={17}
                                    color={isDark ? "white" : "#0f172a"}
                                />
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={handleToggleAvailability}
                                disabled={isTogglingAvailability}
                                className={`px-4 py-2.5 rounded-xl flex-row items-center border active:opacity-90 ${workerProfile?.availabilityStatus === "available"
                                    ? "bg-rose-500/10 border-rose-500/20"
                                    : "bg-emerald-500/10 border-emerald-500/20"
                                    }`}
                            >
                                {isTogglingAvailability ? (
                                    <ActivityIndicator size="small" color="#6366f1" />
                                ) : (
                                    <>
                                        <Ionicons
                                            name={workerProfile?.availabilityStatus === "available" ? "power-outline" : "wifi-outline"}
                                            size={16}
                                            color={workerProfile?.availabilityStatus === "available" ? "#f43f5e" : "#10b981"}
                                        />
                                        <Text className={`text-xs font-black ml-1.5 ${workerProfile?.availabilityStatus === "available" ? "text-rose-500" : "text-emerald-500"
                                            }`}>
                                            {workerProfile?.availabilityStatus === "available" ? "Go Offline" : "Go Online"}
                                        </Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>


                    {/* Theme Toggle & Current Service Location Card */}
                    <View className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-4 mt-6 shadow-sm flex-row items-center justify-between">
                        <View className="flex-1 mr-4">
                            <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Current Service Area</Text>
                            <Text className="text-slate-800 dark:text-slate-200 text-sm font-bold mt-1.5" numberOfLines={2}>
                                {workerProfile?.address || location?.address || "No service location set"}
                            </Text>
                        </View>
                        <View className="flex-row items-center space-x-2">
                            <TouchableOpacity
                                onPress={() => setShowLocationModal(true)}
                                className="bg-indigo-600 px-3.5 py-2 rounded-xl flex-row items-center active:opacity-90"
                            >
                                <Ionicons name="location-outline" size={15} color="white" />
                                <Text className="text-white text-sm font-black ml-1">Change</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Statistics */}
                    <View className="mt-6">
                        <Text className="text-slate-500 dark:text-slate-400 font-extrabold text-xs uppercase tracking-wider mb-3 pl-1">
                            Analytics Overview
                        </Text>
                        {isStatsLoading ? (
                            <ActivityIndicator size="small" color="#6366f1" className="py-6" />
                        ) : (
                            <View className="flex-row flex-wrap justify-between gap-y-4">
                                {/* WhatsApp Card */}
                                <View className="w-[48%] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-4 shadow-sm relative overflow-hidden">
                                    <View className="absolute right-[-10] top-[-10] opacity-5">
                                        <Ionicons name="logo-whatsapp" size={70} color="#10b981" />
                                    </View>
                                    <View className="flex-row items-center">
                                        <View className="w-8 h-8 rounded-lg bg-emerald-500/10 items-center justify-center border border-emerald-500/20">
                                            <Ionicons name="logo-whatsapp" size={16} color="#10b981" />
                                        </View>
                                        <Text className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-2">WhatsApp</Text>
                                    </View>
                                    <Text className="text-2xl font-black text-slate-900 dark:text-white mt-4">
                                        {workerStats?.whatsappClicks || 0}
                                    </Text>
                                    <Text className="text-[10px] font-bold text-emerald-500 dark:text-emerald-400 mt-1">
                                        +{workerStats?.whatsappClicksToday || 0} today
                                    </Text>
                                </View>

                                {/* Call Clicks Card */}
                                <View className="w-[48%] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-4 shadow-sm relative overflow-hidden">
                                    <View className="absolute right-[-10] top-[-10] opacity-5">
                                        <Ionicons name="call" size={70} color="#3b82f6" />
                                    </View>
                                    <View className="flex-row items-center">
                                        <View className="w-8 h-8 rounded-lg bg-blue-500/10 items-center justify-center border border-blue-500/20">
                                            <Ionicons name="call" size={15} color="#3b82f6" />
                                        </View>
                                        <Text className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-2">Call Clicks</Text>
                                    </View>
                                    <Text className="text-2xl font-black text-slate-900 dark:text-white mt-4">
                                        {workerStats?.callClicks || 0}
                                    </Text>
                                    <Text className="text-[10px] font-bold text-blue-500 dark:text-blue-400 mt-1">
                                        +{workerStats?.callClicksToday || 0} today
                                    </Text>
                                </View>

                                {/* Favourites Card */}
                                <View className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-4 shadow-sm relative overflow-hidden flex-row items-center justify-between">
                                    <View className="absolute right-[-10] top-[-10] opacity-5">
                                        <Ionicons name="heart" size={80} color="#ef4444" />
                                    </View>
                                    <View className="flex-row items-center flex-1">
                                        <View className="w-10 h-10 rounded-xl bg-rose-500/10 items-center justify-center border border-rose-500/20">
                                            <Ionicons name="heart" size={20} color="#ef4444" />
                                        </View>
                                        <View className="ml-3">
                                            <Text className="text-xs font-bold text-slate-500 dark:text-slate-400">Favourites</Text>
                                            <Text className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">
                                                {workerStats?.totalFavorites || 0}
                                            </Text>
                                        </View>
                                    </View>
                                    <View className="items-end">
                                        <Text className="text-xs font-bold text-slate-400">Today</Text>
                                        <Text className="text-sm font-black text-rose-500 mt-0.5">
                                            +{workerStats?.favoritesToday || 0} new
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        )}
                    </View>

                    {/* Customer Activity Feed */}
                    <View className="mt-6 mb-12">
                        <View className="flex-row justify-between items-center mb-3">
                            <Text className="text-slate-500 dark:text-slate-400 font-extrabold text-xs uppercase tracking-wider pl-1">
                                Recent Customer Activity
                            </Text>
                            {workerStats?.activities?.length > 5 && (
                                <TouchableOpacity onPress={() => setShowAllActivitiesModal(true)}>
                                    <Text className="text-indigo-600 dark:text-indigo-400 text-xs font-black">View All</Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        {isStatsLoading ? (
                            <ActivityIndicator size="small" color="#6366f1" className="py-6" />
                        ) : !workerStats?.activities || workerStats.activities.length === 0 ? (
                            <View className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 items-center justify-center">
                                <Ionicons name="notifications-off-outline" size={28} color="#64748b" />
                                <Text className="text-slate-500 dark:text-slate-400 text-sm font-semibold mt-2">No activity logged yet</Text>
                            </View>
                        ) : (
                            <View className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-2.5 shadow-sm gap-y-1">
                                {workerStats.activities.slice(0, 5).map((activity) => (
                                    <View key={activity._id} className="flex-row items-center p-3 rounded-xl">
                                        <View className={`w-9 h-9 rounded-full items-center justify-center ${activity.type === "whatsapp" ? "bg-emerald-500/10 border border-emerald-500/20" :
                                            activity.type === "call" ? "bg-blue-500/10 border border-blue-500/20" :
                                                activity.type === "favorite" ? "bg-rose-500/10 border border-rose-500/20" :
                                                    "bg-indigo-500/10 border border-indigo-500/20"
                                            }`}>
                                            <Ionicons
                                                name={
                                                    activity.type === "whatsapp" ? "logo-whatsapp" :
                                                        activity.type === "call" ? "call" :
                                                            activity.type === "favorite" ? "heart" :
                                                                "eye"
                                                }
                                                size={16}
                                                color={
                                                    activity.type === "whatsapp" ? "#10b981" :
                                                        activity.type === "call" ? "#3b82f6" :
                                                            activity.type === "favorite" ? "#ef4444" :
                                                                "#6366f1"
                                                }
                                            />
                                        </View>
                                        <View className="flex-1 ml-3.5 pr-2">
                                            <Text className="text-slate-900 dark:text-slate-200 text-xs font-bold leading-normal">
                                                {activity.text}
                                            </Text>
                                            <Text className="text-slate-400 dark:text-slate-500 text-[10px] font-semibold mt-0.5">
                                                {getRelativeTime(activity.createdAt)}
                                            </Text>
                                        </View>
                                    </View>
                                ))}
                            </View>
                        )}
                    </View>
                </ScrollView>
            ) : (
                // ----------------------------------------------------
                // CUSTOMER HOME VIEW
                // ----------------------------------------------------
                <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false}>
                    {/* Header & Location Selection */}
                    <View className="flex-row justify-between items-center mt-4">
                        <View className="flex-1 mr-4">
                            <TouchableOpacity
                                onPress={() => setShowLocationModal(true)}
                                className="flex-row items-center space-x-1 active:opacity-75"
                            >
                                <Ionicons name="location" size={16} color="#6366f1" />
                                <Text className="text-slate-500 dark:text-slate-400 text-xs font-semibold ml-1 flex-1" numberOfLines={1}>
                                    {location ? location.address : "Choose Location"}
                                </Text>
                                <Ionicons name="chevron-down" size={12} color={isDark ? "#64748b" : "#94a3b8"} />
                            </TouchableOpacity>
                            <Text className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
                                Hello, {displayName} 👋
                            </Text>
                        </View>
                        <TouchableOpacity
                            onPress={toggleTheme}
                            className="w-10 h-10 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full items-center justify-center"
                        >
                            <Ionicons
                                name={isDark ? "sunny-outline" : "moon-outline"}
                                size={20}
                                color={isDark ? "white" : "#0f172a"}
                            />
                        </TouchableOpacity>
                    </View>

                    {/* Search Bar (Navigates to search screen) */}
                    <TouchableOpacity
                        activeOpacity={0.9}
                        onPress={() => router.push("/search")}
                        className="flex-row items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-4 py-3.5 rounded-xl mt-6 active:opacity-95"
                    >
                        <Ionicons name="search" size={20} color="#64748b" />
                        <Text className="flex-1 ml-3 text-slate-500 text-base">
                            Search for service professionals...
                        </Text>
                        <Ionicons name="options" size={20} color="#6366f1" />
                    </TouchableOpacity>

                    {/* Promo Card Banner */}
                    <View className="bg-indigo-600 rounded-2xl p-5 mt-6 relative overflow-hidden shadow-lg shadow-indigo-500/20">
                        <View className="absolute right-[-10px] bottom-[-20px] opacity-15">
                            <Ionicons name="construct" size={150} color="white" />
                        </View>
                        <View className="z-10 max-w-[70%]">
                            <Text className="text-white text-xs font-extrabold bg-indigo-500/50 self-start px-2 py-0.5 rounded-full uppercase tracking-wider">
                                Special Offer
                            </Text>
                            <Text className="text-white text-xl font-black mt-2">
                                Get 20% off on your first booking!
                            </Text>
                            <Text className="text-indigo-200 text-xs mt-1">
                                Use code FIRST20 at checkout. Verified home experts at best pricing.
                            </Text>
                        </View>
                    </View>

                    {/* Categories Grid Header */}
                    <View className="flex-row justify-between items-center mt-8 mb-4">
                        <Text className="text-slate-900 dark:text-white font-extrabold text-lg">
                            Service Categories
                        </Text>
                        <TouchableOpacity onPress={() => router.push("/search")}>
                            <Text className="text-indigo-600 dark:text-indigo-400 font-bold text-sm">See All</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Categories Grid */}
                    {isLoading ? (
                        <View className="py-6 items-center justify-center">
                            <ActivityIndicator size="small" color="#6366f1" />
                        </View>
                    ) : error ? (
                        <View className="py-6 items-center justify-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
                            <Ionicons name="warning-outline" size={24} color="#f43f5e" />
                            <Text className="text-slate-500 dark:text-slate-400 text-sm mt-2 font-medium">{error}</Text>
                        </View>
                    ) : (
                        <View className="flex-row flex-wrap gap-4 pb-2">
                            {categories.slice(0, 8).map((cat) => {
                                const style = getCategoryStyles(cat.name);
                                return (
                                    <TouchableOpacity
                                        key={cat._id}
                                        style={{ width: "47%" }}
                                        onPress={() => router.push(`/category-workers?categoryId=${cat._id}&categoryName=${cat.name}`)}
                                        className={`p-4 rounded-xl border ${style.bgColor} items-center justify-center gap-y-2 active:opacity-90`}
                                    >
                                        <View className="w-12 h-12 rounded-full items-center justify-center bg-slate-200/50 dark:bg-slate-900/40">
                                            <Ionicons name={cat.icon || "construct-outline"} size={24} color={style.color} />
                                        </View>
                                        <Text className="text-slate-800 dark:text-white font-bold text-sm text-center">
                                            {cat.name}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    )}

                    {/* Nearby Workers Horizontal Scroll Section */}
                    {location && (
                        <View className="mt-8">
                            <View className="flex-row justify-between items-center mb-4">
                                <Text className="text-slate-900 dark:text-white font-extrabold text-lg">Nearby Professionals</Text>
                                <TouchableOpacity onPress={() => router.push("/search")}>
                                    <Text className="text-indigo-600 dark:text-indigo-400 font-bold text-sm">See All</Text>
                                </TouchableOpacity>
                            </View>
                            {isWorkersLoading ? (
                                <ActivityIndicator size="small" color="#6366f1" className="my-6" />
                            ) : nearbyWorkers.length === 0 ? (
                                <View className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 items-center justify-center my-2">
                                    <Ionicons name="people-outline" size={28} color="#64748b" />
                                    <Text className="text-slate-500 dark:text-slate-400 text-sm font-semibold mt-2">No professionals nearby yet</Text>
                                </View>
                            ) : (
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
                                    {nearbyWorkers.map(renderHorizontalWorkerItem)}
                                </ScrollView>
                            )}
                        </View>
                    )}

                    {/* Top Rated Nearby Workers Horizontal Scroll Section */}
                    {location && (
                        <View className="mt-8 mb-10">
                            <View className="flex-row justify-between items-center mb-4">
                                <Text className="text-slate-900 dark:text-white font-extrabold text-lg">Top Rated Nearby</Text>
                                <TouchableOpacity onPress={() => router.push("/search")}>
                                    <Text className="text-indigo-600 dark:text-indigo-400 font-bold text-sm">See All</Text>
                                </TouchableOpacity>
                            </View>
                            {isWorkersLoading ? (
                                <ActivityIndicator size="small" color="#6366f1" className="my-6" />
                            ) : topRatedWorkers.length === 0 ? (
                                <View className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 items-center justify-center my-2">
                                    <Ionicons name="star-outline" size={28} color="#64748b" />
                                    <Text className="text-slate-500 dark:text-slate-400 text-sm font-semibold mt-2">No top rated professionals nearby</Text>
                                </View>
                            ) : (
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
                                    {topRatedWorkers.map(renderHorizontalWorkerItem)}
                                </ScrollView>
                            )}
                        </View>
                    )}
                </ScrollView>
            )}

            {/* Choose Location Screen Overlay (Forces setting location if null) */}
            {showLocationModal && (
                <View className="absolute inset-0 bg-white/95 dark:bg-slate-950/95 justify-center items-center px-6 z-50">
                    <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

                    {/* Save Resolved Address overlay flow (Home, Work, Other tags) */}
                    {tempResolvedLocation ? (
                        <View className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full p-6 gap-y-4 shadow-2xl items-center relative overflow-hidden">
                            {/* Back/Close Button */}
                            <TouchableOpacity
                                onPress={() => setTempResolvedLocation(null)}
                                className="absolute top-4 right-4 p-1 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-full z-50 active:opacity-75"
                            >
                                <Ionicons name="arrow-back-outline" size={18} color={isDark ? "white" : "black"} />
                            </TouchableOpacity>
                            <View className="absolute top-[-50] right-[-50] w-32 h-32 bg-indigo-500/10 rounded-full blur-xl" />

                            <View className="w-14 h-14 bg-indigo-600/10 rounded-full items-center justify-center border border-indigo-500/20">
                                <Ionicons name="bookmark-outline" size={28} color="#6366f1" />
                            </View>

                            <Text className="text-slate-900 dark:text-white font-extrabold text-lg text-center">Save Address Details</Text>

                            <View className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl w-full">
                                <Text className="text-slate-500 dark:text-slate-400 text-[10px] uppercase font-bold tracking-wider">Address Resolved</Text>
                                <Text className="text-slate-800 dark:text-white text-xs mt-1 leading-relaxed" numberOfLines={3}>
                                    {tempResolvedLocation.address}
                                </Text>
                            </View>

                            {/* Address labels select tags */}
                            <View className="w-full gap-y-2">
                                <Text className="text-slate-500 dark:text-slate-400 text-xs font-semibold text-center">Save location as:</Text>
                                <View className="flex-row justify-center gap-x-2 mt-1">
                                    {["Home", "Work", "Other"].map((label) => {
                                        const isSelected = selectedLabel === label;
                                        return (
                                            <TouchableOpacity
                                                key={label}
                                                onPress={() => setSelectedLabel(label)}
                                                className={`px-4 py-2 rounded-xl border flex-row items-center space-x-1 ${isSelected
                                                    ? "bg-indigo-600 border-indigo-500"
                                                    : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800"
                                                    }`}
                                            >
                                                <Ionicons
                                                    name={getLabelIcon(label)}
                                                    size={12}
                                                    color={isSelected ? "white" : (isDark ? "#64748b" : "#94a3b8")}
                                                />
                                                <Text className={`text-xs ml-1 font-bold ${isSelected ? "text-white" : "text-slate-500 dark:text-slate-400"}`}>
                                                    {label}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </View>

                            <View className="w-full gap-y-3 mt-2">
                                <TouchableOpacity
                                    onPress={handleSaveAddressProceed}
                                    disabled={isSavingAddress}
                                    className="bg-indigo-600 py-3.5 rounded-xl justify-center items-center active:opacity-90 shadow-lg shadow-indigo-500/20"
                                >
                                    {isSavingAddress ? (
                                        <ActivityIndicator size="small" color="white" />
                                    ) : (
                                        <Text className="text-white font-bold text-sm">Save & Set Address</Text>
                                    )}
                                </TouchableOpacity>

                                <TouchableOpacity
                                    onPress={handleProceedWithoutSaving}
                                    disabled={isSavingAddress}
                                    className="bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 py-3 rounded-xl justify-center items-center active:opacity-90"
                                >
                                    <Text className="text-slate-700 dark:text-slate-300 font-semibold text-xs">Set Address without Saving</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    ) : (
                        <View className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full p-6 gap-y-4 shadow-2xl items-center relative overflow-hidden">
                            {/* Choose Location Picker Option Flow */}
                            {/* Close/Cross Button */}
                            <TouchableOpacity
                                onPress={() => setShowLocationModal(false)}
                                className="absolute top-4 right-4 p-1 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-full z-50 active:opacity-75"
                            >
                                <Ionicons name="close-outline" size={18} color={isDark ? "white" : "black"} />
                            </TouchableOpacity>
                            {/* Background glow */}
                            <View className="absolute top-[-50] right-[-50] w-32 h-32 bg-indigo-500/10 rounded-full blur-xl" />

                            <View className="w-14 h-14 bg-indigo-600/10 rounded-full items-center justify-center border border-indigo-500/20">
                                <Ionicons name="location" size={28} color="#6366f1" />
                            </View>
                            <Text className="text-slate-900 dark:text-white font-extrabold text-xl text-center">Choose Location</Text>

                            {/* Saved Locations List (Shopping website style choice) */}
                            {user && savedLocations.length > 0 && (
                                <View className="w-full gap-y-2 border-b border-slate-200 dark:border-slate-800/80 pb-4">
                                    <Text className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">Your Saved Addresses</Text>
                                    <ScrollView className="max-h-[160px]" showsVerticalScrollIndicator={false}>
                                        <View className="gap-y-2">
                                            {savedLocations.map((loc) => (
                                                <View
                                                    key={loc._id}
                                                    className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 rounded-xl flex-row justify-between items-center"
                                                >
                                                    <TouchableOpacity
                                                        onPress={async () => {
                                                            const chosenLoc = {
                                                                address: loc.locationName,
                                                                latitude: loc.latitude,
                                                                longitude: loc.longitude
                                                            };
                                                            const isWorker = user?.role === "worker" || user?.role === "admin";
                                                            if (isWorker && workerProfile) {
                                                                try {
                                                                    const res = await api.post("/api/workers", {
                                                                        profession: workerProfile.profession,
                                                                        address: chosenLoc.address,
                                                                        latitude: chosenLoc.latitude,
                                                                        longitude: chosenLoc.longitude
                                                                    });
                                                                    if (res.data.success) {
                                                                        setWorkerProfile(res.data.data);
                                                                    }
                                                                } catch (err) {
                                                                    console.error("Failed to update profile location:", err);
                                                                }
                                                            }
                                                            setLocation(chosenLoc);
                                                            setShowLocationModal(false);
                                                        }}
                                                        className="flex-row items-center flex-1 mr-2"
                                                    >
                                                        <View className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-900 items-center justify-center border border-slate-300 dark:border-slate-800 mr-3">
                                                            <Ionicons name={getLabelIcon(loc.label)} size={14} color="#6366f1" />
                                                        </View>
                                                        <View className="flex-1">
                                                            <Text className="text-slate-900 dark:text-white font-bold text-xs">{loc.label}</Text>
                                                            <Text className="text-slate-500 dark:text-slate-400 text-[10px] mt-0.5" numberOfLines={1}>
                                                                {loc.locationName}
                                                            </Text>
                                                        </View>
                                                    </TouchableOpacity>
                                                    <TouchableOpacity
                                                        onPress={() => handleDeleteLocation(loc._id)}
                                                        disabled={isDeletingLocation}
                                                        className="p-1 active:opacity-75"
                                                    >
                                                        <Ionicons name="trash-outline" size={14} color="#f43f5e" />
                                                    </TouchableOpacity>
                                                </View>
                                            ))}
                                        </View>
                                    </ScrollView>
                                </View>
                            )}

                            {/* GPS Option */}
                            <TouchableOpacity
                                onPress={async () => {
                                    setIsFetchingGps(true);
                                    const loc = await getCurrentLocation();
                                    setIsFetchingGps(false);
                                    if (loc) {
                                        setTempResolvedLocation(loc);
                                    } else {
                                        Toast.show({
                                            type: "error",
                                            text1: "Error",
                                            text2: "Could not fetch GPS coordinates. Please make sure location permissions are enabled.",
                                        });
                                    }
                                }}
                                disabled={isFetchingGps}
                                className="bg-indigo-600 w-full py-3.5 rounded-xl flex-row items-center justify-center active:opacity-90 disabled:opacity-75 shadow-lg shadow-indigo-500/20"
                            >
                                {isFetchingGps ? (
                                    <ActivityIndicator size="small" color="white" />
                                ) : (
                                    <>
                                        <Ionicons name="navigate" size={16} color="white" />
                                        <Text className="text-white font-bold ml-2 text-sm">Use Current Location (GPS)</Text>
                                    </>
                                )}
                            </TouchableOpacity>

                            {/* Divider */}
                            <View className="flex-row items-center w-full my-1">
                                <View className="flex-1 h-[1] bg-slate-200 dark:bg-slate-800" />
                                <Text className="text-slate-500 text-[10px] px-3 font-extrabold tracking-wider">OR</Text>
                                <View className="flex-1 h-[1] bg-slate-200 dark:bg-slate-800" />
                            </View>

                            {/* Manual Search Autocomplete input */}
                            <View className="w-full gap-y-2 relative">
                                <Text className="text-slate-500 dark:text-slate-400 text-xs font-semibold">Enter Location Manually</Text>
                                <View className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 flex-row items-center">
                                    <Ionicons name="search" size={16} color="#64748b" className="mr-2" />
                                    <TextInput
                                        value={manualSearchQuery}
                                        onChangeText={setManualSearchQuery}
                                        placeholder="Type address e.g. Model Town Ambala..."
                                        placeholderTextColor={isDark ? "#64748b" : "#94a3b8"}
                                        className="flex-1 text-slate-800 dark:text-white text-xs ml-1 py-0.5"
                                    />
                                    {isManualSearching && (
                                        <ActivityIndicator size="small" color="#6366f1" />
                                    )}
                                </View>

                                {/* Autocomplete Dropdown List */}
                                {manualSuggestions.length > 0 && (
                                    <View className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl mt-1 max-h-[140] overflow-hidden z-50 shadow-2xl">
                                        <ScrollView>
                                            {manualSuggestions.map((item, index) => (
                                                <TouchableOpacity
                                                    key={index}
                                                    onPress={() => {
                                                        setTempResolvedLocation({
                                                            address: item.address,
                                                            latitude: item.latitude,
                                                            longitude: item.longitude
                                                        });
                                                        setManualSuggestions([]);
                                                        setManualSearchQuery("");
                                                    }}
                                                    className="px-4 py-3 border-b border-slate-200 dark:border-slate-900 flex-row items-center active:bg-slate-200 dark:active:bg-slate-900"
                                                >
                                                    <Ionicons name="location-outline" size={14} color="#6366f1" className="mr-2" />
                                                    <Text className="text-slate-800 dark:text-white text-xs ml-2 flex-1" numberOfLines={2}>
                                                        {item.address}
                                                    </Text>
                                                </TouchableOpacity>
                                            ))}
                                        </ScrollView>
                                    </View>
                                )}
                            </View>
                        </View>
                    )}
                </View>
            )}

            {/* View All Activities Overlay */}
            {showAllActivitiesModal && (
                <View className="absolute inset-0 bg-black/60 justify-center items-center px-6 z-50">
                    <SafeAreaView className="w-full max-h-[85%] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl relative">
                        {/* Close Button */}
                        <TouchableOpacity
                            onPress={() => setShowAllActivitiesModal(false)}
                            className="absolute top-4 right-4 p-1.5 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-full z-50 active:opacity-75"
                        >
                            <Ionicons name="close-outline" size={20} color={isDark ? "white" : "black"} />
                        </TouchableOpacity>

                        <Text className="text-slate-905 dark:text-white font-extrabold text-lg mb-4">Complete Activity History</Text>

                        <ScrollView showsVerticalScrollIndicator={false} className="w-full">
                            <View className="gap-y-2 pb-6">
                                {workerStats?.activities?.map((activity) => (
                                    <View key={activity._id} className="flex-row items-center p-3 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800/80">
                                        <View className={`w-9 h-9 rounded-full items-center justify-center ${activity.type === "whatsapp" ? "bg-emerald-500/10 border border-emerald-500/20" :
                                            activity.type === "call" ? "bg-blue-500/10 border border-blue-500/20" :
                                                activity.type === "favorite" ? "bg-rose-500/10 border border-rose-500/20" :
                                                    "bg-indigo-500/10 border border-indigo-500/20"
                                            }`}>
                                            <Ionicons
                                                name={
                                                    activity.type === "whatsapp" ? "logo-whatsapp" :
                                                        activity.type === "call" ? "call" :
                                                            activity.type === "favorite" ? "heart" :
                                                                "eye"
                                                }
                                                size={16}
                                                color={
                                                    activity.type === "whatsapp" ? "#10b981" :
                                                        activity.type === "call" ? "#3b82f6" :
                                                            activity.type === "favorite" ? "#ef4444" :
                                                                "#6366f1"
                                                }
                                            />
                                        </View>
                                        <View className="flex-1 ml-3.5 pr-2">
                                            <Text className="text-slate-900 dark:text-slate-300 text-xs font-bold leading-normal">
                                                {activity.text}
                                            </Text>
                                            <Text className="text-slate-400 dark:text-slate-500 text-[10px] font-semibold mt-0.5">
                                                {getRelativeTime(activity.createdAt)}
                                            </Text>
                                        </View>
                                    </View>
                                ))}
                            </View>
                        </ScrollView>
                    </SafeAreaView>
                </View>
            )}
        </SafeAreaView>
    );
}