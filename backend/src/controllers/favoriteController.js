import Favorite from "../models/Favorite.js";
import WorkerProfile from "../models/WorkerProfile.js";

/**
 * Toggle a worker profile in customer's favorites list
 * @route POST /api/favorites/toggle
 */
export const toggleFavorite = async (req, res) => {
    try {
        const { workerId } = req.body;
        const customerId = req.user._id;

        if (!workerId) {
            return res.status(400).json({
                success: false,
                message: "Worker profile ID is required",
            });
        }

        // Validate worker profile existence
        const worker = await WorkerProfile.findById(workerId);
        if (!worker) {
            return res.status(404).json({
                success: false,
                message: "Worker profile not found",
            });
        }

        // Check if favorite record already exists
        const existing = await Favorite.findOne({ customerId, workerId });

        if (existing) {
            // Unfavorite
            await Favorite.findByIdAndDelete(existing._id);

            // Decrement totalFavorites counter on WorkerProfile
            await WorkerProfile.findByIdAndUpdate(workerId, {
                $inc: { totalFavorites: -1 }
            });

            return res.status(200).json({
                success: true,
                message: "Removed from favorites",
                isFavorited: false,
            });
        } else {
            // Favorite
            await Favorite.create({ customerId, workerId });

            // Increment totalFavorites counter on WorkerProfile
            await WorkerProfile.findByIdAndUpdate(workerId, {
                $inc: { totalFavorites: 1 }
            });

            return res.status(201).json({
                success: true,
                message: "Added to favorites",
                isFavorited: true,
            });
        }
    } catch (error) {
        console.error("Toggle Favorite Error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to toggle favorite status",
        });
    }
};

/**
 * Check if a worker profile is favorited by the logged-in customer
 * @route GET /api/favorites/check/:workerId
 */
export const checkFavorite = async (req, res) => {
    try {
        const { workerId } = req.params;
        const customerId = req.user._id;

        const existing = await Favorite.findOne({ customerId, workerId });

        return res.status(200).json({
            success: true,
            isFavorited: !!existing,
        });
    } catch (error) {
        console.error("Check Favorite Error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to check favorite status",
        });
    }
};

/**
 * Retrieve the logged-in customer's saved favorites list
 * @route GET /api/favorites
 */
export const getCustomerFavorites = async (req, res) => {
    try {
        const customerId = req.user._id;

        const favorites = await Favorite.find({ customerId })
            .populate({
                path: "workerId",
                populate: [
                    { path: "userId", select: "fullName email profileImage phoneNumber" },
                    { path: "serviceCategories", select: "name slug icon" }
                ]
            })
            .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            message: "Favorites retrieved successfully",
            data: favorites,
        });
    } catch (error) {
        console.error("Get Customer Favorites Error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to retrieve favorites list",
        });
    }
};
