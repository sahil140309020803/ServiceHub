import ContactClick from "../models/ContactClick.js";
import WorkerProfile from "../models/WorkerProfile.js";

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

        // Group queries
        const totalClicks = await ContactClick.countDocuments({ workerId });
        const whatsappClicks = await ContactClick.countDocuments({ workerId, contactType: "whatsapp" });
        const callClicks = await ContactClick.countDocuments({ workerId, contactType: "call" });

        // Retrieve last 10 click records with customer details if authenticated
        const recentClicks = await ContactClick.find({ workerId })
            .populate("customerId", "fullName email phoneNumber")
            .sort({ createdAt: -1 })
            .limit(10);

        return res.status(200).json({
            success: true,
            message: "Contact statistics retrieved successfully",
            data: {
                totalClicks,
                whatsappClicks,
                callClicks,
                recentClicks,
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
