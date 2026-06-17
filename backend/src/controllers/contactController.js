import ContactClick from "../models/ContactClick.js";
import WorkerProfile from "../models/WorkerProfile.js";
import Favorite from "../models/Favorite.js";
import ProfileView from "../models/ProfileView.js";

/**
 * Log a customer contact click (Call or WhatsApp)
 * @route POST /api/extensions/contacts
 */
export const logContactClick = async (req, res) => {
    try {
        const { workerId, contactType } = req.body;
        const customerId = req.user ? req.user._id : null;

        if (!workerId || !contactType) {
            return res.status(400).json({
                success: false,
                message: "Worker profile ID and contact type (call/whatsapp) are required",
            });
        }

        if (contactType !== "call" && contactType !== "whatsapp") {
            return res.status(400).json({
                success: false,
                message: "Invalid contact type. Must be 'call' or 'whatsapp'",
            });
        }

        // Validate worker exists
        const worker = await WorkerProfile.findById(workerId);
        if (!worker) {
            return res.status(404).json({
                success: false,
                message: "Worker profile not found",
            });
        }

        const click = await ContactClick.create({
            customerId,
            workerId,
            contactType,
        });

        return res.status(201).json({
            success: true,
            message: "Contact click logged successfully",
            data: click,
        });
    } catch (error) {
        console.error("Log Contact Click Error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to log contact click",
        });
    }
};

/**
 * Get contact leads statistics for the logged-in professional
 * @route GET /api/extensions/contacts/stats
 */
export const getContactStats = async (req, res) => {
    try {
        // Enforce user has a worker profile
        const profile = await WorkerProfile.findOne({ userId: req.user._id });
        if (!profile) {
            return res.status(404).json({
                success: false,
                message: "No professional worker profile found for this account",
            });
        }

        const workerId = profile._id;

        // Define start of today (local time midnight)
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);

        // Group queries
        const totalClicks = await ContactClick.countDocuments({ workerId });
        const whatsappClicks = await ContactClick.countDocuments({ workerId, contactType: "whatsapp" });
        const callClicks = await ContactClick.countDocuments({ workerId, contactType: "call" });

        // Today's clicks
        const whatsappClicksToday = await ContactClick.countDocuments({
            workerId,
            contactType: "whatsapp",
            createdAt: { $gte: startOfToday }
        });
        const callClicksToday = await ContactClick.countDocuments({
            workerId,
            contactType: "call",
            createdAt: { $gte: startOfToday }
        });

        // Favorites stats
        const totalFavorites = await Favorite.countDocuments({ workerId });
        const favoritesToday = await Favorite.countDocuments({
            workerId,
            createdAt: { $gte: startOfToday }
        });

        // Retrieve last 30 click records with customer details
        const recentClicks = await ContactClick.find({ workerId })
            .populate("customerId", "fullName email phoneNumber")
            .sort({ createdAt: -1 })
            .limit(30);

        // Retrieve last 30 favorites records
        const recentFavorites = await Favorite.find({ workerId })
            .populate("customerId", "fullName email phoneNumber")
            .sort({ createdAt: -1 })
            .limit(30);

        // Construct unified chronological activity list
        const activities = [];

        recentClicks.forEach(click => {
            const customerName = click.customerId?.fullName || "A customer";
            activities.push({
                _id: click._id,
                type: click.contactType, // "whatsapp" | "call"
                text: `Someone tried to contact you via ${click.contactType === "whatsapp" ? "WhatsApp" : "Phone Call"}`,
                createdAt: click.createdAt,
            });
        });

        recentFavorites.forEach(fav => {
            const customerName = fav.customerId?.fullName || "A customer";
            activities.push({
                _id: fav._id,
                type: "favorite",
                text: `Someone added you to favourites`,
                createdAt: fav.createdAt,
            });
        });

        // Retrieve last 30 profile views dynamically
        const recentViews = await ProfileView.find({ workerId })
            .sort({ createdAt: -1 })
            .limit(30);

        recentViews.forEach(view => {
            activities.push({
                _id: view._id,
                type: "view",
                text: "Someone viewed your profile",
                createdAt: view.createdAt,
            });
        });

        // Sort activities by createdAt desc
        activities.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        return res.status(200).json({
            success: true,
            message: "Contact statistics retrieved successfully",
            data: {
                totalClicks,
                whatsappClicks,
                callClicks,
                whatsappClicksToday,
                callClicksToday,
                totalFavorites,
                favoritesToday,
                recentClicks,
                activities,
            },
        });
    } catch (error) {
        console.error("Get Contact Stats Error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to retrieve contact statistics",
        });
    }
};
