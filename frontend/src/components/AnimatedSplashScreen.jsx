import React, { useEffect, useRef } from "react";
import { View, Image, Text, Animated, Easing, StyleSheet, Dimensions } from "react-native";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

export default function AnimatedSplashScreen() {
    // Animation references for breathing logo and shifting waves
    const pulseAnim = useRef(new Animated.Value(1)).current;

    // Wave sway animation loops
    const waveAnim1 = useRef(new Animated.Value(0)).current;
    const waveAnim2 = useRef(new Animated.Value(0)).current;
    const waveAnim3 = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        // Logo breathing pulse loop (subtle scale 1x to 1.04x)
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1.04,
                    duration: 1800,
                    easing: Easing.bezier(0.4, 0, 0.2, 1),
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 1800,
                    easing: Easing.bezier(0.4, 0, 0.2, 1),
                    useNativeDriver: true,
                }),
            ])
        ).start();

        // Sinusoidal sway helper function
        const startWaveAnimation = (anim, duration) => {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(anim, {
                        toValue: 1,
                        duration: duration / 2,
                        easing: Easing.bezier(0.445, 0.05, 0.55, 0.95), // EaseInOutSine
                        useNativeDriver: true,
                    }),
                    Animated.timing(anim, {
                        toValue: 0,
                        duration: duration / 2,
                        easing: Easing.bezier(0.445, 0.05, 0.55, 0.95),
                        useNativeDriver: true,
                    }),
                ])
            ).start();
        };

        // Start slow swaying loops with different durations
        startWaveAnimation(waveAnim1, 9000);
        startWaveAnimation(waveAnim2, 11000);
        startWaveAnimation(waveAnim3, 13000);
    }, [pulseAnim, waveAnim1, waveAnim2, waveAnim3]);

    // Interpolate wave animations for horizontal and vertical shifts
    const translateX1 = waveAnim1.interpolate({
        inputRange: [0, 1],
        outputRange: [-35, 35],
    });
    const translateY1 = waveAnim1.interpolate({
        inputRange: [0, 1],
        outputRange: [-10, 10],
    });
    const rotate1 = waveAnim1.interpolate({
        inputRange: [0, 1],
        outputRange: ["-4deg", "4deg"],
    });

    const translateX2 = waveAnim2.interpolate({
        inputRange: [0, 1],
        outputRange: [40, -40],
    });
    const translateY2 = waveAnim2.interpolate({
        inputRange: [0, 1],
        outputRange: [8, -8],
    });
    const rotate2 = waveAnim2.interpolate({
        inputRange: [0, 1],
        outputRange: ["5deg", "-5deg"],
    });

    const translateX3 = waveAnim3.interpolate({
        inputRange: [0, 1],
        outputRange: [-25, 25],
    });
    const translateY3 = waveAnim3.interpolate({
        inputRange: [0, 1],
        outputRange: [-6, 6],
    });
    const rotate3 = waveAnim3.interpolate({
        inputRange: [0, 1],
        outputRange: ["-3deg", "3deg"],
    });

    return (
        <View style={styles.container}>
            {/* Ambient background glow layers */}
            <View style={styles.topGlow} />
            <View style={styles.bottomGlow} />

            {/* Logo Center Container */}
            <View style={styles.centerContainer}>
                <Animated.View style={{ transform: [{ scale: pulseAnim }], alignItems: "center" }}>
                    <Image
                        source={require("../../assets/images/logo.png")}
                        style={styles.logo}
                        resizeMode="contain"
                    />
                    <Text style={styles.brandText}>
                        Service<Text style={styles.brandAccent}>Hub</Text>
                    </Text>
                </Animated.View>
            </View>

            {/* Animated overlapping wave mountains at the bottom */}
            <View style={styles.waveContainer}>
                {/* Back Wave (Wave 1) */}
                <Animated.View
                    style={[
                        styles.waveCircle,
                        styles.wave1,
                        {
                            transform: [
                                { translateX: translateX1 },
                                { translateY: translateY1 },
                                { rotate: rotate1 }
                            ]
                        }
                    ]}
                />

                {/* Middle Wave (Wave 2) */}
                <Animated.View
                    style={[
                        styles.waveCircle,
                        styles.wave2,
                        {
                            transform: [
                                { translateX: translateX2 },
                                { translateY: translateY2 },
                                { rotate: rotate2 }
                            ]
                        }
                    ]}
                />

                {/* Front Wave (Wave 3) */}
                <Animated.View
                    style={[
                        styles.waveCircle,
                        styles.wave3,
                        {
                            transform: [
                                { translateX: translateX3 },
                                { translateY: translateY3 },
                                { rotate: rotate3 }
                            ]
                        }
                    ]}
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#ffffff", // Pure white canvas
        alignItems: "center",
        justifyContent: "center",
    },
    topGlow: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: screenHeight * 0.35,
        backgroundColor: "#eef6ff", // Very soft sky blue glow at top
        opacity: 0.8,
        borderBottomLeftRadius: screenWidth,
        borderBottomRightRadius: screenWidth,
        transform: [{ scaleX: 1.5 }],
    },
    bottomGlow: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        height: screenHeight * 0.25,
        backgroundColor: "#eff6ff", // Light blue gradient base at bottom
        opacity: 0.6,
    },
    centerContainer: {
        alignItems: "center",
        justifyContent: "center",
        zIndex: 10,
        paddingBottom: 60, // Push logo slightly up to balance waves
    },
    logo: {
        width: 110,
        height: 110,
        marginBottom: 2,
        marginTop: 10,
    },
    brandText: {
        fontSize: 32,
        fontWeight: "900",
        color: "#0f172a",
        letterSpacing: 0.5,
        textAlign: "center",
    },
    brandAccent: {
        color: "#1a73e8",
    },
    subtitleText: {
        fontSize: 14,
        fontWeight: "500",
        color: "#64748b",
        marginTop: 6,
        letterSpacing: 0.3,
        textAlign: "center",
    },
    waveContainer: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        height: 240, // Height of bottom animated waves region
        overflow: "hidden",
    },
    waveCircle: {
        position: "absolute",
        width: screenWidth * 2.2,
        height: screenWidth * 2.2,
        borderRadius: (screenWidth * 2.2) / 2,
    },
    wave1: {
        backgroundColor: "#e0f2fe", // light sky blue (sky-100)
        opacity: 0.45,
        bottom: -screenWidth * 1.85,
        left: -screenWidth * 0.5,
    },
    wave2: {
        backgroundColor: "#dbeafe", // light indigo/blue (blue-50)
        opacity: 0.5,
        bottom: -screenWidth * 1.9,
        right: -screenWidth * 0.6,
    },
    wave3: {
        backgroundColor: "#eef2ff", // subtle indigo base (indigo-50)
        opacity: 0.65,
        bottom: -screenWidth * 1.95,
        left: -screenWidth * 0.4,
    },
});
