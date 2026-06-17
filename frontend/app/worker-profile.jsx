import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    StatusBar,
    Image,
    Linking,
    Alert,
    TextInput
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";
import api from "../src/services/api";
import useAuthStore from "../src/store/useAuthStore";

export default function WorkerProfileScreen() {
    const router = useRouter();
    const { workerId } = useLocalSearchParams();
    const { user } = useAuthStore();
    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === "dark";

    const [profile, setProfile] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // Reviews states
    const [reviews, setReviews] = useState([]);
    const [isReviewsLoading, setIsReviewsLoading] = useState(true);
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [userRating, setUserRating] = useState(5);
    const [reviewText, setReviewText] = useState("");
    const [isSubmittingReview, setIsSubmittingReview] = useState(false);

    // Favorites states
    const [isFavorited, setIsFavorited] = useState(false);

    // Gallery state
    const [gallery, setGallery] = useState([]);

    // Report states
    const [showReportModal, setShowReportModal] = useState(false);
    const [reportReason, setReportReason] = useState("");
    const [isSubmittingReport, setIsSubmittingReport] = useState(false);

    const fetchReviews = async () => {
        try {
            const response = await api.get(`/api/reviews/worker/${workerId}`);
            if (response.data.success) {
                setReviews(response.data.data);
            }
        } catch (err) {
            console.error("Error fetching reviews:", err);
        } finally {
            setIsReviewsLoading(false);
        }
    };

    const checkFavoriteStatus = async () => {
        try {
            if (user) {
                const response = await api.get(`/api/favorites/check/${workerId}`);
                if (response.data.success) {
                    setIsFavorited(response.data.isFavorited);
                }
            }
        } catch (err) {
            console.error("Error checking favorite status:", err);
        }
    };

    const fetchGallery = async () => {
        try {
            const response = await api.get(`/api/gallery/worker/${workerId}`);
            if (response.data.success) {
                setGallery(response.data.data || []);
            }
        } catch (err) {
            console.error("Error loading profile gallery:", err);
        }
    };

    useEffect(() => {
        const fetchProfile = async () => {
            setIsLoading(true);
            try {
                const response = await api.get(`/api/workers/${workerId}`);
                if (response.data.success) {
                    setProfile(response.data.data);
                } else {
                    setError("Failed to retrieve profile");
                }
            } catch (err) {
                console.error("Error fetching worker profile:", err);
                setError("Failed to load professional profile");
            } finally {
                setIsLoading(false);
            }
        };

        if (workerId) {
            fetchProfile();
            fetchReviews();
            checkFavoriteStatus();
            fetchGallery();
        }
    }, [workerId]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleToggleFavorite = async () => {
        if (!user) {
            Alert.alert("Authentication Required", "Please log in to save specialists.");
            return;
        }

        try {
            const response = await api.post("/api/favorites/toggle", { workerId });
            if (response.data.success) {
                setIsFavorited(response.data.isFavorited);
                // Dynamically update totalFavorites counter locally
                setProfile((prev) => {
                    if (!prev) return null;
                    const increment = response.data.isFavorited ? 1 : -1;
                    return {
                        ...prev,
                        totalFavorites: Math.max(0, (prev.totalFavorites || 0) + increment)
                    };
                });
            }
        } catch (err) {
            console.error("Error toggling favorite:", err);
            Alert.alert("Error", "Failed to update saved status");
        }
    };

    const handleSubmitReview = async () => {
        if (!userRating) {
            Alert.alert("Error", "Please select a rating star");
            return;
        }

        setIsSubmittingReview(true);
        try {
            const response = await api.post("/api/reviews", {
                workerId,
                rating: userRating,
                reviewText: reviewText.trim()
            });

            if (response.data.success) {
                Alert.alert("Success", "Your review has been submitted!");
                setReviewText("");
                setUserRating(5);
                setShowReviewModal(false);

                // Refresh profile stats and reviews list
                const profRes = await api.get(`/api/workers/${workerId}`);
                if (profRes.data.success) {
                    setProfile(profRes.data.data);
                }
                const revRes = await api.get(`/api/reviews/worker/${workerId}`);
                if (revRes.data.success) {
                    setReviews(revRes.data.data);
                }
            }
        } catch (err) {
            console.error("Submit review error:", err);
            const msg = err.response?.data?.message || "Failed to connect to review service";
            Alert.alert("Error", msg);
        } finally {
            setIsSubmittingReview(false);
        }
    };

    const handleDeleteReview = (reviewId) => {
        Alert.alert(
            "Delete Review",
            "Are you sure you want to delete your review?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            const response = await api.delete(`/api/reviews/${reviewId}`);
                            if (response.data.success) {
                                Alert.alert("Success", "Review deleted successfully!");

                                // Refresh stats and list
                                const profRes = await api.get(`/api/workers/${workerId}`);
                                if (profRes.data.success) {
                                    setProfile(profRes.data.data);
                                }
                                const revRes = await api.get(`/api/reviews/worker/${workerId}`);
                                if (revRes.data.success) {
                                    setReviews(revRes.data.data);
                                }
                            }
                        } catch (err) {
                            console.error("Delete review error:", err);
                            const msg = err.response?.data?.message || "Failed to delete review";
                            Alert.alert("Error", msg);
                        }
                    }
                }
            ]
        );
    };

    const handleWhatsApp = () => {
        if (!profile?.whatsappNumber) {
            Alert.alert("Error", "This professional hasn't provided a WhatsApp number.");
            return;
        }

        // Log contact click to backend (non-blocking)
        if (user) {
            api.post("/api/extensions/contacts", {
                workerId,
                contactType: "whatsapp"
            }).catch((err) => console.error("Error logging contact lead:", err));
        }

        // Clean number
        let phoneNum = profile.whatsappNumber.replace(/[^0-9+]/g, "");
        const url = `https://wa.me/${phoneNum}`;
        Linking.canOpenURL(url)
            .then((supported) => {
                if (supported) {
                    Linking.openURL(url);
                } else {
                    Alert.alert("Error", "WhatsApp is not installed on your device.");
                }
            })
            .catch(() => {
                Alert.alert("Error", "Failed to open WhatsApp.");
            });
    };

    const handleSubmitReport = async () => {
        if (!reportReason) {
            Alert.alert("Error", "Please select a reason for reporting");
            return;
        }

        setIsSubmittingReport(true);
        try {
            const response = await api.post("/api/extensions/reports", {
                workerId,
                reason: reportReason
            });
            if (response.data.success) {
                Alert.alert("Report Submitted", "Thank you. Administrators will review this profile.");
                setShowReportModal(false);
                setReportReason("");
            }
        } catch (err) {
            console.error("Submit report error:", err);
            const msg = err.response?.data?.message || "Failed to submit report";
            Alert.alert("Error", msg);
        } finally {
            setIsSubmittingReport(false);
        }
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

    if (isLoading) {
        return (
            <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950 justify-center items-center">
                <ActivityIndicator size="large" color="#6366f1" />
            </SafeAreaView>
        );
    }

    if (error || !profile) {
        return (
            <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950 justify-center items-center px-6">
                <Ionicons name="alert-circle-outline" size={48} color="#f43f5e" />
                <Text className="text-slate-900 dark:text-white text-base font-bold mt-4 text-center">
                    {error || "Profile not found"}
                </Text>
                <TouchableOpacity
                    onPress={() => router.canGoBack() ? router.back() : router.replace("/(tabs)/Home")}
                    className="mt-6 bg-indigo-600 px-6 py-3 rounded-xl"
                >
                    <Text className="text-white font-bold">Go Back</Text>
                </TouchableOpacity>
            </SafeAreaView>
        );
    }

    const userDetails = profile.userId || {};
    const fullName = userDetails.fullName || "Service Professional";
    const profileImage = userDetails.profileImage || "";

    return (
        <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950" edges={["top", "left", "right"]}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

            {/* Sticky Header */}
            <View className="flex-row items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-900 bg-white dark:bg-slate-950">
                <TouchableOpacity
                    onPress={() => router.canGoBack() ? router.back() : router.replace("/(tabs)/Home")}
                    className="w-10 h-10 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full items-center justify-center"
                >
                    <Ionicons name="arrow-back" size={20} color={isDark ? "white" : "#0f172a"} />
                </TouchableOpacity>
                <Text className="text-lg font-bold text-slate-900 dark:text-white">Professional Profile</Text>
                <View className="flex-row items-center">
                    {/* Flag / Report Profile Button */}
                    {user && profile.userId?._id !== user._id && (
                        <TouchableOpacity
                            onPress={() => setShowReportModal(true)}
                            className="w-10 h-10 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full items-center justify-center mr-2 active:opacity-80"
                        >
                            <Ionicons name="flag-outline" size={16} color={isDark ? "#94a3b8" : "#64748b"} />
                        </TouchableOpacity>
                    )}

                    {/* Heart Bookmarks Button */}
                    <TouchableOpacity
                        onPress={handleToggleFavorite}
                        className="w-10 h-10 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full items-center justify-center active:opacity-80"
                    >
                        <Ionicons
                            name={isFavorited ? "heart" : "heart-outline"}
                            size={20}
                            color={isFavorited ? "#ef4444" : (isDark ? "white" : "#0f172a")}
                        />
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
                {/* Hero Avatar Card */}
                <View className="items-center py-6 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                    <View className="p-1 bg-slate-100 dark:bg-slate-800/85 rounded-2xl border border-slate-200 dark:border-slate-700/50 relative">
                        {profileImage ? (
                            <Image
                                source={{ uri: profileImage }}
                                className="w-24 h-24 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                            />
                        ) : (
                            <View className="w-24 h-24 bg-indigo-600 rounded-2xl items-center justify-center border border-slate-200 dark:border-slate-700 shadow-xl shadow-indigo-500/20">
                                <Text className="text-white text-3xl font-black">
                                    {getInitials(fullName)}
                                </Text>
                            </View>
                        )}
                        {profile.isVerified && (
                            <View className="absolute bottom-[-6] right-[-6] bg-indigo-500 rounded-full p-1 border-2 border-white dark:border-slate-900">
                                <Ionicons name="checkmark" size={16} color="white" />
                            </View>
                        )}
                    </View>

                    <Text className="text-2xl font-extrabold text-slate-900 dark:text-white mt-4">{fullName}</Text>
                    <Text className="text-slate-500 dark:text-slate-400 text-sm font-semibold mt-1">
                        {profile.profession}
                    </Text>

                    {/* Quick Stats Grid */}
                    <View className="flex-row justify-around w-full mt-6 px-4">
                        <View className="items-center flex-1">
                            <Ionicons name="briefcase-outline" size={16} color="#6366f1" />
                            <Text className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">
                                Experience
                            </Text>
                            <Text className="text-slate-900 dark:text-white font-extrabold text-base mt-0.5">
                                {profile.experienceYears} Years
                            </Text>
                        </View>

                        <View className="w-[1] h-8 bg-slate-200 dark:bg-slate-800 self-center" />

                        <View className="items-center flex-1">
                            <Ionicons name="star" size={16} color="#f59e0b" />
                            <Text className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">
                                Rating
                            </Text>
                            <Text className="text-slate-900 dark:text-white font-extrabold text-base mt-0.5">
                                {profile.averageRating > 0 ? profile.averageRating.toFixed(1) : "New"}
                            </Text>
                        </View>

                        <View className="w-[1] h-8 bg-slate-200 dark:bg-slate-800 self-center" />

                        <View className="items-center flex-1">
                            <Ionicons name="eye-outline" size={16} color="#10b981" />
                            <Text className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">
                                Views
                            </Text>
                            <Text className="text-slate-900 dark:text-white font-extrabold text-base mt-0.5">
                                {profile.profileViews || 0}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Profile Details content */}
                <View className="px-5 py-6 gap-y-6">
                    {/* About section */}
                    <View className="gap-y-2">
                        <Text className="text-slate-900 dark:text-white font-extrabold text-base">About Me</Text>
                        <View className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 border-l-4 border-l-indigo-500">
                            <Text className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed">
                                {profile.about || "This professional hasn't written a bio yet."}
                            </Text>
                        </View>
                    </View>

                    {/* Projects Gallery Portfolio section */}
                    {gallery && gallery.length > 0 && (
                        <View className="gap-y-3">
                            <Text className="text-slate-900 dark:text-white font-extrabold text-base">Completed Projects ({gallery.length})</Text>
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
                                        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden mr-3.5 relative"
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

                    {/* Skills section */}
                    {profile.skills?.length > 0 && (
                        <View className="gap-y-2">
                            <Text className="text-slate-900 dark:text-white font-extrabold text-base">Specialist Skills</Text>
                            <View className="flex-row flex-wrap gap-2">
                                {profile.skills.map((skill, idx) => (
                                    <View
                                        key={idx}
                                        className="bg-indigo-500/10 dark:bg-indigo-500/10 border border-indigo-500/20 dark:border-indigo-500/20 px-3.5 py-2 rounded-xl flex-row items-center"
                                    >
                                        <Ionicons name="sparkles-outline" size={10} color="#6366f1" style={{ marginRight: 6 }} />
                                        <Text className="text-indigo-600 dark:text-indigo-300 text-xs font-bold">
                                            {skill}
                                        </Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                    )}

                    {/* Service Categories */}
                    {profile.serviceCategories?.length > 0 && (
                        <View className="gap-y-2">
                            <Text className="text-slate-900 dark:text-white font-extrabold text-base">Service Categories</Text>
                            <View className="flex-row flex-wrap gap-2">
                                {profile.serviceCategories.map((cat) => (
                                    <View
                                        key={cat._id}
                                        className="bg-emerald-500/10 dark:bg-emerald-500/10 border border-emerald-500/20 dark:border-emerald-500/20 px-3.5 py-2 rounded-xl flex-row items-center"
                                    >
                                        <Ionicons name="pricetag-outline" size={10} color="#10b981" style={{ marginRight: 6 }} />
                                        <Text className="text-emerald-600 dark:text-emerald-300 text-xs font-bold">
                                            {cat.name}
                                        </Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                    )}

                    {/* Service Areas */}
                    {profile.serviceAreas?.length > 0 && (
                        <View className="gap-y-2">
                            <Text className="text-slate-900 dark:text-white font-extrabold text-base">Service Areas</Text>
                            <View className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 gap-y-3 shadow-sm">
                                {profile.serviceAreas.map((area, idx) => (
                                    <View key={idx} className="flex-row items-center">
                                        <Ionicons name="navigate-outline" size={14} color="#6366f1" />
                                        <Text className="text-slate-700 dark:text-slate-300 text-xs font-semibold ml-3">
                                            {area.area}, {area.city} ({area.state})
                                        </Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                    )}

                    {/* Physical Address */}
                    {!!profile.address && (
                        <View className="gap-y-2">
                            <Text className="text-slate-900 dark:text-white font-extrabold text-base">Location Address</Text>
                            <View className="flex-row items-start bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
                                <Ionicons name="location-outline" size={18} color="#64748b" style={{ marginTop: 2 }} />
                                <Text className="text-slate-700 dark:text-slate-300 text-sm ml-3 flex-1 leading-relaxed">
                                    {profile.address}
                                </Text>
                            </View>
                        </View>
                    )}

                    {/* Customer Reviews Section */}
                    <View className="gap-y-4 border-t border-slate-200 dark:border-slate-900 pt-6 mt-2">
                        <View className="flex-row justify-between items-center">
                            <View>
                                <Text className="text-slate-900 dark:text-white font-extrabold text-base">Reviews & Ratings</Text>
                                <View className="flex-row items-center mt-1">
                                    <Ionicons name="star" size={14} color="#f59e0b" />
                                    <Text className="text-slate-900 dark:text-white text-xs font-bold ml-1">
                                        {profile.averageRating > 0 ? profile.averageRating.toFixed(1) : "New"}
                                    </Text>
                                    <Text className="text-slate-500 dark:text-slate-400 text-[10px] font-semibold ml-1">
                                        ({reviews.length} reviews)
                                    </Text>
                                </View>
                            </View>

                            {/* Write Review Button */}
                            {user && user.role === "customer" && profile.userId?._id !== user._id && !reviews.some(r => r.customerId?._id === user._id || r.customerId === user._id) && (
                                <TouchableOpacity
                                    onPress={() => setShowReviewModal(true)}
                                    className="bg-indigo-600 px-3 py-2 rounded-xl flex-row items-center space-x-1"
                                >
                                    <Ionicons name="create-outline" size={14} color="white" />
                                    <Text className="text-white font-bold text-xs">Write Review</Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        {isReviewsLoading ? (
                            <ActivityIndicator size="small" color="#6366f1" className="py-4" />
                        ) : reviews.length === 0 ? (
                            <View className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 items-center justify-center">
                                <Ionicons name="chatbox-outline" size={24} color="#64748b" />
                                <Text className="text-slate-500 dark:text-slate-400 text-xs mt-2 font-medium text-center">
                                    No reviews yet. Be the first to share your experience!
                                </Text>
                            </View>
                        ) : (
                            <View className="gap-y-3">
                                {reviews.map((rev) => {
                                    const customer = rev.customerId || {};
                                    const custName = customer.fullName || "Customer";
                                    const isAuthor = user && (customer._id === user._id || rev.customerId === user._id);

                                    return (
                                        <View
                                            key={rev._id}
                                            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 gap-y-2"
                                        >
                                            <View className="flex-row justify-between items-start">
                                                <View className="flex-row items-center">
                                                    <View className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 items-center justify-center border border-slate-200 dark:border-slate-700">
                                                        <Text className="text-slate-800 dark:text-white font-bold text-xs uppercase">
                                                            {getInitials(custName)}
                                                        </Text>
                                                    </View>
                                                    <View className="ml-3">
                                                        <Text className="text-slate-900 dark:text-white font-bold text-sm">
                                                            {custName}
                                                        </Text>
                                                        <Text className="text-slate-500 dark:text-slate-400 text-[10px] font-semibold mt-0.5">
                                                            {new Date(rev.createdAt).toLocaleDateString()}
                                                        </Text>
                                                    </View>
                                                </View>

                                                <View className="flex-row items-center space-x-2">
                                                    <View className="flex-row items-center bg-slate-50 dark:bg-slate-950 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-800">
                                                        <Text className="text-amber-400 text-xs font-bold mr-1">
                                                            {rev.rating}
                                                        </Text>
                                                        <Ionicons name="star" size={12} color="#f59e0b" />
                                                    </View>

                                                    {isAuthor && (
                                                        <TouchableOpacity
                                                            onPress={() => handleDeleteReview(rev._id)}
                                                            className="w-7 h-7 bg-rose-500/10 border border-rose-500/20 rounded-full items-center justify-center ml-1"
                                                        >
                                                            <Ionicons name="trash-outline" size={12} color="#f43f5e" />
                                                        </TouchableOpacity>
                                                    )}
                                                </View>
                                            </View>

                                            {rev.reviewText ? (
                                                <Text className="text-slate-700 dark:text-slate-300 text-xs mt-1 leading-relaxed">
                                                    {rev.reviewText}
                                                </Text>
                                            ) : null}
                                        </View>
                                    );
                                })}
                            </View>
                        )}
                    </View>
                </View>
            </ScrollView>

            {/* Action Footer */}
            <View className="p-5 border-t border-slate-200 dark:border-slate-900 bg-white dark:bg-slate-950 flex-row space-x-4">
                <TouchableOpacity
                    onPress={handleWhatsApp}
                    className="flex-1 bg-indigo-600 flex-row items-center justify-center py-4 rounded-xl space-x-2 shadow-lg shadow-indigo-500/20 active:opacity-90"
                >
                    <Ionicons name="logo-whatsapp" size={20} color="white" />
                    <Text className="text-white font-bold text-base ml-2">Contact Professional</Text>
                </TouchableOpacity>
            </View>

            {/* Write Review Modal / Overlay Drawer */}
            {showReviewModal && (
                <View className="absolute inset-0 bg-black/70 justify-center items-center px-6 z-50">
                    <View className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full p-6 gap-y-4 shadow-2xl">
                        <View className="flex-row justify-between items-center">
                            <Text className="text-slate-900 dark:text-white font-extrabold text-lg">Write a Review</Text>
                            <TouchableOpacity onPress={() => setShowReviewModal(false)} className="p-1">
                                <Ionicons name="close" size={24} color="#94a3b8" />
                            </TouchableOpacity>
                        </View>

                        {/* Star Rating Selectors */}
                        <View className="items-center py-2">
                            <Text className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-2">Tap stars to rate</Text>
                            <View className="flex-row gap-x-2">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <TouchableOpacity
                                        key={star}
                                        onPress={() => setUserRating(star)}
                                        className="p-1"
                                    >
                                        <Ionicons
                                            name={star <= userRating ? "star" : "star-outline"}
                                            size={36}
                                            color="#f59e0b"
                                        />
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        {/* Review Comment Input */}
                        <View className="gap-y-1.5">
                            <Text className="text-slate-700 dark:text-slate-300 font-semibold text-sm">Your Experience (Optional)</Text>
                            <TextInput
                                className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-800 dark:text-white text-sm min-h-[100]"
                                placeholder="Tell us what you liked or how they can improve..."
                                placeholderTextColor="#64748b"
                                multiline
                                textAlignVertical="top"
                                value={reviewText}
                                onChangeText={setReviewText}
                            />
                        </View>

                        {/* Action Buttons */}
                        <View className="flex-row gap-x-4 mt-2">
                            <TouchableOpacity
                                onPress={() => setShowReviewModal(false)}
                                className="flex-1 bg-slate-100 dark:bg-slate-800 py-3 rounded-xl items-center"
                            >
                                <Text className="text-slate-600 dark:text-slate-300 font-bold">Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={handleSubmitReview}
                                disabled={isSubmittingReview}
                                className="flex-1 bg-indigo-600 py-3 rounded-xl items-center justify-center"
                            >
                                {isSubmittingReview ? (
                                    <ActivityIndicator size="small" color="white" />
                                ) : (
                                    <Text className="text-white font-bold">Submit</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            )}

            {/* Report Profile Modal */}
            {showReportModal && (
                <View className="absolute inset-0 bg-black/70 justify-center items-center px-6 z-50">
                    <View className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full p-6 gap-y-4 shadow-2xl">
                        <View className="flex-row justify-between items-center">
                            <Text className="text-slate-900 dark:text-white font-extrabold text-lg">Report Profile</Text>
                            <TouchableOpacity onPress={() => setShowReportModal(false)} className="p-1">
                                <Ionicons name="close" size={24} color="#94a3b8" />
                            </TouchableOpacity>
                        </View>

                        <Text className="text-slate-500 dark:text-slate-400 text-xs font-semibold leading-relaxed">
                            {"Please select a reason for reporting this profile. Abusive reporting may result in account suspension."}
                        </Text>

                        {/* Report Reasons Options */}
                        <View className="gap-y-2 py-2">
                            {[
                                "Fake profile or credentials",
                                "Abusive or inappropriate messages",
                                "Spam or advertisements",
                                "Unprofessional service delivery"
                            ].map((reasonText) => (
                                <TouchableOpacity
                                    key={reasonText}
                                    onPress={() => setReportReason(reasonText)}
                                    className={`px-4 py-3 rounded-xl border flex-row items-center active:opacity-90 ${reportReason === reasonText
                                            ? "bg-rose-500/10 border-rose-500"
                                            : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800"
                                        }`}
                                >
                                    <Ionicons
                                        name={reportReason === reasonText ? "ellipse" : "ellipse-outline"}
                                        size={14}
                                        color={reportReason === reasonText ? "#f43f5e" : "#64748b"}
                                    />
                                    <Text className={`text-xs font-semibold ml-3 ${reportReason === reasonText ? "text-rose-400" : "text-slate-600 dark:text-slate-300"}`}>
                                        {reasonText}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Action Buttons */}
                        <View className="flex-row gap-x-4 mt-2">
                            <TouchableOpacity
                                onPress={() => setShowReportModal(false)}
                                className="flex-1 bg-slate-100 dark:bg-slate-800 py-3 rounded-xl items-center"
                            >
                                <Text className="text-slate-600 dark:text-slate-300 font-bold">Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={handleSubmitReport}
                                disabled={isSubmittingReport}
                                className="flex-1 bg-rose-600 py-3 rounded-xl items-center justify-center"
                            >
                                {isSubmittingReport ? (
                                    <ActivityIndicator size="small" color="white" />
                                ) : (
                                    <Text className="text-white font-bold">Submit Report</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            )}
        </SafeAreaView>
    );
}
