import SearchHistory from "../models/SearchHistory.js";

/**
 * Save a search query string to history
 * @route POST /api/extensions/search-history
 */
export const saveSearchQuery = async (req, res) => {
    try {
        const { searchText } = req.body;
        const userId = req.user._id;

        if (!searchText || !searchText.trim()) {
            return res.status(400).json({
                success: false,
                message: "Search text is required",
            });
        }

        const queryStr = searchText.trim();

        // Check if query already exists in history
        const existing = await SearchHistory.findOne({ userId, searchText: queryStr });

        if (existing) {
            // Update timestamp to make it recent
            existing.updatedAt = new Date();
            await existing.save();
        } else {
            // Create new history log
            await SearchHistory.create({
                userId,
                searchText: queryStr,
            });

            // Enforce limit of 5 recent searches
            const historyCount = await SearchHistory.countDocuments({ userId });
            if (historyCount > 5) {
                // Find and delete the oldest records
                const oldest = await SearchHistory.find({ userId })
                    .sort({ updatedAt: 1 })
                    .limit(historyCount - 5);
                
                const deleteIds = oldest.map((h) => h._id);
                await SearchHistory.deleteMany({ _id: { $in: deleteIds } });
            }
        }

        return res.status(200).json({
            success: true,
            message: "Search query saved to history",
        });
    } catch (error) {
        console.error("Save Search Query Error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to save search log",
        });
    }
};

/**
 * Retrieve the 5 most recent unique search terms for the user
 * @route GET /api/extensions/search-history
 */
export const getSearchHistory = async (req, res) => {
    try {
        const userId = req.user._id;

        const history = await SearchHistory.find({ userId })
            .sort({ updatedAt: -1 })
            .limit(5);

        return res.status(200).json({
            success: true,
            message: "Search history retrieved successfully",
            data: history,
        });
    } catch (error) {
        console.error("Get Search History Error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to retrieve search logs",
        });
    }
};

/**
 * Clear search history log
 * @route DELETE /api/extensions/search-history
 */
export const clearSearchHistory = async (req, res) => {
    try {
        const userId = req.user._id;

        await SearchHistory.deleteMany({ userId });

        return res.status(200).json({
            success: true,
            message: "Search history cleared successfully",
        });
    } catch (error) {
        console.error("Clear Search History Error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to clear search logs",
        });
    }
};
