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

// Registration validation schema
const registerSchema = z.object({
    fullName: z
        .string()
        .trim()
        .min(3, "Full Name must be at least 3 characters"),
    email: z
        .string()
        .trim()
        .min(1, "Email is required")
        .email("Please enter a valid email address"),
    phoneNumber: z
        .string()
        .trim()
        .min(10, "Phone number must be at least 10 digits"),
    password: z
        .string()
        .min(6, "Password must be at least 6 characters"),
    role: z.enum(["customer", "worker"]),
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

            <View className={`h-14 rounded-xl border flex-row items-center px-4 bg-white ${hasError ? "border-rose-500" : (isFocused ? "border-[#1a73e8]" : "border-slate-200")
                }`}>
                <Ionicons name={icon} size={18} color="#94a3b8" />
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

export default function RegisterScreen() {
    const router = useRouter();
    const { register, isLoading, error: serverError, clearError } = useAuthStore();
    const [showPassword, setShowPassword] = useState(false);

    // Clear server errors when screen mounts
    useEffect(() => {
        clearError();
    }, [clearError]);

    // Form initialization
    const {
        control,
        handleSubmit,
        formState: { errors },
        setValue,
        watch
    } = useForm({
        resolver: zodResolver(registerSchema),
        defaultValues: {
            fullName: "",
            email: "",
            phoneNumber: "",
            password: "",
            role: "customer"
        }
    });

    const selectedRole = watch("role");
    const firstErrorField = ["fullName", "email", "phoneNumber", "password"].find(field => errors[field]);

    // Trigger toast on server side errors
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
            const success = await register(
                data.fullName,
                data.email,
                data.phoneNumber,
                data.password,
                data.role
            );
            if (success) {
                Toast.show({
                    type: "success",
                    text1: "Registration Successful",
                    text2: "Welcome to ServiceHub! 🎉",
                });
            }
        } catch (error) {
            Toast.show({
                type: "error",
                text1: error || "Registration Failed",
            });
        }

    };

    // Callback on client side validation error - show first error message in Toast
    const onError = (errors) => {
        const errorOrder = ["fullName", "email", "phoneNumber", "password"];
        const firstField = errorOrder.find(field => errors[field]);

        if (firstField && errors[firstField]) {
            Toast.show({
                type: "error",
                text1: errors[firstField].message,
                position: "top"
            });
        }
    };

    const handleGoogleSignUp = () => {
        Toast.show({
            type: "info",
            text1: "Under Maintenance...",
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
                    <View className="flex-1 justify-between px-6 py-6 bg-white">
                        {/* Header Title Section */}
                        <View className="items-center mt-4">
                            <Text className="text-3xl font-black text-slate-900 tracking-tight text-center">
                                Create Your <Text className="text-[#1a73e8]">Account</Text>
                            </Text>
                            <Text className="text-slate-500 text-sm font-semibold text-center mt-2">
                                Join and connect with trusted professionals near you.
                            </Text>
                        </View>

                        {/* Google Social Button */}
                        <TouchableOpacity
                            onPress={handleGoogleSignUp}
                            activeOpacity={0.8}
                            className="bg-white border border-slate-200/80 rounded-2xl h-14 flex-row items-center justify-center gap-3 mt-7 shadow-md shadow-slate-400"
                        >
                            <Image
                                source={require('../assets/images/google.png')}
                                style={{
                                    width: 22,
                                    height: 22,
                                    resizeMode: 'contain',
                                }}
                            />
                            <Text className="text-slate-800 font-bold ml-2.5">
                                Continue with Google
                            </Text>
                        </TouchableOpacity>

                        {/* OR Divider */}
                        <View className="flex-row items-center my-6">
                            <View className="flex-1 h-[1px] bg-slate-100" />
                            <Text className="text-slate-400 text-xs px-4 font-bold">OR</Text>
                            <View className="flex-1 h-[1px] bg-slate-100" />
                        </View>

                        {/* Join As Cards */}
                        <View className="mb-6">
                            <Text className="text-slate-900 font-extrabold text-xs tracking-wide uppercase mb-3.5 pl-1">
                                Join As
                            </Text>

                            <View className="flex-row justify-between">
                                {/* Customer Card */}
                                <TouchableOpacity
                                    activeOpacity={0.9}
                                    onPress={() => setValue("role", "customer")}
                                    className={`w-[48%] h-36 rounded-2xl p-4 border relative flex-col justify-evenly  items-center ${selectedRole === "customer"
                                        ? "border-[#1a73e8] bg-blue-50/10"
                                        : "border-slate-200 bg-white"
                                        }`}
                                >
                                    {selectedRole === "customer" && (
                                        <View className="absolute top-2.5 right-2.5">
                                            <Ionicons name="checkmark-circle" size={21} color="#1a73e8" />
                                        </View>
                                    )}
                                    <View className={`w-14 h-14 rounded-full items-center justify-center ${selectedRole === "customer" ? "bg-blue-100/60" : "bg-slate-100"
                                        }`}>
                                        <Ionicons
                                            name="person-outline"
                                            size={26}
                                            color={selectedRole === "customer" ? "#1a73e8" : "#64748b"}
                                        />
                                    </View>
                                    <View className="flex flex-col justify-center items-center gap-0.5">
                                        <Text className={`font-bold text-md ${selectedRole === "customer" ? "text-[#1a73e8]" : "text-slate-900"
                                            }`}>
                                            Customer
                                        </Text>
                                        <Text className="text-slate-400 text-[10px] font-semibold">
                                            Need home services
                                        </Text>
                                    </View>
                                </TouchableOpacity>

                                {/* Professional Card */}
                                <TouchableOpacity
                                    activeOpacity={0.9}
                                    onPress={() => setValue("role", "worker")}
                                    className={`w-[48%] h-36 rounded-2xl p-4 border relative flex-col justify-center gap-0.5 items-center ${selectedRole === "worker"
                                        ? "border-[#1a73e8] bg-blue-50/10"
                                        : "border-slate-200 bg-white"
                                        }`}
                                >
                                    {selectedRole === "worker" && (
                                        <View className="absolute top-2.5 right-2.5">
                                            <Ionicons name="checkmark-circle" size={21} color="#1a73e8" />
                                        </View>
                                    )}
                                    <View className={`w-14 h-14 rounded-full items-center justify-center ${selectedRole === "worker" ? "bg-blue-100/60" : "bg-slate-100"
                                        }`}>
                                        <Ionicons
                                            name="briefcase-outline"
                                            size={26}
                                            color={selectedRole === "worker" ? "#1a73e8" : "#64748b"}
                                        />
                                    </View>
                                    <View className="flex flex-col justify-center items-center gap-0.5">
                                        <Text className={`font-bold text-md ${selectedRole === "worker" ? "text-[#1a73e8]" : "text-slate-900"
                                            }`}>
                                            Professional
                                        </Text>
                                        <Text className="text-slate-400 text-[10px] font-semibold">
                                            Provide home services
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Form Inputs (Floating labels) */}
                        <View className="gap-y-4 mb-8">
                            {/* Full Name Input */}
                            <Controller
                                control={control}
                                name="fullName"
                                render={({ field: { onChange, onBlur, value } }) => (
                                    <FloatingLabelInput
                                        label="Full Name"
                                        value={value}
                                        onChangeText={onChange}
                                        onBlur={onBlur}
                                        icon="person-outline"
                                        hasError={firstErrorField === "fullName"}
                                    />
                                )}
                            />

                            {/* Email Input */}
                            <Controller
                                control={control}
                                name="email"
                                render={({ field: { onChange, onBlur, value } }) => (
                                    <FloatingLabelInput
                                        label="Email Address"
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

                            {/* Mobile Number Input */}
                            <Controller
                                control={control}
                                name="phoneNumber"
                                render={({ field: { onChange, onBlur, value } }) => (
                                    <FloatingLabelInput
                                        label="Mobile Number"
                                        value={value}
                                        onChangeText={onChange}
                                        onBlur={onBlur}
                                        icon="call-outline"
                                        keyboardType="phone-pad"
                                        hasError={firstErrorField === "phoneNumber"}
                                    />
                                )}
                            />

                            {/* Password Input */}
                            <Controller
                                control={control}
                                name="password"
                                render={({ field: { onChange, onBlur, value } }) => (
                                    <FloatingLabelInput
                                        label="Create Password"
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
                        </View>

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
                                    Sign Up
                                </Text>
                            )}
                        </TouchableOpacity>

                        {/* Privacy policy footer */}
                        <View className="items-center mt-5 mb-4">
                            <Text className="text-slate-400 text-[11px] font-semibold text-center leading-normal">
                                By signing up, you agree to our
                            </Text>
                            <View className="flex-row mt-0.5">
                                <TouchableOpacity>
                                    <Text className="text-[#1a73e8] text-[11px] font-bold">Terms & Conditions</Text>
                                </TouchableOpacity>
                                <Text className="text-slate-400 text-[11px] font-semibold"> and </Text>
                                <TouchableOpacity>
                                    <Text className="text-[#1a73e8] text-[11px] font-bold">Privacy Policy</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Already have an account footer */}
                        <View className="flex-row justify-center items-center pb-2">
                            <Text className="text-slate-400 text-sm font-semibold">Already have an account? </Text>
                            <TouchableOpacity onPress={() => router.replace("/login")}>
                                <Text className="text-[#1a73e8] text-sm font-bold">Log In</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

