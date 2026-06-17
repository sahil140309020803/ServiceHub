import React, { useState, useEffect, useRef } from "react";
import {
    View,
    Image,
    Text,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    StatusBar,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Animated
} from "react-native";
import { useRouter } from "expo-router";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import useAuthStore from "../src/store/useAuthStore";
import storage from "../src/utils/storage";

// Form validation schema
const loginSchema = z.object({
    email: z
        .string()
        .trim()
        .min(1, "Email or Mobile Number is required"),
    password: z
        .string()
        .min(1, "Password is required"),
});

// Reusable Floating Label Input Component
function FloatingLabelInput({
    label,
    value,
    onChangeText,
    onBlur,
    secureTextEntry,
    keyboardType,
    autoCapitalize,
    icon,
    hasError,
    showPasswordToggle,
    onPasswordTogglePress,
    passwordVisibility
}) {
    const animatedValue = useRef(new Animated.Value(value ? 1 : 0)).current;
    const [isFocused, setIsFocused] = useState(false);

    useEffect(() => {
        Animated.timing(animatedValue, {
            toValue: (isFocused || value) ? 1 : 0,
            duration: 150,
            useNativeDriver: false,
        }).start();
    }, [isFocused, value, animatedValue]);

    const labelStyle = {
        position: "absolute",
        left: 44,
        top: 17,
        zIndex: 10,
        paddingHorizontal: 2.5,
        backgroundColor: "white",
        fontSize: animatedValue.interpolate({
            inputRange: [0, 1],
            outputRange: [15, 11]
        }),
        transform: [
            {
                translateY: animatedValue.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -27]
                })
            }
        ],
        color: animatedValue.interpolate({
            inputRange: [0, 1],
            outputRange: ["#94a3b8", hasError ? "#ef4444" : (isFocused ? "#1a73e8" : "#64748b")]
        })
    };

    return (
        <View className="relative w-full mb-1">
            <Animated.Text style={labelStyle} pointerEvents="none">
                {label}
            </Animated.Text>

            <View className={`h-16 shadow rounded-xl border flex-row items-center px-4 bg-white ${hasError ? "border-rose-500" : (isFocused ? "border-[#1a73e8]" : "border-slate-200")
                }`}>
                <Ionicons name={icon} size={20} color="#1a73e8" />
                <TextInput
                    value={value}
                    onChangeText={onChangeText}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => {
                        setIsFocused(false);
                        if (onBlur) onBlur();
                    }}
                    secureTextEntry={secureTextEntry}
                    keyboardType={keyboardType}
                    autoCapitalize={autoCapitalize}
                    className="flex-1 ml-3 items-center text-slate-700 font-semibold h-full"
                    style={{ includeFontPadding: false }}
                />
                {showPasswordToggle && (
                    <TouchableOpacity onPress={onPasswordTogglePress} className="p-1">
                        <Ionicons
                            name={passwordVisibility ? "eye-off-outline" : "eye-outline"}
                            size={18}
                            color="#94a3b8"
                        />
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
}

export default function LoginScreen() {
    const router = useRouter();
    const { login, isLoading, error: serverError, clearError } = useAuthStore();
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);

    // Form initialization
    const {
        control,
        handleSubmit,
        formState: { errors },
        setValue
    } = useForm({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            email: "",
            password: ""
        }
    });

    const firstErrorField = ["email", "password"].find(field => errors[field]);

    // Load remembered email, password on mount
    useEffect(() => {
        const loadRememberedEmail = async () => {
            const savedData = await storage.getItem("remembered_email");
            if (savedData) {
                setValue("email", savedData.email);
                setValue("password", savedData.password);
                setRememberMe(true);
            }
        };
        loadRememberedEmail();
    }, [setValue]);

    // Clear server errors when screen mounts
    useEffect(() => {
        clearError();
    }, [clearError]);

    // Show server error in Toast
    useEffect(() => {
        if (serverError) {
            Toast.show({
                type: "error",
                text1: serverError,
                position: "top"
            });
            clearError();
        }
    }, [serverError, clearError]);

    const onSubmit = async (data) => {
        try {
            const success = await login(data.email, data.password);
            if (success) {
                if (rememberMe) {
                    await storage.setItem("remembered_email", {
                        email: data.email,
                        password: data.password
                    });
                } else {
                    await storage.removeItem("remembered_email");
                }
                Toast.show({
                    type: "success",
                    text1: "Welcome back!",
                    text2: "Logged in successfully 🎉",
                });
            }
        } catch (error) {
            Toast.show({
                type: "error",
                text1: error || "Login failed",
            });
        }
    };

    // Callback on client side validation error - show first error message in Toast
    const onError = (errors) => {
        const errorOrder = ["email", "password"];
        const firstField = errorOrder.find(field => errors[field]);
        if (firstField && errors[firstField]) {
            Toast.show({
                type: "error",
                text1: errors[firstField].message,
                position: "top"
            });
        }
    };

    const handleGoogleLogin = () => {
        Toast.show({
            type: "info",
            text1: "Under Maintenance...",
            position: "top"
        });
    };

    const handleForgotPassword = () => {
        Toast.show({
            type: "info",
            text1: "Forgot Password flow is under development.",
            position: "top"
        });
    };

    return (
        <SafeAreaView className="flex-1 bg-white">
            <StatusBar barStyle="dark-content" backgroundColor="white" />

            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                className="flex-1"
            >
                <ScrollView
                    contentContainerStyle={{ flexGrow: 1 }}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    <View className="flex-1 gap-6 px-6 py-6 bg-white">
                        {/* Header Navigation Arrow */}
                        <View>
                            <TouchableOpacity
                                onPress={() => router.replace("/")}
                                activeOpacity={0.8}
                                className="w-10 h-10 items-start justify-center mb-6"
                            >
                                <Ionicons name="chevron-back" size={28} color="#0f172a" />
                            </TouchableOpacity>

                            {/* Header Titles */}
                            <Text className="text-4xl font-black text-slate-900 tracking-tight">
                                Welcome <Text className="text-[#1a73e8]">back! 👋</Text>
                            </Text>
                            <Text className="text-slate-500 text-sm font-semibold mt-2.5">
                                Login to continue and manage your services easily.
                            </Text>
                        </View>

                        <View className="my-8 gap-y-5">
                            {/* Email / Username Input */}
                            <Controller
                                control={control}
                                name="email"
                                render={({ field: { onChange, onBlur, value } }) => (
                                    <FloatingLabelInput
                                        label="Email or Mobile Number"
                                        value={value}
                                        onChangeText={onChange}
                                        onBlur={onBlur}
                                        icon="mail-outline"
                                        keyboardType="email-address"
                                        autoCapitalize="none"
                                        hasError={firstErrorField === "email"}
                                    />
                                )}
                            />

                            {/* Password Input */}
                            <Controller
                                control={control}
                                name="password"
                                render={({ field: { onChange, onBlur, value } }) => (
                                    <FloatingLabelInput
                                        label="Password"
                                        value={value}
                                        onChangeText={onChange}
                                        onBlur={onBlur}
                                        icon="lock-closed-outline"
                                        secureTextEntry={!showPassword}
                                        autoCapitalize="none"
                                        hasError={firstErrorField === "password"}
                                        showPasswordToggle={true}
                                        onPasswordTogglePress={() => setShowPassword(!showPassword)}
                                        passwordVisibility={showPassword}
                                    />
                                )}
                            />

                            {/* Remember Me & Forgot Password Row */}
                            <View className="flex-row justify-between items-center mt-2 px-1">
                                {/* Remember Me Checkbox */}
                                <TouchableOpacity
                                    activeOpacity={0.8}
                                    onPress={() => setRememberMe(!rememberMe)}
                                    className="flex-row items-center"
                                >
                                    <View className={`w-5 h-5 rounded border items-center justify-center mr-2.5 ${rememberMe ? "bg-[#1a73e8] border-[#1a73e8]" : "border-slate-300 bg-white"
                                        }`}>
                                        {rememberMe && <Ionicons name="checkmark" size={12} color="white" />}
                                    </View>
                                    <Text className="text-slate-500 text-sm font-semibold">
                                        Remember me
                                    </Text>
                                </TouchableOpacity>

                                {/* Forgot Password */}
                                <TouchableOpacity onPress={handleForgotPassword} activeOpacity={0.8}>
                                    <Text className="text-[#1a73e8] text-sm font-semibold">
                                        Forgot password?
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View>
                            {/* Submit Button */}
                            <TouchableOpacity
                                disabled={isLoading}
                                onPress={handleSubmit(onSubmit, onError)}
                                activeOpacity={0.95}
                                className="bg-[#1a73e8] h-14 rounded-full flex-row items-center justify-center relative shadow-lg shadow-blue-500/20 active:opacity-95"
                            >
                                {isLoading ? (
                                    <ActivityIndicator size="small" color="white" />
                                ) : (
                                    <Text className="text-white font-bold text-base tracking-wide">
                                        Login
                                    </Text>
                                )}
                            </TouchableOpacity>

                            {/* OR Divider */}
                            <View className="flex-row items-center my-9">
                                <View className="flex-1 h-[1px] bg-slate-100" />
                                <Text className="text-slate-400 text-xs px-4 font-bold">OR</Text>
                                <View className="flex-1 h-[1px] bg-slate-100" />
                            </View>

                            {/* Google Social Button */}
                            <TouchableOpacity
                                onPress={handleGoogleLogin}
                                activeOpacity={0.8}
                                className="bg-white border border-slate-200/80 rounded-2xl h-14 flex-row items-center justify-center gap-3 shadow-md shadow-slate-400"
                            >
                                <Image
                                    source={require('../assets/images/google.png')}
                                    style={{
                                        width: 22,
                                        height: 22,
                                        resizeMode: 'contain',
                                    }}
                                />
                                <Text className="text-slate-800 font-bold">
                                    Continue with Google
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* Don't have an account footer */}
                        <View className="flex-row justify-center items-center pb-2">
                            <Text className="text-slate-400 text-sm font-semibold">Don’t have an account? </Text>
                            <TouchableOpacity onPress={() => router.replace("/register")}>
                                <Text className="text-[#1a73e8] text-sm font-bold">Sign Up</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
