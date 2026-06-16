import React, { useState, useEffect } from "react";
import { useRouter } from "expo-router";
import {
    View,
    Text,
    TouchableOpacity,
    StatusBar,
    ScrollView,
    ActivityIndicator,
    Image,
    Modal,
    TextInput,
    Alert
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useIsFocused } from "@react-navigation/native";
import useAuthStore from "../../src/store/useAuthStore";
import api from "../../src/services/api";
import useLocationStore from "../../src/store/useLocationStore";

export default function ProfileScreen() {
    const { user, logout } = useAuthStore();
    const router = useRouter();
    const isFocused = useIsFocused();

    const isWorker = user?.role === "worker" || user?.role === "admin";

    if (isWorker) {
        return <WorkerProfileTab user={user} logout={logout} router={router} isFocused={isFocused} />;
    }

    return <CustomerProfileTab user={user} logout={logout} router={router} />;
}

// ----------------------------------------------------
// WORKER PROFILE VIEW (FULL DASHBOARD WITH COMPONENT EDITORS)
// ----------------------------------------------------
function WorkerProfileTab({ user, logout, router, isFocused }) {
    const [profile, setProfile] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [reviews, setReviews] = useState([]);
    const [isReviewsLoading, setIsReviewsLoading] = useState(true);
    const [gallery, setGallery] = useState([]);

    // Modal Visibility States
    const [infoModalVisible, setInfoModalVisible] = useState(false);
    const [aboutModalVisible, setAboutModalVisible] = useState(false);
    const [skillsModalVisible, setSkillsModalVisible] = useState(false);
    const [categoriesModalVisible, setCategoriesModalVisible] = useState(false);
    const [areasModalVisible, setAreasModalVisible] = useState(false);
    const [locationModalVisible, setLocationModalVisible] = useState(false);

    // Modal Edit Fields States
    const [editProfession, setEditProfession] = useState("");
    const [editExperience, setEditExperience] = useState("");
    const [editWhatsapp, setEditWhatsapp] = useState("");

    const [editAboutText, setEditAboutText] = useState("");

    const [editSkillsList, setEditSkillsList] = useState([]);
    const [newSkillInput, setNewSkillInput] = useState("");

    const [availableCategories, setAvailableCategories] = useState([]);
    const [editSelectedCategories, setEditSelectedCategories] = useState([]);
    const [isLoadingCategories, setIsLoadingCategories] = useState(false);

    const [editArea, setEditArea] = useState("");
    const [editCity, setEditCity] = useState("");
    const [editState, setEditState] = useState("");

    const [locSearchQuery, setLocSearchQuery] = useState("");
    const [locSuggestions, setLocSuggestions] = useState([]);
    const [isSearchingLoc, setIsSearchingLoc] = useState(false);
    const [isDetectingLoc, setIsDetectingLoc] = useState(false);

    const { setLocation, getCurrentLocation, searchManualLocation } = useLocationStore();

    const fetchGallery = async (workerId) => {
        try {
            const res = await api.get(`/api/gallery/worker/${workerId}`);
            if (res.data.success) {
                setGallery(res.data.data || []);
            }
        } catch (err) {
            console.error("Error loading worker gallery preview:", err);
        }
    };

    const fetchWorkerProfile = async () => {
        setIsLoading(true);
        try {
            const response = await api.get("/api/workers/me");
            if (response.data.success) {
                const profData = response.data.data;
                setProfile(profData);
                if (profData?._id) {
                    fetchReviews(profData._id);
                    fetchGallery(profData._id);
                }
            }
        } catch (err) {
            console.error("Error fetching own worker profile:", err);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchReviews = async (workerId) => {
        try {
            const response = await api.get(`/api/reviews/worker/${workerId}`);
            if (response.data.success) {
                setReviews(response.data.data);
            }
        } catch (err) {
            console.error("Error fetching worker reviews:", err);
        } finally {
            setIsReviewsLoading(false);
        }
    };

    useEffect(() => {
        if (isFocused) {
            fetchWorkerProfile();
        }
    }, [isFocused]); // eslint-disable-line react-hooks/exhaustive-deps

    // Prefill form states when profile loads
    useEffect(() => {
        if (profile) {
            setEditProfession(profile.profession || "");
            setEditExperience(String(profile.experienceYears || "0"));
            setEditWhatsapp(profile.whatsappNumber || "");
            setEditAboutText(profile.about || "");
            setEditSkillsList(profile.skills || []);
            setEditSelectedCategories(profile.serviceCategories?.map(c => c._id || c) || []);

            const areaObj = profile.serviceAreas?.[0] || {};
            setEditArea(areaObj.area || "");
            setEditCity(areaObj.city || "");
            setEditState(areaObj.state || "");
        }
    }, [profile]);

    const getInitials = (name) => {
        if (!name) return "P";
        return name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);
    };

    // Modal Trigger Actions
    const openCategoriesModal = async () => {
        setCategoriesModalVisible(true);
        if (availableCategories.length === 0) {
            setIsLoadingCategories(true);
            try {
                const res = await api.get("/api/categories");
                if (res.data.success) {
                    setAvailableCategories(res.data.data.filter(c => c.isActive));
                }
            } catch (err) {
                console.error("Error loading categories:", err);
            } finally {
                setIsLoadingCategories(false);
            }
        }
    };

    // Save Handlers
    const handleSaveInfo = async () => {
        if (!editProfession.trim()) {
            Alert.alert("Error", "Profession description is required");
            return;
        }
        try {
            const res = await api.post("/api/workers", {
                profession: editProfession,
                experienceYears: parseInt(editExperience) || 0,
                whatsappNumber: editWhatsapp,
            });
            if (res.data.success) {
                setProfile(res.data.data);
                setInfoModalVisible(false);
                Alert.alert("Success", "Professional details updated");
            }
        } catch (e) {
            Alert.alert("Error", e.response?.data?.message || "Failed to update professional info");
        }
    };

    const handleSaveAbout = async () => {
        try {
            const res = await api.post("/api/workers", {
                profession: profile.profession,
                about: editAboutText,
            });
            if (res.data.success) {
                setProfile(res.data.data);
                setAboutModalVisible(false);
                Alert.alert("Success", "About description updated");
            }
        } catch (e) {
            Alert.alert("Error", e.response?.data?.message || "Failed to update About description");
        }
    };

    const handleAddSkill = () => {
        const cleaned = newSkillInput.trim();
        if (cleaned && !editSkillsList.includes(cleaned)) {
            setEditSkillsList([...editSkillsList, cleaned]);
            setNewSkillInput("");
        }
    };

    const handleRemoveSkill = (skillToRemove) => {
        setEditSkillsList(editSkillsList.filter(s => s !== skillToRemove));
    };

    const handleSaveSkills = async () => {
        try {
            const res = await api.post("/api/workers", {
                profession: profile.profession,
                skills: editSkillsList,
            });
            if (res.data.success) {
                setProfile(res.data.data);
                setSkillsModalVisible(false);
                Alert.alert("Success", "Specialist skills updated");
            }
        } catch (e) {
            Alert.alert("Error", e.response?.data?.message || "Failed to update specialist skills");
        }
    };

    const handleToggleCategory = (catId) => {
        if (editSelectedCategories.includes(catId)) {
            setEditSelectedCategories(editSelectedCategories.filter(id => id !== catId));
        } else {
            setEditSelectedCategories([...editSelectedCategories, catId]);
        }
    };

    const handleSaveCategories = async () => {
        try {
            const res = await api.post("/api/workers", {
                profession: profile.profession,
                serviceCategories: editSelectedCategories,
            });
            if (res.data.success) {
                setProfile(res.data.data);
                setCategoriesModalVisible(false);
                Alert.alert("Success", "Service categories updated");
            }
        } catch (e) {
            Alert.alert("Error", e.response?.data?.message || "Failed to update service categories");
        }
    };

    const handleSaveAreas = async () => {
        try {
            const res = await api.post("/api/workers", {
                profession: profile.profession,
                serviceAreas: [{ area: editArea, city: editCity, state: editState }],
            });
            if (res.data.success) {
                setProfile(res.data.data);
                setAreasModalVisible(false);
                Alert.alert("Success", "Service areas updated");
            }
        } catch (e) {
            Alert.alert("Error", e.response?.data?.message || "Failed to update service areas");
        }
    };

    const handleSearchLocation = async (query) => {
        setLocSearchQuery(query);
        if (query.trim().length > 2) {
            setIsSearchingLoc(true);
            const list = await searchManualLocation(query);
            setLocSuggestions(list);
            setIsSearchingLoc(false);
        } else {
            setLocSuggestions([]);
        }
    };

    const handleGPSDetect = async () => {
        setIsDetectingLoc(true);
        const resolved = await getCurrentLocation();
        if (resolved) {
            await handleSaveLocation(resolved);
        } else {
            Alert.alert("Location Error", "Could not fetch GPS location. Make sure GPS permissions are enabled.");
        }
        setIsDetectingLoc(false);
    };

    const handleSaveLocation = async (chosenLoc) => {
        try {
            const res = await api.post("/api/workers", {
                profession: profile.profession,
                address: chosenLoc.address,
                latitude: chosenLoc.latitude,
                longitude: chosenLoc.longitude,
            });
            if (res.data.success) {
                await setLocation(chosenLoc); // Sync with local location store (active home location)
                setProfile(res.data.data);
                setLocationModalVisible(false);
                Alert.alert("Success", "Profile address and active home location synchronized!");
            }
        } catch (e) {
            Alert.alert("Error", e.response?.data?.message || "Failed to update profile location");
        }
    };

    if (isLoading) {
        return (
            <SafeAreaView className="flex-1 bg-slate-950 justify-center items-center">
                <ActivityIndicator size="large" color="#6366f1" />
            </SafeAreaView>
        );
    }

    const fullName = user?.fullName || "Service Professional";
    const profileImage = user?.profileImage || "";

    return (
        <SafeAreaView className="flex-1 bg-slate-950" edges={["bottom"]}>
            <StatusBar barStyle="light-content" />

            <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
                {/* Hero Avatar Card */}
                {profile ? (
                    <View className="items-center py-6 bg-slate-900 border-b border-slate-800 relative">
                        {/* Edit Profile Info Trigger */}
                        <TouchableOpacity
                            onPress={() => setInfoModalVisible(true)}
                            className="absolute top-4 right-4 bg-slate-800/80 border border-slate-700/50 p-2.5 rounded-full flex-row items-center active:opacity-85 shadow-sm"
                        >
                            <Ionicons name="create-outline" size={18} color="#818cf8" />
                            <Text className="text-indigo-400 text-xs font-bold ml-1">Edit</Text>
                        </TouchableOpacity>

                        <View className="relative">
                            {profileImage ? (
                                <Image
                                    source={{ uri: profileImage }}
                                    className="w-24 h-24 rounded-2xl border-2 border-slate-700 bg-slate-800"
                                />
                            ) : (
                                <View className="w-24 h-24 bg-indigo-600 rounded-2xl items-center justify-center border-2 border-slate-700 shadow-xl shadow-indigo-500/20">
                                    <Text className="text-white text-3xl font-black">
                                        {getInitials(fullName)}
                                    </Text>
                                </View>
                            )}
                            {profile.isVerified && (
                                <View className="absolute bottom-[-6] right-[-6] bg-indigo-500 rounded-full p-1 border-2 border-slate-900">
                                    <Ionicons name="checkmark" size={16} color="white" />
                                </View>
                            )}
                        </View>

                        <Text className="text-2xl font-extrabold text-white mt-4">{fullName}</Text>
                        <Text className="text-slate-400 text-sm font-semibold mt-1">
                            {profile.profession}
                        </Text>

                        {/* Quick Stats Grid */}
                        <View className="flex-row justify-around w-full mt-6 px-4">
                            <View className="items-center flex-1">
                                <Ionicons name="briefcase-outline" size={16} color="#6366f1" />
                                <Text className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">
                                    Experience
                                </Text>
                                <Text className="text-white font-extrabold text-base mt-0.5">
                                    {profile.experienceYears} Years
                                </Text>
                            </View>

                            <View className="w-[1] h-8 bg-slate-800 self-center" />

                            <View className="items-center flex-1">
                                <Ionicons name="star" size={16} color="#f59e0b" />
                                <Text className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">
                                    Rating
                                </Text>
                                <Text className="text-white font-extrabold text-base mt-0.5">
                                    {profile.averageRating > 0 ? profile.averageRating.toFixed(1) : "New"}
                                </Text>
                            </View>

                            <View className="w-[1] h-8 bg-slate-800 self-center" />

                            <View className="items-center flex-1">
                                <Ionicons name="eye-outline" size={16} color="#10b981" />
                                <Text className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">
                                    Views
                                </Text>
                                <Text className="text-white font-extrabold text-base mt-0.5">
                                    {profile.profileViews || 0}
                                </Text>
                            </View>
                        </View>
                    </View>
                ) : (
                    <View className="bg-slate-900 p-8 border-b border-slate-800 items-center justify-center">
                        <Ionicons name="construct-outline" size={40} color="#6366f1" />
                        <Text className="text-white font-extrabold text-base mt-4 text-center">
                            Professional Profile Incomplete
                        </Text>
                        <Text className="text-slate-400 text-xs mt-1 text-center max-w-xs leading-relaxed">
                            Complete your professional settings to activate your account and start receiving leads.
                        </Text>
                        <TouchableOpacity
                            onPress={() => router.push("/manage-worker-profile")}
                            className="bg-indigo-600 px-6 py-3 rounded-xl mt-4 active:opacity-90"
                        >
                            <Text className="text-white font-bold">Complete Profile Now</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Profile Details Content */}
                <View className="px-5 py-6 gap-y-6">
                    {profile && (
                        <>
                            {/* About section */}
                            <View className="gap-y-2">
                                <View className="flex-row justify-between items-center mb-1">
                                    <Text className="text-white font-extrabold text-base">About Me</Text>
                                    <TouchableOpacity
                                        onPress={() => setAboutModalVisible(true)}
                                        className="bg-indigo-600/10 border border-indigo-500/20 px-3 py-1.5 rounded-xl flex-row items-center space-x-1 active:opacity-85"
                                    >
                                        <Ionicons name="pencil-sharp" size={12} color="#818cf8" />
                                        <Text className="text-indigo-400 font-bold text-xs ml-1">Edit</Text>
                                    </TouchableOpacity>
                                </View>
                                <View className="bg-slate-900 border border-slate-800 rounded-2xl p-4 border-l-4 border-l-indigo-500 shadow-sm">
                                    <Text className="text-slate-300 text-sm leading-relaxed">
                                        {profile.about || "Describe your services, charges, and expertise."}
                                    </Text>
                                </View>
                            </View>

                            {/* Projects Gallery Portfolio section */}
                            {gallery && gallery.length > 0 && (
                                <View className="gap-y-3">
                                    <View className="flex-row justify-between items-center mb-1">
                                        <Text className="text-white font-extrabold text-base">Completed Projects ({gallery.length})</Text>
                                        <TouchableOpacity
                                            onPress={() => router.push("/worker/GalleryScreen")}
                                            className="bg-indigo-600/10 border border-indigo-500/20 px-3 py-1.5 rounded-xl flex-row items-center space-x-1 active:opacity-85"
                                        >
                                            <Ionicons name="images-outline" size={12} color="#818cf8" />
                                            <Text className="text-indigo-400 font-bold text-xs ml-1">Manage Gallery</Text>
                                        </TouchableOpacity>
                                    </View>
                                    <ScrollView
                                        horizontal
                                        showsHorizontalScrollIndicator={false}
                                        contentContainerStyle={{ paddingRight: 20 }}
                                    >
                                        {gallery.map((item) => (
                                            <TouchableOpacity
                                                key={item._id}
                                                onPress={() => router.push(`/worker/GalleryDetailsScreen?galleryId=${item._id}`)}
                                                activeOpacity={0.95}
                                                className="bg-slate-900 border border-slate-850 rounded-2xl overflow-hidden mr-3.5 relative"
                                                style={{ width: 140, height: 140 }}
                                            >
                                                <Image
                                                    source={{ uri: item.imageUrl }}
                                                    className="w-full h-full"
                                                    resizeMode="cover"
                                                />
                                                {/* Overlay Stats banner */}
                                                <View className="absolute bottom-0 left-0 right-0 bg-black/60 px-2 py-1 flex-row items-center justify-between">
                                                    <View className="flex-row items-center">
                                                        <Ionicons name="eye" size={9} color="#94a3b8" />
                                                        <Text className="text-[8px] font-extrabold text-slate-300 ml-1">
                                                            {item.viewsCount || 0}
                                                        </Text>
                                                    </View>
                                                    <View className="flex-row items-center ml-2">
                                                        <Ionicons name="heart" size={9} color="#ef4444" />
                                                        <Text className="text-[8px] font-extrabold text-slate-300 ml-1">
                                                            {item.likesCount || 0}
                                                        </Text>
                                                    </View>
                                                </View>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                </View>
                            )}

                            {/* Skills section (With Separate Edit Button) */}
                            <View className="gap-y-2.5">
                                <View className="flex-row justify-between items-center">
                                    <Text className="text-white font-extrabold text-base">Specialist Skills</Text>
                                    <TouchableOpacity
                                        onPress={() => setSkillsModalVisible(true)}
                                        className="bg-indigo-600/10 border border-indigo-500/20 px-3 py-1.5 rounded-xl flex-row items-center space-x-1 active:opacity-85"
                                    >
                                        <Ionicons name="pencil-sharp" size={12} color="#818cf8" />
                                        <Text className="text-indigo-400 font-bold text-xs ml-1">Edit Skills</Text>
                                    </TouchableOpacity>
                                </View>

                                {profile.skills?.length > 0 ? (
                                    <View className="flex-row flex-wrap gap-2">
                                        {profile.skills.map((skill, idx) => (
                                            <View
                                                key={idx}
                                                className="bg-indigo-500/10 border border-indigo-500/20 px-3.5 py-2 rounded-xl flex-row items-center"
                                            >
                                                <Ionicons name="sparkles-outline" size={10} color="#818cf8" style={{ marginRight: 6 }} />
                                                <Text className="text-indigo-300 text-xs font-bold">
                                                    {skill}
                                                </Text>
                                            </View>
                                        ))}
                                    </View>
                                ) : (
                                    <Text className="text-slate-500 text-xs italic pl-1">No skills added yet.</Text>
                                )}
                            </View>

                            {/* Service Categories */}
                            <View className="gap-y-2">
                                <View className="flex-row justify-between items-center mb-1">
                                    <Text className="text-white font-extrabold text-base">Service Categories</Text>
                                    <TouchableOpacity
                                        onPress={openCategoriesModal}
                                        className="bg-indigo-600/10 border border-indigo-500/20 px-3 py-1.5 rounded-xl flex-row items-center space-x-1 active:opacity-85"
                                    >
                                        <Ionicons name="pencil-sharp" size={12} color="#818cf8" />
                                        <Text className="text-indigo-400 font-bold text-xs ml-1">Edit</Text>
                                    </TouchableOpacity>
                                </View>
                                {profile.serviceCategories?.length > 0 ? (
                                    <View className="flex-row flex-wrap gap-2">
                                        {profile.serviceCategories.map((cat) => (
                                            <View
                                                key={cat._id}
                                                className="bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-2 rounded-xl flex-row items-center"
                                            >
                                                <Ionicons name="pricetag-outline" size={10} color="#10b981" style={{ marginRight: 6 }} />
                                                <Text className="text-emerald-300 text-xs font-bold">
                                                    {cat.name}
                                                </Text>
                                            </View>
                                        ))}
                                    </View>
                                ) : (
                                    <Text className="text-slate-500 text-xs italic pl-1">No categories selected.</Text>
                                )}
                            </View>

                            {/* Service Areas */}
                            <View className="gap-y-2">
                                <View className="flex-row justify-between items-center mb-1">
                                    <Text className="text-white font-extrabold text-base">Service Areas</Text>
                                    <TouchableOpacity
                                        onPress={() => setAreasModalVisible(true)}
                                        className="bg-indigo-600/10 border border-indigo-500/20 px-3 py-1.5 rounded-xl flex-row items-center space-x-1 active:opacity-85"
                                    >
                                        <Ionicons name="pencil-sharp" size={12} color="#818cf8" />
                                        <Text className="text-indigo-400 font-bold text-xs ml-1">Edit</Text>
                                    </TouchableOpacity>
                                </View>
                                {profile.serviceAreas?.length > 0 ? (
                                    <View className="bg-slate-900 border border-slate-800 rounded-2xl p-4 gap-y-3 shadow-sm">
                                        {profile.serviceAreas.map((area, idx) => (
                                            <View key={idx} className="flex-row items-center">
                                                <Ionicons name="navigate-outline" size={14} color="#6366f1" />
                                                <Text className="text-slate-300 text-xs font-semibold ml-3">
                                                    {area.area}, {area.city} ({area.state})
                                                </Text>
                                            </View>
                                        ))}
                                    </View>
                                ) : (
                                    <Text className="text-slate-500 text-xs italic pl-1">No service areas set yet.</Text>
                                )}
                            </View>

                            {/* Physical Address (Sync with Home Location + Change Icon Button) */}
                            <View className="gap-y-2">
                                <View className="flex-row justify-between items-center mb-1">
                                    <Text className="text-white font-extrabold text-base">Location Address</Text>
                                    <TouchableOpacity
                                        onPress={() => setLocationModalVisible(true)}
                                        className="bg-indigo-600/10 border border-indigo-500/20 px-3.5 py-1.5 rounded-xl flex-row items-center space-x-1.5 active:opacity-85"
                                    >
                                        <Ionicons name="location-outline" size={12} color="#818cf8" />
                                        <Text className="text-indigo-400 font-bold text-xs ml-1">Change Location</Text>
                                    </TouchableOpacity>
                                </View>
                                {profile.address ? (
                                    <View className="flex-row items-start bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
                                        <Ionicons name="location-outline" size={18} color="#94a3b8" style={{ marginTop: 2 }} />
                                        <Text className="text-slate-300 text-sm ml-3 flex-1 leading-relaxed">
                                            {profile.address}
                                        </Text>
                                    </View>
                                ) : (
                                    <Text className="text-slate-500 text-xs italic pl-1">No profile address set yet.</Text>
                                )}
                            </View>

                            {/* Reviews Section */}
                            <View className="gap-y-4 border-t border-slate-900 pt-6 mt-2">
                                <View>
                                    <Text className="text-white font-extrabold text-base">Reviews & Ratings</Text>
                                    <View className="flex-row items-center mt-1">
                                        <Ionicons name="star" size={14} color="#f59e0b" />
                                        <Text className="text-white text-xs font-bold ml-1">
                                            {profile.averageRating > 0 ? profile.averageRating.toFixed(1) : "New"}
                                        </Text>
                                        <Text className="text-slate-400 text-[10px] font-semibold ml-1.5">
                                            ({reviews.length} reviews received)
                                        </Text>
                                    </View>
                                </View>

                                {isReviewsLoading ? (
                                    <ActivityIndicator size="small" color="#6366f1" className="py-4" />
                                ) : reviews.length === 0 ? (
                                    <View className="bg-slate-900 border border-slate-800 rounded-xl p-4 items-center justify-center">
                                        <Ionicons name="chatbox-outline" size={24} color="#64748b" />
                                        <Text className="text-slate-400 text-xs mt-2 font-medium text-center">
                                            No reviews received yet.
                                        </Text>
                                    </View>
                                ) : (
                                    <View className="gap-y-3">
                                        {reviews.map((rev) => {
                                            const customer = rev.customerId || {};
                                            const custName = customer.fullName || "Customer";

                                            return (
                                                <View
                                                    key={rev._id}
                                                    className="bg-slate-900 border border-slate-800 rounded-xl p-4 gap-y-2 shadow-sm"
                                                >
                                                    <View className="flex-row justify-between items-start">
                                                        <View className="flex-row items-center">
                                                            <View className="w-8 h-8 rounded-full bg-slate-800 items-center justify-center border border-slate-700">
                                                                <Text className="text-white font-bold text-xs uppercase">
                                                                    {getInitials(custName)}
                                                                </Text>
                                                            </View>
                                                            <View className="ml-3">
                                                                <Text className="text-white font-bold text-sm">
                                                                    {custName}
                                                                </Text>
                                                                <Text className="text-slate-400 text-[10px] font-semibold mt-0.5">
                                                                    {new Date(rev.createdAt).toLocaleDateString()}
                                                                </Text>
                                                            </View>
                                                        </View>

                                                        <View className="flex-row items-center bg-slate-950 px-2 py-1 rounded-lg border border-slate-800">
                                                            <Text className="text-amber-400 text-xs font-bold mr-1">
                                                                {rev.rating}
                                                            </Text>
                                                            <Ionicons name="star" size={12} color="#f59e0b" />
                                                        </View>
                                                    </View>

                                                    {rev.reviewText ? (
                                                        <Text className="text-slate-300 text-xs mt-1 leading-relaxed">
                                                            {rev.reviewText}
                                                        </Text>
                                                    ) : null}
                                                </View>
                                            );
                                        })}
                                    </View>
                                )}
                            </View>
                        </>
                    )}

                    {/* Settings / App Actions Section */}
                    <Text className="text-slate-400 font-bold text-xs uppercase tracking-wider pl-1 mt-6">
                        Account Settings
                    </Text>

                    <View className="gap-y-3">
                        <TouchableOpacity
                            onPress={() => router.push("/edit-profile")}
                            className="flex-row items-center justify-between bg-slate-900 border border-slate-800 px-4 py-3.5 rounded-xl shadow-sm"
                        >
                            <View className="flex-row items-center">
                                <Ionicons name="create-outline" size={20} color="#6366f1" />
                                <Text className="text-slate-200 font-semibold text-sm ml-3">Edit Basic Profile</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={16} color="#64748b" />
                        </TouchableOpacity>

                        <TouchableOpacity className="flex-row items-center justify-between bg-slate-900 border border-slate-800 px-4 py-3.5 rounded-xl shadow-sm">
                            <View className="flex-row items-center">
                                <Ionicons name="help-circle-outline" size={20} color="#6366f1" />
                                <Text className="text-slate-200 font-semibold text-sm ml-3">Help & Support</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={16} color="#64748b" />
                        </TouchableOpacity>

                        {/* Sign Out Button */}
                        <TouchableOpacity
                            onPress={logout}
                            className="flex-row items-center justify-between bg-rose-500/10 border border-rose-500/20 px-4 py-3.5 rounded-xl mt-4 active:opacity-90"
                        >
                            <View className="flex-row items-center">
                                <Ionicons name="log-out-outline" size={20} color="#f43f5e" />
                                <Text className="text-rose-400 font-bold text-sm ml-3">Sign Out</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={16} color="#f43f5e" />
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>

            {/* ----------------------------------------------------
                MODAL EDITORS
               ---------------------------------------------------- */}

            {/* 1. Edit Info Modal (Profession, Experience, Whatsapp) */}
            <Modal
                animationType="fade"
                transparent={true}
                visible={infoModalVisible}
                onRequestClose={() => setInfoModalVisible(false)}
            >
                <View className="flex-1 bg-black/80 justify-center items-center px-6">
                    <View className="bg-slate-900 border border-slate-800 rounded-2xl w-full p-6 gap-y-4 shadow-2xl">
                        <View className="flex-row justify-between items-center">
                            <Text className="text-white font-extrabold text-lg">Professional Info</Text>
                            <TouchableOpacity onPress={() => setInfoModalVisible(false)} className="p-1">
                                <Ionicons name="close" size={24} color="#94a3b8" />
                            </TouchableOpacity>
                        </View>

                        <View className="gap-y-1.5">
                            <Text className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Profession Description</Text>
                            <TextInput
                                className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white text-sm"
                                placeholder="e.g. Electrician, Plumbing Expert"
                                placeholderTextColor="#64748b"
                                value={editProfession}
                                onChangeText={setEditProfession}
                            />
                        </View>

                        <View className="gap-y-1.5">
                            <Text className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Experience (Years)</Text>
                            <TextInput
                                className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white text-sm"
                                placeholder="e.g. 5"
                                placeholderTextColor="#64748b"
                                keyboardType="numeric"
                                value={editExperience}
                                onChangeText={setEditExperience}
                            />
                        </View>

                        <View className="gap-y-1.5">
                            <Text className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">WhatsApp Number</Text>
                            <TextInput
                                className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white text-sm"
                                placeholder="e.g. +91 9876543210"
                                placeholderTextColor="#64748b"
                                keyboardType="phone-pad"
                                value={editWhatsapp}
                                onChangeText={setEditWhatsapp}
                            />
                        </View>

                        <View className="flex-row gap-x-4 mt-2">
                            <TouchableOpacity
                                onPress={() => setInfoModalVisible(false)}
                                className="flex-1 bg-slate-800 py-3 rounded-xl items-center"
                            >
                                <Text className="text-slate-300 font-bold">Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={handleSaveInfo}
                                className="flex-1 bg-indigo-600 py-3 rounded-xl items-center"
                            >
                                <Text className="text-white font-bold">Save Changes</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* 2. Edit About Me Modal */}
            <Modal
                animationType="fade"
                transparent={true}
                visible={aboutModalVisible}
                onRequestClose={() => setAboutModalVisible(false)}
            >
                <View className="flex-1 bg-black/80 justify-center items-center px-6">
                    <View className="bg-slate-900 border border-slate-800 rounded-2xl w-full p-6 gap-y-4 shadow-2xl">
                        <View className="flex-row justify-between items-center">
                            <Text className="text-white font-extrabold text-lg">About Me Bio</Text>
                            <TouchableOpacity onPress={() => setAboutModalVisible(false)} className="p-1">
                                <Ionicons name="close" size={24} color="#94a3b8" />
                            </TouchableOpacity>
                        </View>

                        <View className="gap-y-1.5">
                            <Text className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Description</Text>
                            <TextInput
                                className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white text-sm min-h-[120]"
                                placeholder="Describe your services and specializations..."
                                placeholderTextColor="#64748b"
                                multiline
                                textAlignVertical="top"
                                value={editAboutText}
                                onChangeText={setEditAboutText}
                            />
                        </View>

                        <View className="flex-row gap-x-4 mt-2">
                            <TouchableOpacity
                                onPress={() => setAboutModalVisible(false)}
                                className="flex-1 bg-slate-800 py-3 rounded-xl items-center"
                            >
                                <Text className="text-slate-300 font-bold">Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={handleSaveAbout}
                                className="flex-1 bg-indigo-600 py-3 rounded-xl items-center"
                            >
                                <Text className="text-white font-bold">Save Bio</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* 3. Edit Skills Modal */}
            <Modal
                animationType="fade"
                transparent={true}
                visible={skillsModalVisible}
                onRequestClose={() => setSkillsModalVisible(false)}
            >
                <View className="flex-1 bg-black/80 justify-center items-center px-6">
                    <View className="bg-slate-900 border border-slate-800 rounded-2xl w-full p-6 gap-y-4 shadow-2xl">
                        <View className="flex-row justify-between items-center">
                            <Text className="text-white font-extrabold text-lg">Specialist Skills</Text>
                            <TouchableOpacity onPress={() => setSkillsModalVisible(false)} className="p-1">
                                <Ionicons name="close" size={24} color="#94a3b8" />
                            </TouchableOpacity>
                        </View>

                        <View className="flex-row space-x-2 items-center">
                            <TextInput
                                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white text-sm"
                                placeholder="Type a skill (e.g. Wiring)..."
                                placeholderTextColor="#64748b"
                                value={newSkillInput}
                                onChangeText={setNewSkillInput}
                                onSubmitEditing={handleAddSkill}
                            />
                            <TouchableOpacity
                                onPress={handleAddSkill}
                                className="bg-indigo-600 px-4 py-3 rounded-xl active:opacity-85"
                            >
                                <Text className="text-white font-bold text-xs">Add</Text>
                            </TouchableOpacity>
                        </View>

                        <Text className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-2">Current Skills List</Text>
                        <ScrollView className="max-h-[160]">
                            <View className="flex-row flex-wrap gap-2 py-1">
                                {editSkillsList.length === 0 ? (
                                    <Text className="text-slate-500 text-xs italic pl-1">No skills added yet. Add skills above.</Text>
                                ) : (
                                    editSkillsList.map((skill, idx) => (
                                        <View
                                            key={idx}
                                            className="bg-indigo-500/10 border border-indigo-500/20 px-3 py-1.5 rounded-xl flex-row items-center"
                                        >
                                            <Text className="text-indigo-300 text-xs font-bold mr-1.5">{skill}</Text>
                                            <TouchableOpacity onPress={() => handleRemoveSkill(skill)}>
                                                <Ionicons name="close-circle" size={14} color="#f43f5e" />
                                            </TouchableOpacity>
                                        </View>
                                    ))
                                )}
                            </View>
                        </ScrollView>

                        <View className="flex-row gap-x-4 mt-2">
                            <TouchableOpacity
                                onPress={() => setSkillsModalVisible(false)}
                                className="flex-1 bg-slate-800 py-3 rounded-xl items-center"
                            >
                                <Text className="text-slate-300 font-bold">Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={handleSaveSkills}
                                className="flex-1 bg-indigo-600 py-3 rounded-xl items-center"
                            >
                                <Text className="text-white font-bold">Save Skills</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* 4. Edit Categories Modal */}
            <Modal
                animationType="fade"
                transparent={true}
                visible={categoriesModalVisible}
                onRequestClose={() => setCategoriesModalVisible(false)}
            >
                <View className="flex-1 bg-black/80 justify-center items-center px-6">
                    <View className="bg-slate-900 border border-slate-800 rounded-2xl w-full p-6 gap-y-4 shadow-2xl max-h-[85%]">
                        <View className="flex-row justify-between items-center">
                            <Text className="text-white font-extrabold text-lg">Service Categories</Text>
                            <TouchableOpacity onPress={() => setCategoriesModalVisible(false)} className="p-1">
                                <Ionicons name="close" size={24} color="#94a3b8" />
                            </TouchableOpacity>
                        </View>

                        {isLoadingCategories ? (
                            <ActivityIndicator size="small" color="#6366f1" className="py-8" />
                        ) : (
                            <ScrollView className="flex-grow-0 max-h-[300]">
                                {availableCategories.map((cat) => (
                                    <TouchableOpacity
                                        key={cat._id}
                                        onPress={() => handleToggleCategory(cat._id)}
                                        className={`flex-row items-center justify-between p-3.5 rounded-xl border mb-2 active:opacity-85 ${editSelectedCategories.includes(cat._id)
                                                ? "bg-indigo-500/10 border-indigo-500"
                                                : "bg-slate-950 border-slate-800"
                                            }`}
                                    >
                                        <Text className="text-white text-sm font-semibold">{cat.name}</Text>
                                        <Ionicons
                                            name={editSelectedCategories.includes(cat._id) ? "checkbox" : "square-outline"}
                                            size={20}
                                            color={editSelectedCategories.includes(cat._id) ? "#6366f1" : "#64748b"}
                                        />
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        )}

                        <View className="flex-row gap-x-4 mt-2">
                            <TouchableOpacity
                                onPress={() => setCategoriesModalVisible(false)}
                                className="flex-1 bg-slate-800 py-3 rounded-xl items-center"
                            >
                                <Text className="text-slate-300 font-bold">Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={handleSaveCategories}
                                className="flex-1 bg-indigo-600 py-3 rounded-xl items-center"
                            >
                                <Text className="text-white font-bold">Save Categories</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* 5. Edit Service Areas Modal */}
            <Modal
                animationType="fade"
                transparent={true}
                visible={areasModalVisible}
                onRequestClose={() => setAreasModalVisible(false)}
            >
                <View className="flex-1 bg-black/80 justify-center items-center px-6">
                    <View className="bg-slate-900 border border-slate-800 rounded-2xl w-full p-6 gap-y-4 shadow-2xl">
                        <View className="flex-row justify-between items-center">
                            <Text className="text-white font-extrabold text-lg">Service Areas</Text>
                            <TouchableOpacity onPress={() => setAreasModalVisible(false)} className="p-1">
                                <Ionicons name="close" size={24} color="#94a3b8" />
                            </TouchableOpacity>
                        </View>

                        <View className="gap-y-1.5">
                            <Text className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Area Name</Text>
                            <TextInput
                                className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white text-sm"
                                placeholder="e.g. Model Town"
                                placeholderTextColor="#64748b"
                                value={editArea}
                                onChangeText={setEditArea}
                            />
                        </View>

                        <View className="gap-y-1.5">
                            <Text className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">City</Text>
                            <TextInput
                                className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white text-sm"
                                placeholder="e.g. Ambala"
                                placeholderTextColor="#64748b"
                                value={editCity}
                                onChangeText={setEditCity}
                            />
                        </View>

                        <View className="gap-y-1.5">
                            <Text className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">State</Text>
                            <TextInput
                                className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white text-sm"
                                placeholder="e.g. Haryana"
                                placeholderTextColor="#64748b"
                                value={editState}
                                onChangeText={setEditState}
                            />
                        </View>

                        <View className="flex-row gap-x-4 mt-2">
                            <TouchableOpacity
                                onPress={() => setAreasModalVisible(false)}
                                className="flex-1 bg-slate-800 py-3 rounded-xl items-center"
                            >
                                <Text className="text-slate-300 font-bold">Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={handleSaveAreas}
                                className="flex-1 bg-indigo-600 py-3 rounded-xl items-center"
                            >
                                <Text className="text-white font-bold">Save Areas</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* 6. Edit Location Modal (Autocomplete Suggestions + GPS) */}
            <Modal
                animationType="fade"
                transparent={true}
                visible={locationModalVisible}
                onRequestClose={() => setLocationModalVisible(false)}
            >
                <View className="flex-1 bg-black/85 justify-center items-center px-6">
                    <View className="bg-slate-900 border border-slate-800 rounded-2xl w-full p-6 gap-y-4 shadow-2xl">
                        <View className="flex-row justify-between items-center">
                            <Text className="text-white font-extrabold text-lg">Change Location Address</Text>
                            <TouchableOpacity onPress={() => setLocationModalVisible(false)} className="p-1">
                                <Ionicons name="close" size={24} color="#94a3b8" />
                            </TouchableOpacity>
                        </View>

                        {/* GPS Auto Detect Option */}
                        <TouchableOpacity
                            onPress={handleGPSDetect}
                            disabled={isDetectingLoc}
                            className="bg-indigo-600 py-3 rounded-xl flex-row items-center justify-center space-x-2 active:opacity-90"
                        >
                            {isDetectingLoc ? (
                                <ActivityIndicator size="small" color="white" />
                            ) : (
                                <>
                                    <Ionicons name="locate" size={18} color="white" />
                                    <Text className="text-white font-bold text-sm ml-1">Auto Detect Location</Text>
                                </>
                            )}
                        </TouchableOpacity>

                        <View className="flex-row items-center my-1">
                            <View className="flex-grow h-[1] bg-slate-800" />
                            <Text className="text-slate-500 text-[10px] uppercase font-bold px-3">or search manually</Text>
                            <View className="flex-grow h-[1] bg-slate-800" />
                        </View>

                        {/* Text Search Field */}
                        <View className="relative">
                            <TextInput
                                className="bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-white text-sm"
                                placeholder="Search town, city or region..."
                                placeholderTextColor="#64748b"
                                value={locSearchQuery}
                                onChangeText={handleSearchLocation}
                            />
                            <View className="absolute left-3 top-3.5">
                                <Ionicons name="search-outline" size={16} color="#64748b" />
                            </View>
                        </View>

                        {/* Search Autocomplete suggestions list */}
                        {isSearchingLoc ? (
                            <ActivityIndicator size="small" color="#6366f1" className="py-2" />
                        ) : (
                            locSuggestions.length > 0 && (
                                <View className="bg-slate-950 border border-slate-800 rounded-xl mt-1 max-h-[160] overflow-hidden shadow-inner">
                                    <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled">
                                        {locSuggestions.map((item) => (
                                            <TouchableOpacity
                                                key={item.id}
                                                onPress={() => handleSaveLocation(item)}
                                                className="px-4 py-3 border-b border-slate-900 active:bg-slate-900 flex-row items-center"
                                            >
                                                <Ionicons name="location-outline" size={14} color="#6366f1" style={{ marginRight: 8 }} />
                                                <Text className="text-white text-xs leading-relaxed flex-grow" numberOfLines={2}>
                                                    {item.address}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                </View>
                            )
                        )}

                        <View className="flex-row gap-x-4 mt-2">
                            <TouchableOpacity
                                onPress={() => setLocationModalVisible(false)}
                                className="flex-1 bg-slate-800 py-3 rounded-xl items-center"
                            >
                                <Text className="text-slate-300 font-bold">Cancel</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

// ----------------------------------------------------
// CUSTOMER PROFILE VIEW
// ----------------------------------------------------
function CustomerProfileTab({ user, logout, router }) {
    const getInitials = (name) => {
        if (!name) return "U";
        return name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);
    };

    return (
        <SafeAreaView className="flex-1 bg-slate-950" edges={["bottom"]}>
            <StatusBar barStyle="light-content" />
            <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
                {/* Profile Header Card */}
                <View className="items-center py-8 bg-slate-900 border-b border-slate-800">
                    <View className="w-24 h-24 bg-indigo-600 rounded-full items-center justify-center border-4 border-slate-800 shadow-xl shadow-indigo-500/20 mb-4">
                        <Text className="text-white text-3xl font-black">
                            {getInitials(user?.fullName)}
                        </Text>
                    </View>
                    <Text className="text-2xl font-extrabold text-white">
                        {user?.fullName || "User Name"}
                    </Text>
                    <Text className="text-slate-400 text-sm mt-1">{user?.email}</Text>

                    {/* Role Badge */}
                    <View className="mt-3 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 rounded-full flex-row items-center space-x-1.5">
                        <Ionicons name="shield-checkmark" size={14} color="#818cf8" />
                        <Text className="text-indigo-400 text-xs font-bold uppercase tracking-wider ml-1">
                            {user?.role || "Customer"}
                        </Text>
                    </View>
                </View>

                {/* Account Details list */}
                <View className="px-5 mt-6 gap-y-4">
                    <Text className="text-slate-400 font-bold text-xs uppercase tracking-wider pl-1">
                        Account Details
                    </Text>

                    <View className="bg-slate-900 rounded-2xl border border-slate-800 p-4 gap-y-4 shadow-sm">
                        <View className="flex-row items-center justify-between pb-3 border-b border-slate-800/80">
                            <View className="flex-row items-center">
                                <Ionicons name="call-outline" size={20} color="#94a3b8" />
                                <Text className="text-slate-300 font-semibold text-sm ml-3">Phone Number</Text>
                            </View>
                            <Text className="text-white font-medium text-sm">
                                {user?.phoneNumber || "N/A"}
                            </Text>
                        </View>

                        <View className="flex-row items-center justify-between pb-3 border-b border-slate-800/80">
                            <View className="flex-row items-center">
                                <Ionicons name="calendar-outline" size={20} color="#94a3b8" />
                                <Text className="text-slate-300 font-semibold text-sm ml-3">Joined On</Text>
                            </View>
                            <Text className="text-white font-medium text-sm">
                                {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : "N/A"}
                            </Text>
                        </View>

                        <View className="flex-row items-center justify-between">
                            <View className="flex-row items-center">
                                <Ionicons name="shield-outline" size={20} color="#94a3b8" />
                                <Text className="text-slate-300 font-semibold text-sm ml-3">Status</Text>
                            </View>
                            <Text className="text-emerald-400 font-bold text-sm">
                                {user?.isActive ? "Active" : "Inactive"}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Settings list */}
                <View className="px-5 mt-6 gap-y-3">
                    <Text className="text-slate-400 font-bold text-xs uppercase tracking-wider pl-1">
                        Settings
                    </Text>

                    <TouchableOpacity
                        onPress={() => router.push("/edit-profile")}
                        className="flex-row items-center justify-between bg-slate-900 border border-slate-800 px-4 py-3.5 rounded-xl shadow-sm"
                    >
                        <View className="flex-row items-center">
                            <Ionicons name="create-outline" size={20} color="#6366f1" />
                            <Text className="text-slate-200 font-semibold text-sm ml-3">Edit Profile</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color="#64748b" />
                    </TouchableOpacity>

                    <TouchableOpacity className="flex-row items-center justify-between bg-slate-900 border border-slate-800 px-4 py-3.5 rounded-xl shadow-sm">
                        <View className="flex-row items-center">
                            <Ionicons name="help-circle-outline" size={20} color="#6366f1" />
                            <Text className="text-slate-200 font-semibold text-sm ml-3">Help & Support</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color="#64748b" />
                    </TouchableOpacity>

                    {/* Sign Out Button */}
                    <TouchableOpacity
                        onPress={logout}
                        className="flex-row items-center justify-between bg-rose-500/10 border border-rose-500/20 px-4 py-3.5 rounded-xl mt-4 active:opacity-90"
                    >
                        <View className="flex-row items-center">
                            <Ionicons name="log-out-outline" size={20} color="#f43f5e" />
                            <Text className="text-rose-400 font-bold text-sm ml-3">Sign Out</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color="#f43f5e" />
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
