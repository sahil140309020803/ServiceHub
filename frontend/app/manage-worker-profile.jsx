import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    StatusBar,
    ScrollView,
    Alert,
    Platform,
    Image
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useColorScheme } from "nativewind";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import api from "../src/services/api";
import useAuthStore from "../src/store/useAuthStore";
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

export default function ManageWorkerProfileScreen() {
    const router = useRouter();
    const { profileCompleted, logout, token, user } = useAuthStore();
    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === "dark";

    const [profession, setProfession] = useState("");
    const [experienceYears, setExperienceYears] = useState("");
    const [about, setAbout] = useState("");
    const [whatsappNumber, setWhatsappNumber] = useState("");
    const [skillsString, setSkillsString] = useState("");
    
    // Profile image states (optional)
    const [profileImage, setProfileImage] = useState(user?.profileImage || "");
    const [isUploading, setIsUploading] = useState(false);

    // Location Coordinates & Address
    const [latitude, setLatitude] = useState("");
    const [longitude, setLongitude] = useState("");
    const [address, setAddress] = useState("");

    // Manual Search suggestions states
    const [locationSearch, setLocationSearch] = useState("");
    const [suggestions, setSuggestions] = useState([]);
    const [isSearchingLocation, setIsSearchingLocation] = useState(false);
    
    // Service Areas
    const [areaInput, setAreaInput] = useState("");
    const [cityInput, setCityInput] = useState("");
    const [stateInput, setStateInput] = useState("");

    // Dynamic Categories Selector
    const [availableCategories, setAvailableCategories] = useState([]);
    const [selectedCategories, setSelectedCategories] = useState([]);

    // Load status
    const [isPageLoading, setIsPageLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isLocating, setIsLocating] = useState(false);

    const pickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
            Alert.alert("Permission Denied", "We need gallery permissions to select a profile photo.");
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
            const selectedImageUri = result.assets[0].uri;
            uploadImage(selectedImageUri);
        }
    };

    const uploadImage = async (uri) => {
        setIsUploading(true);
        try {
            const formData = new FormData();
            
            // Format filename and type
            const uriParts = uri.split(".");
            const fileType = uriParts[uriParts.length - 1];
            
            formData.append("avatar", {
                uri,
                name: `avatar.${fileType}`,
                type: `image/${fileType === "jpg" ? "jpeg" : fileType}`,
            });

            const response = await api.post("/api/auth/upload-avatar", formData, {
                headers: {
                    "Content-Type": "multipart/form-data",
                    Authorization: `Bearer ${token}`,
                },
            });

            if (response.data.success) {
                setProfileImage(response.data.url);
                Alert.alert("Success", "Photo uploaded successfully!");
            } else {
                Alert.alert("Upload Failed", response.data.message || "Could not upload image");
            }
        } catch (err) {
            console.error("Image upload error:", err);
            Alert.alert("Error", "An error occurred while uploading the image.");
        } finally {
            setIsUploading(false);
        }
    };

    useEffect(() => {
        const loadPageData = async () => {
            try {
                // 1. Fetch available categories
                const catRes = await api.get("/api/categories");
                if (catRes.data.success) {
                    setAvailableCategories(catRes.data.data.filter(c => c.isActive));
                }

                // 2. Fetch existing worker profile if it exists
                const profileRes = await api.get("/api/workers/me").catch(() => null);
                if (profileRes && profileRes.data.success && profileRes.data.data) {
                    const data = profileRes.data.data;
                    setProfession(data.profession || "");
                    if (data.userId && data.userId.profileImage) {
                        setProfileImage(data.userId.profileImage);
                    }
                    setExperienceYears(String(data.experienceYears || 0));
                    setAbout(data.about || "");
                    setWhatsappNumber(data.whatsappNumber || "");
                    setSkillsString((data.skills || []).join(", "));
                    setAddress(data.address || "");
                    setLatitude(data.latitude ? String(data.latitude) : "");
                    setLongitude(data.longitude ? String(data.longitude) : "");

                    if (data.serviceCategories) {
                        setSelectedCategories(data.serviceCategories.map(c => c._id));
                    }

                    if (data.serviceAreas && data.serviceAreas.length > 0) {
                        const firstArea = data.serviceAreas[0];
                        setAreaInput(firstArea.area || "");
                        setCityInput(firstArea.city || "");
                        setStateInput(firstArea.state || "");
                    }
                }
            } catch (err) {
                console.error("Failed to load profile parameters:", err);
            } finally {
                setIsPageLoading(false);
            }
        };

        loadPageData();
    }, []);

    // Nominatim suggestions autocomplete search with debouncing
    useEffect(() => {
        if (!locationSearch.trim() || locationSearch.length < 3) {
            setSuggestions([]);
            return;
        }

        const delayDebounce = setTimeout(async () => {
            setIsSearchingLocation(true);
            try {
                const response = await fetch(
                    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(locationSearch)}&format=json&limit=5`,
                    {
                        headers: {
                            "User-Agent": "ServiceHub-Mobile/1.0"
                        }
                    }
                );
                const data = await response.json();
                if (data && Array.isArray(data)) {
                    setSuggestions(data);
                }
            } catch (err) {
                console.error("Nominatim manual location query failed:", err);
            } finally {
                setIsSearchingLocation(false);
            }
        }, 500);

        return () => clearTimeout(delayDebounce);
    }, [locationSearch]);

    // Handle suggestion select
    const handleSelectSuggestion = (suggestion) => {
        setAddress(suggestion.display_name);
        setLatitude(String(suggestion.lat));
        setLongitude(String(suggestion.lon));
        setSuggestions([]);
        setLocationSearch("");
        Alert.alert("Success", "Manual location selected and set!");
    };

    // Toggle category selection
    const handleToggleCategory = (catId) => {
        if (selectedCategories.includes(catId)) {
            setSelectedCategories(selectedCategories.filter(id => id !== catId));
        } else {
            setSelectedCategories([...selectedCategories, catId]);
        }
    };

    // Auto locate using true device GPS coordinates and reverse geocoding via OpenStreetMap
    const handleAutoLocate = async () => {
        setIsLocating(true);
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== "granted") {
                Alert.alert("Permission Denied", "GPS access is required to auto-locate.");
                setIsLocating(false);
                return;
            }

            const gpsLocation = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
            });

            const { latitude: lat, longitude: lon } = gpsLocation.coords;
            setLatitude(String(lat));
            setLongitude(String(lon));

            // Call Nominatim API directly for reverse geocoding
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
                setAddress(geoData.display_name);
                Alert.alert("Location Resolved", "Address auto-resolved successfully via OpenStreetMap!");
            }
        } catch (err) {
            console.error("Location lookup error:", err);
            Alert.alert("Error", "Could not resolve geocoded address.");
        } finally {
            setIsLocating(false);
        }
    };

    // Handle Marker Drag End and update coordinates + address
    const handleMarkerDragEnd = async (coords) => {
        const lat = coords.latitude;
        const lon = coords.longitude;
        setLatitude(String(lat));
        setLongitude(String(lon));

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
                setAddress(geoData.display_name);
            }
        } catch (err) {
            console.error("Nominatim reverse geocode on drag end failed:", err);
        }
    };

    const handleSave = async () => {
        if (!profession.trim()) {
            Alert.alert("Validation Error", "Profession is required.");
            return;
        }

        if (selectedCategories.length === 0) {
            Alert.alert("Validation Error", "Please select at least one Service Category.");
            return;
        }

        if (!latitude || !longitude || parseFloat(latitude) === 0 || parseFloat(longitude) === 0) {
            Alert.alert("Validation Error", "Please select a location with valid coordinates.");
            return;
        }

        setIsSaving(true);

        // Map comma-separated skills to clean array
        const skillsArray = skillsString
            .split(",")
            .map(s => s.trim())
            .filter(s => s.length > 0);

        // Format single service area from input
        const serviceAreasArray = [];
        if (areaInput.trim() || cityInput.trim() || stateInput.trim()) {
            serviceAreasArray.push({
                area: areaInput.trim() || "All Areas",
                city: cityInput.trim() || "Local City",
                state: stateInput.trim() || "Local State"
            });
        }

        const payload = {
            profession: profession.trim(),
            experienceYears: parseInt(experienceYears, 10) || 0,
            about: about.trim(),
            whatsappNumber: whatsappNumber.trim(),
            skills: skillsArray,
            serviceCategories: selectedCategories,
            serviceAreas: serviceAreasArray,
            address: address.trim(),
            latitude: parseFloat(latitude) || 0,
            longitude: parseFloat(longitude) || 0,
            profileImage: profileImage
        };

        try {
            const response = await api.post("/api/workers", payload);
            if (response.data.success) {
                // Instantly update global completed flag to trigger RootLayout navigate gate
                useAuthStore.getState().setProfileCompleted(true);
                if (response.data.data && response.data.data.userId) {
                    useAuthStore.setState({ user: response.data.data.userId });
                }
                Alert.alert("Success", "Professional profile saved successfully!", [
                    { text: "OK", onPress: () => router.replace("/(tabs)/Home") }
                ]);
            } else {
                Alert.alert("Save Failed", response.data.message || "Could not save profile.");
            }
        } catch (err) {
            console.error("Save profile error:", err);
            const msg = err.response?.data?.message || "Failed to submit profile details.";
            Alert.alert("Error", msg);
        } finally {
            setIsSaving(false);
        }
    };

    if (isPageLoading) {
        return (
            <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950 justify-center items-center">
                <ActivityIndicator size="large" color="#6366f1" />
            </SafeAreaView>
        );
    }

    const latVal = parseFloat(latitude) || 0;
    const lonVal = parseFloat(longitude) || 0;
    const isCoordsValid = latVal !== 0 && lonVal !== 0;

    return (
        <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950" edges={["top", "left", "right"]}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

            {/* Header */}
            <View className="flex-row items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-900 bg-white dark:bg-slate-950">
                {profileCompleted ? (
                    <TouchableOpacity
                        onPress={() => router.canGoBack() ? router.back() : router.replace("/(tabs)/profile")}
                        className="w-10 h-10 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full items-center justify-center active:opacity-85"
                    >
                        <Ionicons name="arrow-back" size={20} color={isDark ? "white" : "#0f172a"} />
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity
                        onPress={logout}
                        className="flex-row items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-rose-950 px-3.5 py-2 rounded-xl active:opacity-90"
                    >
                        <Ionicons name="log-out-outline" size={16} color="#f43f5e" />
                        <Text className="text-rose-500 font-bold ml-1.5 text-xs">Logout</Text>
                    </TouchableOpacity>
                )}
                <Text className="text-lg font-bold text-slate-900 dark:text-white">Manage Professional Profile</Text>
                <View className="w-10" />
            </View>

            <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
                <View className="px-5 py-6 gap-y-5">
                    {/* Onboarding Alert Banner */}
                    {!profileCompleted && (
                        <View className="bg-indigo-500/10 border border-indigo-500/20 rounded-2xl p-4 flex-row items-start space-x-3 mb-2">
                            <Ionicons name="information-circle-outline" size={20} color="#6366f1" />
                            <View className="flex-1 ml-2">
                                <Text className="text-slate-900 dark:text-white font-extrabold text-sm">Welcome to ServiceHub!</Text>
                                <Text className="text-slate-500 dark:text-slate-400 text-xs mt-1 leading-relaxed">
                                    Please complete your professional profile setup. You will get immediate access to customer requests once saved.
                                </Text>
                            </View>
                        </View>
                    )}

                    {/* Profile Image Picker (Optional) */}
                    <View className="items-center my-2">
                        <Text className="text-slate-700 dark:text-slate-300 font-semibold text-sm self-start mb-2">Profile Photo (Optional)</Text>
                        <TouchableOpacity 
                            onPress={pickImage} 
                            disabled={isUploading}
                            className="relative active:opacity-90"
                        >
                            <View className="w-24 h-24 rounded-full bg-slate-900 border-2 border-indigo-500/50 justify-center items-center overflow-hidden shadow-lg shadow-indigo-500/20">
                                {isUploading ? (
                                    <ActivityIndicator size="small" color="#6366f1" />
                                ) : profileImage ? (
                                    <Image 
                                        source={{ uri: profileImage }} 
                                        className="w-full h-full"
                                    />
                                ) : (
                                    <View className="items-center justify-center">
                                        <Ionicons name="person" size={40} color="#64748b" />
                                    </View>
                                )}
                            </View>
                            
                            {/* Camera overlay badge */}
                            <View className="absolute bottom-0 right-0 bg-indigo-600 border border-slate-950 w-7 h-7 rounded-full items-center justify-center shadow-md">
                                <Ionicons name="camera" size={14} color="white" />
                            </View>
                        </TouchableOpacity>
                        <Text className="text-slate-500 dark:text-slate-400 text-[11px] mt-1.5 font-medium">
                            {isUploading ? "Uploading..." : "Click to select profile photo"}
                        </Text>
                    </View>

                    {/* Profession */}
                    <View className="gap-y-2">
                        <Text className="text-slate-700 dark:text-slate-300 font-semibold text-sm">Profession Title</Text>
                        <TextInput
                            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-4 py-3.5 rounded-xl text-slate-900 dark:text-white text-base"
                            placeholder="e.g. Master Plumber, Senior Electrician"
                            placeholderTextColor={isDark ? "#64748b" : "#94a3b8"}
                            value={profession}
                            onChangeText={setProfession}
                        />
                    </View>

                    {/* Experience Years */}
                    <View className="gap-y-2">
                        <Text className="text-slate-700 dark:text-slate-300 font-semibold text-sm">Years of Experience</Text>
                        <TextInput
                            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-4 py-3.5 rounded-xl text-slate-900 dark:text-white text-base"
                            placeholder="e.g. 5"
                            placeholderTextColor={isDark ? "#64748b" : "#94a3b8"}
                            keyboardType="numeric"
                            value={experienceYears}
                            onChangeText={setExperienceYears}
                        />
                    </View>

                    {/* About Bio */}
                    <View className="gap-y-2">
                        <Text className="text-slate-700 dark:text-slate-300 font-semibold text-sm">About / Bio</Text>
                        <TextInput
                            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-4 py-3.5 rounded-xl text-slate-900 dark:text-white text-base min-h-[100]"
                            placeholder="Describe your expertise, services offered, and quality assurance..."
                            placeholderTextColor={isDark ? "#64748b" : "#94a3b8"}
                            multiline
                            textAlignVertical="top"
                            value={about}
                            onChangeText={setAbout}
                        />
                    </View>

                    {/* WhatsApp */}
                    <View className="gap-y-2">
                        <Text className="text-slate-700 dark:text-slate-300 font-semibold text-sm">WhatsApp Contact Number</Text>
                        <TextInput
                            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-4 py-3.5 rounded-xl text-slate-900 dark:text-white text-base"
                            placeholder="e.g. +15556781234"
                            placeholderTextColor={isDark ? "#64748b" : "#94a3b8"}
                            keyboardType="phone-pad"
                            value={whatsappNumber}
                            onChangeText={setWhatsappNumber}
                        />
                    </View>

                    {/* Skills Comma Separated */}
                    <View className="gap-y-2">
                        <Text className="text-slate-700 dark:text-slate-300 font-semibold text-sm">Skills (Comma-separated)</Text>
                        <TextInput
                            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-4 py-3.5 rounded-xl text-slate-900 dark:text-white text-base"
                            placeholder="e.g. pipe leaks, drain install, faucet repair"
                            placeholderTextColor={isDark ? "#64748b" : "#94a3b8"}
                            value={skillsString}
                            onChangeText={setSkillsString}
                        />
                    </View>

                    {/* Service Areas (City, Area, State) */}
                    <View className="gap-y-3">
                        <Text className="text-slate-900 dark:text-white font-extrabold text-base border-t border-slate-200 dark:border-slate-900 pt-4 mt-2">
                            Service Area Details
                        </Text>
                        
                        <View className="gap-y-1">
                            <Text className="text-slate-500 dark:text-slate-400 text-xs">Area / Neighborhood</Text>
                            <TextInput
                                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-4 py-3 rounded-xl text-slate-900 dark:text-white text-sm"
                                placeholder="e.g. Brooklyn, Manhattan"
                                placeholderTextColor={isDark ? "#64748b" : "#94a3b8"}
                                value={areaInput}
                                onChangeText={setAreaInput}
                            />
                        </View>

                        <View className="gap-y-1">
                            <Text className="text-slate-500 dark:text-slate-400 text-xs">City</Text>
                            <TextInput
                                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-4 py-3 rounded-xl text-slate-900 dark:text-white text-sm"
                                placeholder="e.g. New York"
                                placeholderTextColor={isDark ? "#64748b" : "#94a3b8"}
                                value={cityInput}
                                onChangeText={setCityInput}
                            />
                        </View>

                        <View className="gap-y-1">
                            <Text className="text-slate-500 dark:text-slate-400 text-xs">State</Text>
                            <TextInput
                                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-4 py-3 rounded-xl text-slate-900 dark:text-white text-sm"
                                placeholder="e.g. NY"
                                placeholderTextColor={isDark ? "#64748b" : "#94a3b8"}
                                value={stateInput}
                                onChangeText={setStateInput}
                            />
                        </View>
                    </View>

                    {/* Geolocation Section */}
                    <View className="gap-y-3 border-t border-slate-200 dark:border-slate-900 pt-4 mt-2">
                        <Text className="text-slate-900 dark:text-white font-extrabold text-base">Coordinates & Address</Text>
                        
                        {/* Auto detect button */}
                        <TouchableOpacity
                            onPress={handleAutoLocate}
                            disabled={isLocating}
                            className="bg-indigo-600/10 border border-indigo-500/20 py-3 rounded-xl flex-row items-center justify-center space-x-2 active:opacity-90"
                        >
                            {isLocating ? (
                                <ActivityIndicator size="small" color="#6366f1" />
                            ) : (
                                <>
                                    <Ionicons name="locate" size={18} color="#6366f1" />
                                    <Text className="text-indigo-400 font-bold ml-1 text-sm">
                                        Auto Detect Coordinates (GPS)
                                    </Text>
                                </>
                            )}
                        </TouchableOpacity>

                        {/* Manual Search Autocomplete input */}
                        <View className="gap-y-1.5 relative">
                            <Text className="text-slate-500 dark:text-slate-400 text-xs">Manual Location Search</Text>
                            <View className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 flex-row items-center">
                                <Ionicons name="search" size={16} color="#64748b" className="mr-2" />
                                <TextInput
                                    value={locationSearch}
                                    onChangeText={setLocationSearch}
                                    placeholder="Type to search e.g. Model Town Ambala..."
                                    placeholderTextColor={isDark ? "#64748b" : "#94a3b8"}
                                    className="flex-1 text-slate-900 dark:text-white text-xs ml-1 py-1"
                                />
                                {isSearchingLocation && (
                                    <ActivityIndicator size="small" color="#6366f1" />
                                )}
                            </View>

                            {/* Autocomplete Dropdown list */}
                            {suggestions.length > 0 && (
                                <View className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl mt-1 overflow-hidden z-50 shadow-lg">
                                    {suggestions.map((item, index) => (
                                        <TouchableOpacity
                                            key={index}
                                            onPress={() => handleSelectSuggestion(item)}
                                            className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex-row items-center active:bg-slate-100 dark:active:bg-slate-800"
                                        >
                                            <Ionicons name="location-outline" size={14} color="#6366f1" className="mr-2" />
                                            <Text className="text-slate-900 dark:text-white text-xs ml-2 flex-1" numberOfLines={2}>
                                                {item.display_name}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            )}
                        </View>

                        <View className="flex-row gap-x-4 mt-1">
                            <View className="flex-1 gap-y-1">
                                <Text className="text-slate-500 dark:text-slate-400 text-xs">Latitude</Text>
                                <TextInput
                                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-4 py-3 rounded-xl text-slate-900 dark:text-white text-sm"
                                    placeholder="0.0"
                                    placeholderTextColor={isDark ? "#64748b" : "#94a3b8"}
                                    keyboardType="numeric"
                                    value={latitude}
                                    onChangeText={setLatitude}
                                />
                            </View>
                            <View className="flex-1 gap-y-1">
                                <Text className="text-slate-500 dark:text-slate-400 text-xs">Longitude</Text>
                                <TextInput
                                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-4 py-3 rounded-xl text-slate-900 dark:text-white text-sm"
                                    placeholder="0.0"
                                    placeholderTextColor={isDark ? "#64748b" : "#94a3b8"}
                                    keyboardType="numeric"
                                    value={longitude}
                                    onChangeText={setLongitude}
                                />
                            </View>
                        </View>

                        <View className="gap-y-1.5">
                            <Text className="text-slate-500 dark:text-slate-400 text-xs">Full Address Description</Text>
                            <TextInput
                                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-4 py-3 rounded-xl text-slate-900 dark:text-white text-sm min-h-[60]"
                                placeholder="Full street address..."
                                placeholderTextColor={isDark ? "#64748b" : "#94a3b8"}
                                multiline
                                value={address}
                                onChangeText={setAddress}
                            />
                        </View>

                        {/* Map Preview with draggable marker */}
                        {isCoordsValid && (
                            <View className="gap-y-1 mt-1">
                                <Text className="text-slate-500 dark:text-slate-400 text-xs font-semibold">Map Location Preview (Drag Pin to Fine-Tune)</Text>
                                {MapView ? (
                                    <View className="w-full h-[220] rounded-2xl border border-slate-800 overflow-hidden relative">
                                        <MapView
                                            style={{ width: "100%", height: "100%" }}
                                            region={{
                                                latitude: latVal,
                                                longitude: lonVal,
                                                latitudeDelta: 0.01,
                                                longitudeDelta: 0.01
                                            }}
                                        >
                                            <Marker
                                                coordinate={{ latitude: latVal, longitude: lonVal }}
                                                draggable
                                                onDragEnd={(e) => handleMarkerDragEnd(e.nativeEvent.coordinate)}
                                                title={profession || "Your Location"}
                                                description="Drag this pin to update your coordinates"
                                            />
                                        </MapView>
                                    </View>
                                ) : (
                                    <View className="w-full h-[120] rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 items-center justify-center p-4 shadow-sm">
                                        <Ionicons name="map-outline" size={24} color="#6366f1" />
                                        <Text className="text-slate-500 dark:text-slate-400 text-xs mt-2 text-center">
                                            Interactive map preview not supported on web. Coordinates set to:
                                        </Text>
                                        <Text className="text-slate-900 dark:text-white text-xs font-mono mt-1 text-center">
                                            Lat: {latVal.toFixed(6)}, Lng: {lonVal.toFixed(6)}
                                        </Text>
                                    </View>
                                )}
                            </View>
                        )}
                    </View>

                    {/* Category selectors */}
                    <View className="gap-y-2 border-t border-slate-200 dark:border-slate-900 pt-4 mt-2 mb-4">
                        <Text className="text-slate-900 dark:text-white font-extrabold text-base mb-1">
                            Select Service Categories
                        </Text>
                        <View className="flex-row flex-wrap gap-2">
                            {availableCategories.map((cat) => {
                                const isSelected = selectedCategories.includes(cat._id);
                                return (
                                    <TouchableOpacity
                                        key={cat._id}
                                        onPress={() => handleToggleCategory(cat._id)}
                                        className={`px-3 py-2 rounded-lg border ${isSelected ? "bg-indigo-600/10 border-indigo-500" : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"}`}
                                    >
                                        <Text className={`text-xs font-semibold ${isSelected ? "text-indigo-600 dark:text-indigo-400" : "text-slate-500 dark:text-slate-400"}`}>
                                            {cat.name}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>
                </View>
            </ScrollView>

            {/* Save Button */}
            <View className="p-5 border-t border-slate-200 dark:border-slate-900 bg-white dark:bg-slate-950">
                <TouchableOpacity
                    onPress={handleSave}
                    disabled={isSaving}
                    className="bg-indigo-600 py-4 rounded-xl items-center justify-center shadow-lg shadow-indigo-500/30 active:opacity-90 disabled:opacity-75"
                >
                    {isSaving ? (
                        <ActivityIndicator size="small" color="white" />
                    ) : (
                        <Text className="text-white font-bold text-lg">Save Profile</Text>
                    )}
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}
