import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

// In-memory fallback if storage is completely unavailable (e.g. server-side rendering or sandboxed environments)
const memoryStore = new Map();

const storage = {
    getItem: async (key) => {
        if (Platform.OS === "web") {
            try {
                if (typeof window !== "undefined" && window.localStorage) {
                    return window.localStorage.getItem(key);
                }
            } catch (err) {
                // Silent fallback
            }
            return memoryStore.get(key) || null;
        }

        try {
            return await AsyncStorage.getItem(key);
        } catch (err) {
            // Silent fallback to avoid console noise when native module is absent (e.g., on web or web preview)
            return memoryStore.get(key) || null;
        }
    },

    setItem: async (key, value) => {
        if (Platform.OS === "web") {
            try {
                if (typeof window !== "undefined" && window.localStorage) {
                    window.localStorage.setItem(key, value);
                    return;
                }
            } catch (err) {
                // Silent fallback
            }
            memoryStore.set(key, value);
            return;
        }

        try {
            await AsyncStorage.setItem(key, value);
        } catch (err) {
            // Silent fallback
            memoryStore.set(key, value);
        }
    },

    removeItem: async (key) => {
        if (Platform.OS === "web") {
            try {
                if (typeof window !== "undefined" && window.localStorage) {
                    window.localStorage.removeItem(key);
                    return;
                }
            } catch (err) {
                // Silent fallback
            }
            memoryStore.delete(key);
            return;
        }

        try {
            await AsyncStorage.removeItem(key);
        } catch (err) {
            // Silent fallback
            memoryStore.delete(key);
        }
    }
};

export default storage;
