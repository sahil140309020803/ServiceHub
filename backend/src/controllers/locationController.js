import SavedLocation from "../models/SavedLocation.js";

/**
 * Save a new user address/location
 * @route POST /api/extensions/locations
 */
export const saveLocation = async (req, res) => {
    try {
        const { locationName, latitude, longitude, label } = req.body;
        const userId = req.user._id;

        if (!locationName || !locationName.trim()) {
            return res.status(400).json({
                success: false,
                message: "Location name description is required",
            });
        }

        const location = await SavedLocation.create({
            userId,
            locationName: locationName.trim(),
            latitude: latitude !== undefined ? parseFloat(latitude) : null,
            longitude: longitude !== undefined ? parseFloat(longitude) : null,
            label: label || "Home",
        });

        return res.status(201).json({
            success: true,
            message: "Location saved successfully",
            data: location,
        });
    } catch (error) {
        console.error("Save Location Error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to save address location",
        });
    }
};

/**
 * Retrieve saved address locations for the user
 * @route GET /api/extensions/locations
 */
export const getLocations = async (req, res) => {
    try {
        const userId = req.user._id;

        const locations = await SavedLocation.find({ userId })
            .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            message: "Saved locations retrieved successfully",
            data: locations,
        });
    } catch (error) {
        console.error("Get Locations Error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to retrieve address locations",
        });
    }
};

/**
 * Delete a saved address location
 * @route DELETE /api/extensions/locations/:locationId
 */
export const deleteLocation = async (req, res) => {
    try {
        const { locationId } = req.params;
        const userId = req.user._id;

        const location = await SavedLocation.findById(locationId);
        if (!location) {
            return res.status(404).json({
                success: false,
                message: "Saved location not found",
            });
        }

        // Validate ownership
        if (location.userId.toString() !== userId.toString()) {
            return res.status(403).json({
                success: false,
                message: "You are not authorized to delete this saved location",
            });
        }

        await SavedLocation.findByIdAndDelete(locationId);

        return res.status(200).json({
            success: true,
            message: "Saved location deleted successfully",
        });
    } catch (error) {
        console.error("Delete Location Error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to delete saved location",
        });
    }
};
