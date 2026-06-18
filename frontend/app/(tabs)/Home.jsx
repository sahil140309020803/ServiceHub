import React, { useState, useEffect, useRef } from "react";
import {
    View,
    Text,
    ScrollView,
    TextInput,
    TouchableOpacity,
    StatusBar,
    ActivityIndicator,
    Image,
    Platform,
    Animated
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useIsFocused, useNavigation } from "@react-navigation/native";
import { useColorScheme } from "nativewind";
import useAuthStore from "../../src/store/useAuthStore";
import useLocationStore from "../../src/store/useLocationStore";
import api from "../../src/services/api";
import storage from "../../src/utils/storage";
import Toast from "react-native-toast-message";
import * as Location from "expo-location";

// Conditionally load react-native-maps to prevent web bundling failures
let MapView = null;
let Marker = null;
if (Platform.OS !== "web") {
    try {
        const Maps = require("react-native-maps");
        MapView = Maps.default;
        Marker = Maps.Marker;
    } catch (e) {
        console.warn("react-native-maps failed to load:", e);
    }
}

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

// Static array of catchphrases/slides for the fader banner
const bannerSlides = [
    { text: "Need an electrician?", icon: "flash-outline", color: "#fbbf24", query: "Electrician", image: require("../../assets/images/electrician.png") },
    { text: "Looking for a plumber?", icon: "water-outline", color: "#38bdf8", query: "Plumber", image: require("../../assets/images/plumber.png") },
    { text: "Want your AC repaired or serviced?", icon: "snow-outline", color: "#60a5fa", query: "AC Repair", image: require("../../assets/images/air-conditioner.png") },
    { text: "Need a carpenter for furniture work?", icon: "hammer-outline", color: "#fb923c", query: "Carpenter", image: require("../../assets/images/carpenter.png") },
    { text: "Need a TV repair expert?", icon: "tv-outline", color: "#a78bfa", query: "TV Repair", emoji: "📺" },
    { text: "Planning to paint your home?", icon: "brush-outline", color: "#f87171", query: "Painter", image: require("../../assets/images/paint-roller.png") },
    { text: "Need a bathroom fitting expert?", icon: "water-outline", color: "#2dd4bf", query: "Bathroom Fitting", emoji: "🚿" },
    { text: "RO or water purifier service?", icon: "water-outline", color: "#34d399", query: "RO Repair", image: require("../../assets/images/water-filter.png") },
    { text: "Need a washing machine repair?", icon: "construct-outline", color: "#f472b6", query: "Washing Machine Repair", image: require("../../assets/images/washing-machine.png") },
    { text: "Refrigerator not cooling?", icon: "thermometer-outline", color: "#38bdf8", query: "Refrigerator Repair", image: require("../../assets/images/refrigerator.png") },
    { text: "Need CCTV installation?", icon: "videocam-outline", color: "#f43f5e", query: "CCTV Installation", image: require("../../assets/images/security-camera.png") },
    { text: "Find trusted professionals near you.", icon: "home-outline", color: "#6366f1", query: "all", emoji: "🏠" },
    { text: "We've got verified professionals ready to help.", icon: "checkmark-circle-outline", color: "#10b981", query: "all", emoji: "✅" }
];

export default function HomeDashboard() {
    const { user } = useAuthStore();
    const isFocused = useIsFocused();
    const navigation = useNavigation();
    const displayName = user?.fullName || "User";
    const router = useRouter();

    const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
    const fadeAnim = useRef(new Animated.Value(1)).current;
    const slideAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const interval = setInterval(() => {
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 0,
                    duration: 900,
                    useNativeDriver: true,
                }),
                Animated.timing(slideAnim, {
                    toValue: -20,
                    duration: 800,
                    useNativeDriver: true,
                })
            ]).start(() => {
                setCurrentSlideIndex((prev) => (prev + 1) % bannerSlides.length);
                slideAnim.setValue(15);
                Animated.parallel([
                    Animated.timing(fadeAnim, {
                        toValue: 1,
                        duration: 900,
                        useNativeDriver: true,
                    }),
                    Animated.timing(slideAnim, {
                        toValue: 1,
                        duration: 800,
                        useNativeDriver: true,
                    })
                ]).start();
            });
        }, 5500);

        return () => clearInterval(interval);
    }, [fadeAnim, slideAnim]);

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

    const reloadData = async () => {
        const isWorker = user?.role === "worker" || user?.role === "admin";
        if (isWorker) {
            fetchWorkerProfile();
            fetchWorkerStats();
            if (user) {
                fetchSavedLocations();
            }
        } else {
            initHomeData();
            if (user) {
                fetchSavedLocations();

                fetchFavorites();
            }
            if (location) {
                fetchWorkersNearby();
            }
        }
    };

    // Initial Load
    useEffect(() => {
        const isWorker = user?.role === "worker" || user?.role === "admin";
        if (isWorker) {
            fetchWorkerProfile();
            fetchWorkerStats();
            if (user) {
                fetchSavedLocations();
            }
            return;
        }

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

    const reloadDataRef = useRef(reloadData);
    reloadDataRef.current = reloadData;

    // Handle Home tab click to reload data
    useEffect(() => {
        if (!navigation) return;
        const unsubscribe = navigation.addListener("tabPress", () => {
            if (reloadDataRef.current) {
                reloadDataRef.current();
            }
        });
        return unsubscribe;
    }, [navigation]);

    // Auto-refresh when screen gets focus
    useEffect(() => {
        if (isFocused) {
            const isWorker = user?.role === "worker" || user?.role === "admin";
            if (isWorker) {
                fetchWorkerProfile();
                fetchWorkerStats();
                if (user) {
                    fetchSavedLocations();
                }
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
            // Load official system categories if not already loaded
            let currentCategories = categories;
            if (currentCategories.length === 0) {
                const catRes = await api.get("/api/categories");
                if (catRes.data.success) {
                    currentCategories = catRes.data.data.filter((cat) => cat.isActive);
                    setCategories(currentCategories);
                }
            }

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

    const handleCategoryCardPress = (categoryName) => {
        const cat = categories.find(c =>
            c.name.toLowerCase().includes(categoryName.toLowerCase())
        );
        if (cat) {
            router.push(`/category-workers?categoryId=${cat._id}&categoryName=${cat.name}`);
        } else {
            router.push(`/category-workers?searchQuery=${encodeURIComponent(categoryName)}&categoryName=${encodeURIComponent(categoryName)}`);
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
            if (isWorker) {
                let prof = workerProfile?.profession;
                if (!prof) {
                    try {
                        const profileRes = await api.get("/api/workers/me");
                        if (profileRes.data.success && profileRes.data.data) {
                            prof = profileRes.data.data.profession;
                            setWorkerProfile(profileRes.data.data);
                        }
                    } catch (e) {
                        console.error("Failed to fetch worker profile inside save proceed:", e);
                    }
                }

                if (prof) {
                    let serviceAreas = [];
                    try {
                        const geoRes = await fetch(
                            `https://nominatim.openstreetmap.org/reverse?lat=${tempResolvedLocation.latitude}&lon=${tempResolvedLocation.longitude}&format=json`,
                            {
                                headers: {
                                    "User-Agent": "ServiceHub-Mobile/1.0"
                                }
                            }
                        );
                        const geoData = await geoRes.json();
                        const addr = geoData.address || {};
                        const area = addr.suburb || addr.neighbourhood || addr.road || "Local Area";
                        const city = addr.city || addr.town || addr.village || addr.county || "Local City";
                        const state = addr.state || "Local State";
                        serviceAreas = [{ area, city, state }];
                    } catch (e) {
                        console.error("Reverse geocoding service areas failed:", e);
                    }

                    const res = await api.post("/api/workers", {
                        profession: prof,
                        address: tempResolvedLocation.address,
                        latitude: tempResolvedLocation.latitude,
                        longitude: tempResolvedLocation.longitude,
                        serviceAreas: serviceAreas.length > 0 ? serviceAreas : undefined
                    });
                    if (res.data.success) {
                        setWorkerProfile(res.data.data);
                    }
                }

                // Also save to user extension locations list so it populates the saved addresses list
                try {
                    await api.post("/api/extensions/locations", {
                        locationName: tempResolvedLocation.address,
                        latitude: tempResolvedLocation.latitude,
                        longitude: tempResolvedLocation.longitude,
                        label: selectedLabel
                    });
                    await fetchSavedLocations();
                } catch (saveErr) {
                    console.error("Failed to save location to user extension list for worker:", saveErr);
                }
            } else if (user) {
                await api.post("/api/extensions/locations", {
                    locationName: tempResolvedLocation.address,
                    latitude: tempResolvedLocation.latitude,
                    longitude: tempResolvedLocation.longitude,
                    label: selectedLabel
                });
                await fetchSavedLocations();
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
        if (isWorker) {
            setIsSavingAddress(true);
            try {
                let prof = workerProfile?.profession;
                if (!prof) {
                    const profileRes = await api.get("/api/workers/me");
                    if (profileRes.data.success && profileRes.data.data) {
                        prof = profileRes.data.data.profession;
                        setWorkerProfile(profileRes.data.data);
                    }
                }

                if (prof) {
                    let serviceAreas = [];
                    try {
                        const geoRes = await fetch(
                            `https://nominatim.openstreetmap.org/reverse?lat=${tempResolvedLocation.latitude}&lon=${tempResolvedLocation.longitude}&format=json`,
                            {
                                headers: {
                                    "User-Agent": "ServiceHub-Mobile/1.0"
                                }
                            }
                        );
                        const geoData = await geoRes.json();
                        const addr = geoData.address || {};
                        const area = addr.suburb || addr.neighbourhood || addr.road || "Local Area";
                        const city = addr.city || addr.town || addr.village || addr.county || "Local City";
                        const state = addr.state || "Local State";
                        serviceAreas = [{ area, city, state }];
                    } catch (e) {
                        console.error("Reverse geocoding service areas failed:", e);
                    }

                    const res = await api.post("/api/workers", {
                        profession: prof,
                        address: tempResolvedLocation.address,
                        latitude: tempResolvedLocation.latitude,
                        longitude: tempResolvedLocation.longitude,
                        serviceAreas: serviceAreas.length > 0 ? serviceAreas : undefined
                    });
                    if (res.data.success) {
                        setWorkerProfile(res.data.data);
                    }
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

    const handleSaveLocationClick = async (location) => {
        const chosenLoc = {
            address: location.locationName,
            latitude: location.latitude,
            longitude: location.longitude
        };
        const isWorker = user?.role === "worker" || user?.role === "admin";
        if (isWorker) {
            try {
                let prof = workerProfile?.profession;
                if (!prof) {
                    const profileRes = await api.get("/api/workers/me");
                    if (profileRes.data.success && profileRes.data.data) {
                        prof = profileRes.data.data.profession;
                        setWorkerProfile(profileRes.data.data);
                    }
                }

                if (prof) {
                    let serviceAreas = [];
                    try {
                        const geoRes = await fetch(
                            `https://nominatim.openstreetmap.org/reverse?lat=${chosenLoc.latitude}&lon=${chosenLoc.longitude}&format=json`,
                            {
                                headers: {
                                    "User-Agent": "ServiceHub-Mobile/1.0"
                                }
                            }
                        );
                        const geoData = await geoRes.json();
                        const addr = geoData.address || {};
                        const area = addr.suburb || addr.neighbourhood || addr.road || "Local Area";
                        const city = addr.city || addr.town || addr.village || addr.county || "Local City";
                        const state = addr.state || "Local State";
                        serviceAreas = [{ area, city, state }];
                    } catch (e) {
                        console.error("Reverse geocoding service areas failed:", e);
                    }

                    const res = await api.post("/api/workers", {
                        profession: prof,
                        address: chosenLoc.address,
                        latitude: chosenLoc.latitude,
                        longitude: chosenLoc.longitude,
                        serviceAreas: serviceAreas.length > 0 ? serviceAreas : undefined
                    });
                    if (res.data.success) {
                        setWorkerProfile(res.data.data);
                    }
                }
            } catch (err) {
                console.error("Failed to update profile location:", err);
            }
        }
        Toast.show({
            type: "success",
            text1: `Location updated to ${chosenLoc.address}`
        });
        setLocation(chosenLoc);
        setShowLocationModal(false);
    };

    const handlePickOnMap = async () => {
        setIsFetchingGps(true);
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            let lat = 28.6139; // Fallback to New Delhi
            let lon = 77.2090;
            let address = "New Delhi, India";

            if (status === "granted") {
                const gpsLocation = await Location.getCurrentPositionAsync({
                    accuracy: Location.Accuracy.Balanced,
                });
                lat = gpsLocation.coords.latitude;
                lon = gpsLocation.coords.longitude;

                // Reverse geocode via Nominatim
                try {
                    const response = await fetch(
                        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,
                        {
                            headers: {
                                "User-Agent": "ServiceHub-Mobile/1.0"
                            }
                        }
                    );
                    const geoData = await response.json();
                    if (geoData && geoData.display_name) {
                        address = geoData.display_name;
                    }
                } catch (e) {
                    console.error("Nominatim reverse geocode in map picker failed:", e);
                }
            } else {
                // If permission denied, use current location state if exists
                if (location?.latitude && location?.longitude) {
                    lat = location.latitude;
                    lon = location.longitude;
                    address = location.address;
                }
            }

            setTempResolvedLocation({
                latitude: lat,
                longitude: lon,
                address: address
            });
        } catch (err) {
            console.error("Error picking on map:", err);
            // Fallback
            const fallbackLat = location?.latitude || 28.6139;
            const fallbackLon = location?.longitude || 77.2090;
            const fallbackAddress = location?.address || "Selected Location";
            setTempResolvedLocation({
                latitude: fallbackLat,
                longitude: fallbackLon,
                address: fallbackAddress
            });
        } finally {
            setIsFetchingGps(false);
        }
    };

    const handleMarkerDragEnd = async (coords) => {
        const lat = coords.latitude;
        const lon = coords.longitude;

        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,
                {
                    headers: {
                        "User-Agent": "ServiceHub-Mobile/1.0"
                    }
                }
            );
            const geoData = await response.json();
            const newAddress = geoData?.display_name || `Coordinates: ${lat.toFixed(5)}, ${lon.toFixed(5)}`;
            setTempResolvedLocation({
                latitude: lat,
                longitude: lon,
                address: newAddress
            });
        } catch (err) {
            console.error("Nominatim reverse geocode on drag end failed:", err);
            setTempResolvedLocation(prev => ({
                ...prev,
                latitude: lat,
                longitude: lon,
                address: prev?.address || `Coordinates: ${lat.toFixed(5)}, ${lon.toFixed(5)}`
            }));
        }
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

                    {/* Catchphrase Sliding Fader Banner */}
                    <TouchableOpacity
                        activeOpacity={0.9}
                        onPress={() => {
                            const slide = bannerSlides[currentSlideIndex];
                            if (slide.query === "all") {
                                router.push("/search");
                            } else {
                                handleCategoryCardPress(slide.query);
                            }
                        }}
                        className="bg-indigo-600 h-32 border border-indigo-500/20  rounded-3xl p-5 mt-6 relative overflow-hidden flex justify-center shadow-lg shadow-indigo-500/20"
                    >
                        {/* Background subtle elements */}
                        <View className="absolute right-[-10] top-[-10] w-32 h-32 bg-indigo-500/20 rounded-full blur-xl" />
                        <View className="absolute left-[-10] bottom-[-20] w-24 h-24 bg-indigo-400/15 rounded-full blur-xl" />

                        <Animated.View
                            style={{
                                opacity: fadeAnim,
                                transform: [{ translateY: slideAnim }],
                                flexDirection: "row",
                                alignItems: "center",
                                justifyContent: "space-between",
                                width: "100%"
                            }}
                        >
                            <View className="flex-row items-center flex-1 mr-4">
                                {/* Large Emoji / Image Badge with Glow */}
                                <View className="w-14 h-14 bg-white/10 dark:bg-slate-900/60 border border-white/20 dark:border-slate-800 rounded-2xl items-center justify-center mr-4 shadow-sm overflow-hidden">
                                    {bannerSlides[currentSlideIndex].image ? (
                                        <Image
                                            source={bannerSlides[currentSlideIndex].image}
                                            className="w-10 h-10"
                                            style={{ resizeMode: "contain" }}
                                        />
                                    ) : (
                                        <Text className="text-3xl">
                                            {bannerSlides[currentSlideIndex].emoji}
                                        </Text>
                                    )}
                                </View>

                                {/* Catchphrase text */}
                                <View className="flex-1">
                                    <Text className="text-white text-base font-extrabold leading-snug">
                                        {bannerSlides[currentSlideIndex].text}
                                    </Text>
                                    <Text className="text-indigo-200 text-xs font-semibold mt-1">
                                        Tap to find verified specialists
                                    </Text>
                                </View>
                            </View>

                            {/* Chevron Go Action button */}
                            <View className="w-10 h-10 bg-white dark:bg-slate-900 rounded-full items-center justify-center shadow-md">
                                <Ionicons name="arrow-forward" size={18} color="#4f46e5" />
                            </View>
                        </Animated.View>
                    </TouchableOpacity>

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
                        <ScrollView
                            style={{ maxHeight: 470 }}
                            nestedScrollEnabled={true}
                            showsVerticalScrollIndicator={false}
                        >
                            <View className="flex-row flex-wrap gap-4 pb-2 justify-between">
                                {categories.map((cat) => {
                                    const style = getCategoryStyles(cat.name);
                                    return (
                                        <TouchableOpacity
                                            key={cat._id}
                                            style={{ width: "48%" }}
                                            onPress={() => router.push(`/category-workers?categoryId=${cat._id}&categoryName=${cat.name}`)}
                                            className={`p-4 rounded-xl border ${style.bgColor} items-center justify-center gap-y-2 active:opacity-90 mb-1`}
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
                        </ScrollView>
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

                            {/* Map Preview with draggable marker inside Location Modal */}
                            {MapView ? (
                                <View className="w-full h-[180] rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden relative">
                                    <MapView
                                        style={{ width: "100%", height: "100%" }}
                                        region={{
                                            latitude: tempResolvedLocation.latitude,
                                            longitude: tempResolvedLocation.longitude,
                                            latitudeDelta: 0.015,
                                            longitudeDelta: 0.015
                                        }}
                                    >
                                        <Marker
                                            coordinate={{
                                                latitude: tempResolvedLocation.latitude,
                                                longitude: tempResolvedLocation.longitude
                                            }}
                                            draggable
                                            onDragEnd={(e) => handleMarkerDragEnd(e.nativeEvent.coordinate)}
                                            title="Your Location"
                                            description="Drag this pin to adjust your position"
                                        />
                                    </MapView>
                                </View>
                            ) : (
                                <View className="w-full h-[80] rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 items-center justify-center p-3">
                                    <Ionicons name="map-outline" size={18} color="#6366f1" />
                                    <Text className="text-slate-500 dark:text-slate-400 text-[10px] mt-1 text-center">
                                        Map preview not supported on web.
                                    </Text>
                                    <Text className="text-slate-900 dark:text-white text-[9px] font-mono mt-0.5 text-center">
                                        Lat: {tempResolvedLocation.latitude.toFixed(5)}, Lng: {tempResolvedLocation.longitude.toFixed(5)}
                                    </Text>
                                </View>
                            )}

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
                                                        onPress={() => handleSaveLocationClick(loc)}
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

                            {/* Map Picker Option */}
                            <TouchableOpacity
                                onPress={handlePickOnMap}
                                disabled={isFetchingGps}
                                className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 w-full py-3.5 rounded-xl flex-row items-center justify-center active:opacity-90 disabled:opacity-75 shadow-sm mt-2"
                            >
                                {isFetchingGps ? (
                                    <ActivityIndicator size="small" color="#6366f1" />
                                ) : (
                                    <>
                                        <Ionicons name="map" size={16} color="#6366f1" />
                                        <Text className="text-slate-900 dark:text-white font-bold ml-2 text-sm">Pick Location on Map</Text>
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