import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    StatusBar,
    Alert
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import api from "../src/services/api";

export default function InsightsScreen() {
    const router = useRouter();

    const [stats, setStats] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const fetchStats = async (showLoader = true) => {
        if (showLoader) setIsLoading(true);
        try {
            const response = await api.get("/api/extensions/contacts/stats");
            if (response.data.success) {
                setStats(response.data.data);
            }
        } catch (err) {
            console.error("Error fetching contact stats:", err);
            Alert.alert("Error", "Failed to retrieve engagement statistics.");
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        fetchStats(true);
    }, []);

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

    if (isLoading) {
        return (
            <SafeAreaView className="flex-1 bg-slate-950 justify-center items-center">
                <ActivityIndicator size="large" color="#6366f1" />
            </SafeAreaView>
        );
    }

    const totalLeads = stats?.totalClicks || 0;
    const whatsappLeads = stats?.whatsappClicks || 0;
    const callLeads = stats?.callClicks || 0;
    const recentClicks = stats?.recentClicks || [];

    return (
        <SafeAreaView className="flex-1 bg-slate-950" edges={["top", "left", "right"]}>
            <StatusBar barStyle="light-content" />

            {/* Sticky Header */}
            <View className="flex-row items-center px-5 py-4 border-b border-slate-900 bg-slate-950">
                <TouchableOpacity
                    onPress={() => router.canGoBack() ? router.back() : router.replace("/(tabs)/profile")}
                    className="w-10 h-10 bg-slate-900 border border-slate-800 rounded-full items-center justify-center mr-4"
                >
                    <Ionicons name="arrow-back" size={20} color="white" />
                </TouchableOpacity>
                <View>
                    <Text className="text-xl font-extrabold text-white">Professional Insights</Text>
                    <Text className="text-slate-400 text-xs mt-0.5">Leads analytics and profile engagement</Text>
                </View>
            </View>

            <ScrollView
                className="flex-1 px-5"
                showsVerticalScrollIndicator={false}
                onRefresh={handleRefresh}
                refreshing={isRefreshing}
            >
                {/* Metrics Grid */}
                <View className="flex-row gap-x-4 mt-6">
                    {/* Total Leads Card */}
                    <View className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl p-4 items-center justify-center relative overflow-hidden">
                        <View className="absolute right-[-10] top-[-10] opacity-5">
                            <Ionicons name="people" size={80} color="white" />
                        </View>
                        <Text className="text-slate-400 text-[10px] font-extrabold uppercase tracking-wider text-center">
                            Total Leads
                        </Text>
                        <Text className="text-white text-3xl font-black mt-2 text-center">
                            {totalLeads}
                        </Text>
                    </View>

                    {/* WhatsApp Leads Card */}
                    <View className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl p-4 items-center justify-center relative overflow-hidden">
                        <View className="absolute right-[-10] top-[-10] opacity-5">
                            <Ionicons name="logo-whatsapp" size={80} color="white" />
                        </View>
                        <Text className="text-emerald-400 text-[10px] font-extrabold uppercase tracking-wider text-center">
                            WhatsApp
                        </Text>
                        <Text className="text-white text-3xl font-black mt-2 text-center">
                            {whatsappLeads}
                        </Text>
                    </View>

                    {/* Phone Leads Card */}
                    <View className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl p-4 items-center justify-center relative overflow-hidden">
                        <View className="absolute right-[-10] top-[-10] opacity-5">
                            <Ionicons name="call" size={80} color="white" />
                        </View>
                        <Text className="text-indigo-400 text-[10px] font-extrabold uppercase tracking-wider text-center">
                            Phone Calls
                        </Text>
                        <Text className="text-white text-3xl font-black mt-2 text-center">
                            {callLeads}
                        </Text>
                    </View>
                </View>

                {/* Recent Leads list */}
                <Text className="text-white font-extrabold text-base mt-8 mb-4">Recent Inquiries</Text>

                {recentClicks.length === 0 ? (
                    <View className="bg-slate-900 border border-slate-800 rounded-2xl p-6 items-center justify-center mb-10">
                        <Ionicons name="stats-chart-outline" size={36} color="#64748b" />
                        <Text className="text-slate-400 text-sm mt-3 font-semibold text-center">
                            No inquiries recorded yet
                        </Text>
                        <Text className="text-slate-500 text-xs mt-1 text-center max-w-xs leading-relaxed">
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
                                    className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex-row items-center justify-between"
                                >
                                    <View className="flex-row items-center flex-1 mr-2">
                                        <View className="w-10 h-10 rounded-full bg-slate-800 items-center justify-center border border-slate-700 mr-3">
                                            <Text className="text-indigo-400 font-bold text-sm">
                                                {getInitials(custName)}
                                            </Text>
                                        </View>
                                        <View className="flex-1">
                                            <Text className="text-white font-bold text-sm" numberOfLines={1}>
                                                {custName}
                                            </Text>
                                            {hasContact ? (
                                                <Text className="text-slate-400 text-xs mt-0.5" numberOfLines={1}>
                                                    {customer.phoneNumber || customer.email}
                                                </Text>
                                            ) : (
                                                <Text className="text-slate-500 text-xs mt-0.5 italic">
                                                    Guest contact lead
                                                </Text>
                                            )}
                                        </View>
                                    </View>

                                    <View className="items-end">
                                        <View className="flex-row items-center bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800/80">
                                            <Ionicons
                                                name={click.contactType === "whatsapp" ? "logo-whatsapp" : "call-outline"}
                                                size={12}
                                                color={click.contactType === "whatsapp" ? "#10b981" : "#6366f1"}
                                            />
                                            <Text className="text-slate-300 text-[10px] font-bold uppercase tracking-wider ml-1">
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
        </SafeAreaView>
    );
}
