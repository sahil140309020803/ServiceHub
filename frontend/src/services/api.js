import axios from "axios";
import Constants from "expo-constants";
import storage from "../utils/storage";

// Dynamic base URL detection for Expo development on physical devices vs simulators
const getBaseUrl = () => {

    return "https://servicehub-backend-delta.vercel.app";

    const hostUri = Constants.expoConfig?.hostUri;
    if (hostUri) {
        const ip = hostUri.split(":")[0];
        return `http://${ip}:5000`;
    }
    // return "http://localhost:5000";
};

const api = axios.create({
    baseURL: getBaseUrl(),
    timeout: 15000,
    headers: {
        "Content-Type": "application/json",
    },
});

// Interceptor to inject JWT token into requests
api.interceptors.request.use(
    async (config) => {
        try {
            const token = await storage.getItem("token");
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
        } catch (err) {
            console.error("Storage error in API interceptor:", err);
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export default api;
