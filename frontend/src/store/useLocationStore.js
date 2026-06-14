import { create } from "zustand";
import storage from "../utils/storage";
import * as Location from "expo-location";
import useAuthStore from "./useAuthStore";

const LOCATION_STORAGE_KEY = "servicehub_chosen_location";

const getStorageKey = () => {
    try {
        const user = useAuthStore.getState().user;
        if (user && user._id) {
            return `${LOCATION_STORAGE_KEY}_${user._id}`;
        }
    } catch (e) {
        // Fallback if useAuthStore state is not fully loaded yet
    }
    return `${LOCATION_STORAGE_KEY}_guest`;
};

const useLocationStore = create((set, get) => ({
    location: null, // { latitude, longitude, address }
    isLoading: false,
    error: null,

    // Set location and save to storage
    setLocation: async (loc) => {
        try {
            const key = getStorageKey();
            if (loc) {
                await storage.setItem(key, JSON.stringify(loc));
            } else {
                await storage.removeItem(key);
            }
            set({ location: loc, error: null });
        } catch (err) {
            console.error("Failed to save location to storage:", err);
        }
    },

    // Load saved location on startup
    loadSavedLocation: async () => {
        set({ isLoading: true });
        try {
            const key = getStorageKey();
            const stored = await storage.getItem(key);
            if (stored) {
                set({ location: JSON.parse(stored) });
            } else {
                set({ location: null });
            }
        } catch (err) {
            console.error("Failed to load location from storage:", err);
        } finally {
            set({ isLoading: false });
        }
    },

    // Clear location
    clearLocation: async () => {
        await get().setLocation(null);
    },

    // Fetch current GPS location and reverse-geocode
    getCurrentLocation: async () => {
        set({ isLoading: true, error: null });
        try {
            // 1. Request Permission
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== "granted") {
                set({ error: "Permission to access location was denied", isLoading: false });
                return null;
            }

            // 2. Get GPS Coordinates
            const gpsLocation = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
            });

            const { latitude, longitude } = gpsLocation.coords;

            // 3. Reverse Geocode via OSM Nominatim API
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
                {
                    headers: {
                        "User-Agent": "ServiceHub-Mobile/1.0"
                    }
                }
            );
            const data = await response.json();

            let address = "Unknown Location";
            if (data && data.display_name) {
                address = data.display_name;
            }

            const resolvedLocation = { latitude, longitude, address };
            await get().setLocation(resolvedLocation);
            set({ isLoading: false });
            return resolvedLocation;
        } catch (err) {
            console.error("Error fetching GPS location:", err);
            set({ error: err.message || "Failed to retrieve GPS location", isLoading: false });
            return null;
        }
    },

    // Autocomplete manual search suggestions via OSM Nominatim API
    searchManualLocation: async (query) => {
        if (!query.trim()) return [];
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5`,
                {
                    headers: {
                        "User-Agent": "ServiceHub-Mobile/1.0"
                    }
                }
            );
            const data = await response.json();
            
            // Map search results to standard format
            return data.map((item) => ({
                id: item.place_id,
                address: item.display_name,
                latitude: parseFloat(item.lat),
                longitude: parseFloat(item.lon),
            }));
        } catch (err) {
            console.error("Error searching Nominatim locations:", err);
            return [];
        }
    }
}));

export default useLocationStore;
