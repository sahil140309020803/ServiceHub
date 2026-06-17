import React from "react";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const ToastContainer = ({
    icon,
    iconColor,
    title,
    message,
    borderColor,
}) => {
    return (
        <View
            style={{
                width: "90%",
                backgroundColor: "#FFFFFF",
                borderRadius: 18,
                paddingVertical: 12,
                paddingHorizontal: 14,
                flexDirection: "row",
                alignItems: "center",
                borderLeftWidth: 4,
                borderLeftColor: borderColor,

                shadowColor: "#000",
                shadowOpacity: 0.15,
                shadowRadius: 10,
                shadowOffset: { width: 0, height: 5 },
                elevation: 8,
            }}
        >
            <View
                style={{
                    width: 35,
                    height: 35,
                    borderRadius: 20,
                    backgroundColor: `${iconColor}20`,
                    justifyContent: "center",
                    alignItems: "center",
                }}
            >
                <Ionicons name={icon} size={24} color={iconColor} />
            </View>

            <View style={{ flex: 1, marginLeft: 14 }}>
                <Text
                    style={{
                        fontSize: 14,
                        fontWeight: "600",
                        color: "#111827",
                    }}
                >
                    {title}
                </Text>

                {message ? (
                    <Text
                        style={{
                            marginTop: 3,
                            fontSize: 10,
                            color: "#6B7280",
                        }}
                    >
                        {message}
                    </Text>
                ) : null}
            </View>
        </View>
    );
};

export const toastConfig = {
    success: (props) => (
        <ToastContainer
            icon="checkmark-circle"
            iconColor="#22C55E"
            borderColor="#22C55E"
            title={props.text1}
            message={props.text2}
        />
    ),

    error: (props) => (
        <ToastContainer
            icon="close-circle"
            iconColor="#EF4444"
            borderColor="#EF4444"
            title={props.text1}
            message={props.text2}
        />
    ),

    info: (props) => (
        <ToastContainer
            icon="information-circle"
            iconColor="#2563EB"
            borderColor="#2563EB"
            title={props.text1}
            message={props.text2}
        />
    ),

    warning: (props) => (
        <ToastContainer
            icon="warning"
            iconColor="#F59E0B"
            borderColor="#F59E0B"
            title={props.text1}
            message={props.text2}
        />
    ),
};