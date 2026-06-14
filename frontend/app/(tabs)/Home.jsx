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
import useAuthStore from "../../src/store/useAuthStore";
import useLocationStore from "../../src/store/useLocationStore";
import api from "../../src/services/api";

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
    const displayName = user?.fullName || "User";
    const router = useRouter();

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
    const handleDeleteLocation = async (id) => {
        setIsDeletingLocation(true);
        try {
            const response = await api.delete(`/api/extensions/locations/${id}`);
            if (response.data.success) {
                Alert.alert("Success", "Saved address deleted.");
                fetchSavedLocations();
            }
        } catch (err) {
            console.error("Failed to delete saved location:", err);
            Alert.alert("Error", "Could not delete saved location.");
        } finally {
            setIsDeletingLocation(false);
        }
    };

    // Initial Load
    useEffect(() => {
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
        }
    }, [user]);

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

    // Action when user saves address
    const handleSaveAddressProceed = async () => {
        if (!tempResolvedLocation) return;
        setIsSavingAddress(true);
        try {
            if (user) {
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
            Alert.alert("Success", `Active address set to ${selectedLabel}!`);
        } catch (err) {
            console.error("Error saving address details:", err);
            Alert.alert("Error", "Failed to save address details.");
        } finally {
            setIsSavingAddress(false);
        }
    };

    // Action when user bypasses saving address
    const handleProceedWithoutSaving = async () => {
        if (!tempResolvedLocation) return;
        await setLocation(tempResolvedLocation);
        setTempResolvedLocation(null);
        setShowLocationModal(false);
    };

    const renderHorizontalWorkerItem = (item) => {
        const userDetails = item.userId || {};
        const fullName = userDetails.fullName || "Professional";
        const profileImage = userDetails.profileImage || "";
        const cityLoc = item.serviceAreas?.[0]?.city || "Local Area";

        return (
            <TouchableOpacity
                key={item._id}
                onPress={() => router.push(`/worker-profile?workerId=${item._id}`)}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-4 w-[200] mr-4 justify-between active:opacity-90"
            >
                <View className="items-center mb-3">
                    {profileImage ? (
                        <Image
                            source={{ uri: profileImage }}
                            className="w-14 h-14 rounded-full bg-slate-800"
                        />
                    ) : (
                        <View className="w-14 h-14 rounded-full bg-indigo-650 items-center justify-center">
                            <Text className="text-white text-lg font-bold">
                                {fullName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
                            </Text>
                        </View>
                    )}
                    <Text className="text-white font-extrabold text-sm text-center mt-2.5 w-full" numberOfLines={1}>
                        {fullName}
                    </Text>
                    <Text className="text-slate-400 text-[10px] text-center font-semibold mt-0.5 w-full" numberOfLines={1}>
                        {item.profession}
                    </Text>
                </View>

                <View className="border-t border-slate-800/80 pt-2 flex-row justify-between items-center w-full">
                    <View className="flex-row items-center">
                        <Ionicons name="star" size={12} color="#f59e0b" />
                        <Text className="text-white text-[11px] font-bold ml-1">
                            {item.averageRating > 0 ? item.averageRating.toFixed(1) : "New"}
                        </Text>
                    </View>
                    <View className="flex-row items-center">
                        <Ionicons name="navigate-outline" size={11} color="#6366f1" />
                        <Text className="text-slate-400 text-[10px] font-semibold ml-1" numberOfLines={1}>
                            {item.distance !== undefined && item.distance !== 999999
                                ? `${item.distance.toFixed(1)} km`
                                : cityLoc}
                        </Text>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView className="flex-1 bg-slate-950">
            <StatusBar barStyle="light-content" />
            
            <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false}>
                {/* Header & Location Selection */}
                <View className="flex-row justify-between items-center mt-4">
                    <View className="flex-1 mr-4">
                        <TouchableOpacity
                            onPress={() => setShowLocationModal(true)}
                            className="flex-row items-center space-x-1 active:opacity-75"
                        >
                            <Ionicons name="location" size={16} color="#6366f1" />
                            <Text className="text-slate-400 text-xs font-semibold ml-1 flex-1" numberOfLines={1}>
                                {location ? location.address : "Choose Location"}
                            </Text>
                            <Ionicons name="chevron-down" size={12} color="#64748b" />
                        </TouchableOpacity>
                        <Text className="text-2xl font-extrabold text-white mt-1">
                            Hello, {displayName} 👋
                        </Text>
                    </View>
                    <TouchableOpacity className="w-10 h-10 bg-slate-900 border border-slate-800 rounded-full items-center justify-center">
                        <Ionicons name="notifications-outline" size={20} color="white" />
                    </TouchableOpacity>
                </View>

                {/* Search Bar (Navigates to search screen) */}
                <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={() => router.push("/search")}
                    className="flex-row items-center bg-slate-900 border border-slate-800 px-4 py-3.5 rounded-xl mt-6 active:opacity-95"
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
                    <Text className="text-white font-extrabold text-lg">
                        Service Categories
                    </Text>
                    <TouchableOpacity>
                        <Text className="text-indigo-400 font-bold text-sm">See All</Text>
                    </TouchableOpacity>
                </View>

                {/* Categories Grid */}
                {isLoading ? (
                    <View className="py-6 items-center justify-center">
                        <ActivityIndicator size="small" color="#6366f1" />
                    </View>
                ) : error ? (
                    <View className="py-6 items-center justify-center bg-slate-900 border border-slate-800 rounded-xl">
                        <Ionicons name="warning-outline" size={24} color="#f43f5e" />
                        <Text className="text-slate-400 text-sm mt-2 font-medium">{error}</Text>
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
                                    <View className="w-12 h-12 rounded-full items-center justify-center bg-slate-900/40">
                                        <Ionicons name={cat.icon || "construct-outline"} size={24} color={style.color} />
                                    </View>
                                    <Text className="text-white font-bold text-sm text-center">
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
                            <Text className="text-white font-extrabold text-lg">Nearby Professionals</Text>
                            <TouchableOpacity onPress={() => router.push("/search")}>
                                <Text className="text-indigo-400 font-bold text-sm">See All</Text>
                            </TouchableOpacity>
                        </View>
                        {isWorkersLoading ? (
                            <ActivityIndicator size="small" color="#6366f1" className="my-6" />
                        ) : nearbyWorkers.length === 0 ? (
                            <View className="bg-slate-900 border border-slate-800 rounded-2xl p-6 items-center justify-center my-2">
                                <Ionicons name="people-outline" size={28} color="#64748b" />
                                <Text className="text-slate-400 text-sm font-semibold mt-2">No professionals nearby yet</Text>
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
                            <Text className="text-white font-extrabold text-lg">Top Rated Nearby</Text>
                            <TouchableOpacity onPress={() => router.push("/search")}>
                                <Text className="text-indigo-400 font-bold text-sm">See All</Text>
                            </TouchableOpacity>
                        </View>
                        {isWorkersLoading ? (
                            <ActivityIndicator size="small" color="#6366f1" className="my-6" />
                        ) : topRatedWorkers.length === 0 ? (
                            <View className="bg-slate-900 border border-slate-800 rounded-2xl p-6 items-center justify-center my-2">
                                <Ionicons name="star-outline" size={28} color="#64748b" />
                                <Text className="text-slate-400 text-sm font-semibold mt-2">No top rated professionals nearby</Text>
                            </View>
                        ) : (
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
                                {topRatedWorkers.map(renderHorizontalWorkerItem)}
                            </ScrollView>
                        )}
                    </View>
                )}
            </ScrollView>

            {/* Choose Location Screen Overlay (Forces setting location if null) */}
            {showLocationModal && (
                <View className="absolute inset-0 bg-slate-950/95 justify-center items-center px-6 z-50">
                    <StatusBar barStyle="light-content" />
                    
                    {tempResolvedLocation ? (
                        /* Save Resolved Address overlay flow (Home, Work, Other tags) */
                        <View className="bg-slate-900 border border-slate-800 rounded-3xl w-full p-6 gap-y-4 shadow-2xl items-center relative overflow-hidden">
                            {/* Back/Close Button */}
                            <TouchableOpacity
                                onPress={() => setTempResolvedLocation(null)}
                                className="absolute top-4 right-4 p-1 bg-slate-950 border border-slate-800 rounded-full z-50 active:opacity-75"
                            >
                                <Ionicons name="arrow-back-outline" size={18} color="white" />
                            </TouchableOpacity>
                            <View className="absolute top-[-50] right-[-50] w-32 h-32 bg-indigo-500/10 rounded-full blur-xl" />
                            
                            <View className="w-14 h-14 bg-indigo-600/10 rounded-full items-center justify-center border border-indigo-500/20">
                                <Ionicons name="bookmark-outline" size={28} color="#6366f1" />
                            </View>
                            
                            <Text className="text-white font-extrabold text-lg text-center">Save Address Details</Text>
                            
                            <View className="bg-slate-950 border border-slate-850 p-4 rounded-2xl w-full">
                                <Text className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Address Resolved</Text>
                                <Text className="text-white text-xs mt-1 leading-relaxed" numberOfLines={3}>
                                    {tempResolvedLocation.address}
                                </Text>
                            </View>
                            
                            {/* Address labels select tags */}
                            <View className="w-full gap-y-2">
                                <Text className="text-slate-400 text-xs font-semibold text-center">Save location as:</Text>
                                <View className="flex-row justify-center gap-x-2 mt-1">
                                    {["Home", "Work", "Other"].map((label) => {
                                        const isSelected = selectedLabel === label;
                                        return (
                                            <TouchableOpacity
                                                key={label}
                                                onPress={() => setSelectedLabel(label)}
                                                className={`px-4 py-2 rounded-xl border flex-row items-center space-x-1 ${
                                                    isSelected
                                                        ? "bg-indigo-650 border-indigo-500"
                                                        : "bg-slate-950 border-slate-850"
                                                }`}
                                            >
                                                <Ionicons
                                                    name={getLabelIcon(label)}
                                                    size={12}
                                                    color={isSelected ? "white" : "#64748b"}
                                                />
                                                <Text className={`text-xs ml-1 font-bold ${isSelected ? "text-white" : "text-slate-400"}`}>
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
                                    className="bg-slate-950 border border-slate-800 py-3 rounded-xl justify-center items-center active:opacity-90"
                                >
                                    <Text className="text-slate-300 font-semibold text-xs">Set Address without Saving</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    ) : (
                        /* Choose Location Picker Option Flow */
                        <View className="bg-slate-900 border border-slate-800 rounded-3xl w-full p-6 gap-y-4 shadow-2xl items-center relative overflow-hidden">
                            {/* Close/Cross Button */}
                            <TouchableOpacity
                                onPress={() => setShowLocationModal(false)}
                                className="absolute top-4 right-4 p-1 bg-slate-950 border border-slate-800 rounded-full z-50 active:opacity-75"
                            >
                                <Ionicons name="close-outline" size={18} color="white" />
                            </TouchableOpacity>
                            {/* Background glow */}
                            <View className="absolute top-[-50] right-[-50] w-32 h-32 bg-indigo-500/10 rounded-full blur-xl" />
                            
                            <View className="w-14 h-14 bg-indigo-600/10 rounded-full items-center justify-center border border-indigo-500/20">
                                <Ionicons name="location" size={28} color="#6366f1" />
                            </View>
                            <Text className="text-white font-extrabold text-xl text-center">Choose Location</Text>

                            {/* Saved Locations List (Shopping website style choice) */}
                            {user && savedLocations.length > 0 && (
                                <View className="w-full gap-y-2 border-b border-slate-800/80 pb-4">
                                    <Text className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">Your Saved Addresses</Text>
                                    <ScrollView className="max-h-[160px]" showsVerticalScrollIndicator={false}>
                                        <View className="gap-y-2">
                                            {savedLocations.map((loc) => (
                                                <View
                                                    key={loc._id}
                                                    className="bg-slate-950 border border-slate-850 px-3.5 py-2.5 rounded-xl flex-row justify-between items-center"
                                                >
                                                    <TouchableOpacity
                                                        onPress={() => {
                                                            setLocation({
                                                                address: loc.locationName,
                                                                latitude: loc.latitude,
                                                                longitude: loc.longitude
                                                            });
                                                            setShowLocationModal(false);
                                                        }}
                                                        className="flex-row items-center flex-1 mr-2"
                                                    >
                                                        <View className="w-8 h-8 rounded-full bg-slate-900 items-center justify-center border border-slate-800 mr-3">
                                                            <Ionicons name={getLabelIcon(loc.label)} size={14} color="#6366f1" />
                                                        </View>
                                                        <View className="flex-1">
                                                            <Text className="text-white font-bold text-xs">{loc.label}</Text>
                                                            <Text className="text-slate-400 text-[10px] mt-0.5" numberOfLines={1}>
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
                                        Alert.alert("Error", "Could not fetch GPS coordinates. Please make sure location permissions are enabled.");
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
                                <View className="flex-1 h-[1] bg-slate-800" />
                                <Text className="text-slate-500 text-[10px] px-3 font-extrabold tracking-wider">OR</Text>
                                <View className="flex-1 h-[1] bg-slate-800" />
                            </View>

                            {/* Manual Search Autocomplete input */}
                            <View className="w-full gap-y-2 relative">
                                <Text className="text-slate-400 text-xs font-semibold">Enter Location Manually</Text>
                                <View className="bg-slate-950 border border-slate-850 rounded-xl px-4 py-3 flex-row items-center">
                                    <Ionicons name="search" size={16} color="#64748b" className="mr-2" />
                                    <TextInput
                                        value={manualSearchQuery}
                                        onChangeText={setManualSearchQuery}
                                        placeholder="Type address e.g. Model Town Ambala..."
                                        placeholderTextColor="#64748b"
                                        className="flex-1 text-white text-xs ml-1 py-0.5"
                                    />
                                    {isManualSearching && (
                                        <ActivityIndicator size="small" color="#6366f1" />
                                    )}
                                </View>

                                {/* Autocomplete Dropdown List */}
                                {manualSuggestions.length > 0 && (
                                    <View className="bg-slate-950 border border-slate-850 rounded-xl mt-1 max-h-[140] overflow-hidden z-50 shadow-2xl">
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
                                                    className="px-4 py-3 border-b border-slate-900 flex-row items-center active:bg-slate-900"
                                                >
                                                    <Ionicons name="location-outline" size={14} color="#6366f1" className="mr-2" />
                                                    <Text className="text-white text-xs ml-2 flex-1" numberOfLines={2}>
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
        </SafeAreaView>
    );
}