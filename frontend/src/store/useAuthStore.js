import { create } from "zustand";
import storage from "../utils/storage";
import api from "../services/api";

const useAuthStore = create((set, get) => ({
    user: null,
    token: null,
    isLoading: true,
    error: null,
    profileCompleted: true,

    // Login action
    login: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
            const response = await api.post("/api/auth/login", { email, password });
            const { success, data, message } = response.data;
            
            if (success) {
                const { token, user } = data;
                await storage.setItem("token", token);
                
                let profileCompleted = true;
                if (user.role === "worker") {
                    try {
                        const profRes = await api.get("/api/workers/my-profile", {
                            headers: { Authorization: `Bearer ${token}` }
                        });
                        profileCompleted = profRes.data.profileCompleted;
                    } catch (err) {
                        console.error("Error checking worker profile status on login:", err);
                        profileCompleted = false;
                    }
                }
                
                set({ user, token, profileCompleted, isLoading: false, error: null });
                return true;
            } else {
                set({ error: message || "Invalid credentials", isLoading: false });
                return false;
            }
        } catch (err) {
            const errMsg = err.response?.data?.message || "Login failed. Please try again.";
            set({ error: errMsg, isLoading: false });
            return false;
        }
    },

    // Register action
    register: async (fullName, email, phoneNumber, password, role) => {
        set({ isLoading: true, error: null });
        try {
            const response = await api.post("/api/auth/register", {
                fullName,
                email,
                phoneNumber,
                password,
                role
            });
            const { success, data, message } = response.data;

            if (success) {
                const { token, user } = data;
                await storage.setItem("token", token);
                
                let profileCompleted = true;
                if (user.role === "worker") {
                    profileCompleted = false;
                }
                
                set({ user, token, profileCompleted, isLoading: false, error: null });
                return true;
            } else {
                set({ error: message || "Registration failed", isLoading: false });
                return false;
            }
        } catch (err) {
            const errMsg = err.response?.data?.message || "Registration failed. Please try again.";
            set({ error: errMsg, isLoading: false });
            return false;
        }
    },

    // Logout action
    logout: async () => {
        set({ isLoading: true });
        try {
            await storage.removeItem("token");
        } catch (err) {
            console.error("Error clearing token during logout:", err);
        }
        set({ user: null, token: null, isLoading: false, error: null });
    },

    // Load user profile on app start/mount
    loadUser: async () => {
        set({ isLoading: true, error: null });
        try {
            const token = await storage.getItem("token");
            if (!token) {
                set({ isLoading: false, token: null, user: null });
                return false;
            }

            // Fetch user profile using token
            const response = await api.get("/api/auth/me");
            const { success, data } = response.data;

            if (success) {
                const user = data;
                let profileCompleted = true;
                if (user.role === "worker") {
                    try {
                        const profRes = await api.get("/api/workers/my-profile", {
                            headers: { Authorization: `Bearer ${token}` }
                        });
                        profileCompleted = profRes.data.profileCompleted;
                    } catch (err) {
                        console.error("Error checking worker profile status on load:", err);
                        profileCompleted = false;
                    }
                }
                set({ user, token, profileCompleted, isLoading: false });
                return true;
            } else {
                // If backend returns unsuccessful profile retrieval, wipe the invalid token
                await storage.removeItem("token");
                set({ user: null, token: null, isLoading: false });
                return false;
            }
        } catch (err) {
            console.error("Failed to load user session:", err);
            // On session expired or server error
            if (err.response?.status === 401) {
                await storage.removeItem("token");
                set({ user: null, token: null });
            }
            set({ isLoading: false });
            return false;
        }
    },

    // Update user basic profile
    updateProfile: async (fullName, email, phoneNumber) => {
        set({ isLoading: true, error: null });
        try {
            const response = await api.put("/api/auth/update", { fullName, email, phoneNumber });
            const { success, data, message } = response.data;

            if (success) {
                set({ user: data, isLoading: false, error: null });
                return true;
            } else {
                set({ error: message || "Failed to update profile", isLoading: false });
                return false;
            }
        } catch (err) {
            const errMsg = err.response?.data?.message || "Failed to update profile. Please try again.";
            set({ error: errMsg, isLoading: false });
            return false;
        }
    },

    clearError: () => set({ error: null }),
    setProfileCompleted: (completed) => set({ profileCompleted: completed })
}));

export default useAuthStore;
