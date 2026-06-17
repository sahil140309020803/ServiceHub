import React from "react";
import {
    View,
    Text,
    TouchableOpacity,
    StatusBar,
    ImageBackground
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function WelcomeScreen() {
    const router = useRouter();

    return (
        <View className="flex-1 bg-white ">
            {/* Transparent status bar to let background image expand to the top */}
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

            <ImageBackground
                source={require("../assets/images/welcome-bg.png")}
                className="flex-1 justify-end"
                resizeMode="cover"
            >
                {/* Bottom Card Component */}
                <View className="bg-white px-7 pt-9 pb-10 rounded-t-[42px] shadow-2xl border-t border-slate-100">

                    {/* Header Row: Shield Icon + Text */}
                    <View className="flex-row items-center mb-7 pl-1">
                        <View className="w-14 h-14 rounded-full bg-blue-100 items-center justify-center border-blue-100">
                            <Ionicons name="shield-checkmark" size={28} color="#1a73e8" />
                        </View>
                        <View className="ml-4">
                            <Text className="text-slate-800 font-extrabold text-base tracking-tight">
                                Trusted Professionals
                            </Text>
                            <Text className="text-slate-500 text-xs font-semibold mt-1">
                                Verified • Experienced • Reliable
                            </Text>
                        </View>
                    </View>

                    {/* Get Started Button */}
                    <TouchableOpacity
                        activeOpacity={0.9}
                        onPress={() => router.push("/register")}
                        className="bg-[#1a73e8] h-14 rounded-full flex-row items-center justify-center relative shadow-lg shadow-blue-500/20 active:opacity-95 mb-6"
                    >
                        <Text className="text-white font-bold text-base tracking-wide">
                            Get Started
                        </Text>
                        <View className="w-10 h-10 rounded-full bg-white items-center justify-center absolute right-2 shadow-sm">
                            <Ionicons name="arrow-forward" size={18} color="#1a73e8" />
                        </View>
                    </TouchableOpacity>

                    {/* Already have an account? Log in */}
                    <View className="flex-row justify-center items-center pb-2">
                        <Text className="text-slate-500 text-sm font-semibold">
                            Already have an account?{" "}
                        </Text>
                        <TouchableOpacity onPress={() => router.push("/login")}>
                            <Text className="text-[#1a73e8] text-sm font-bold">
                                Log In
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ImageBackground>
        </View>
    );
}