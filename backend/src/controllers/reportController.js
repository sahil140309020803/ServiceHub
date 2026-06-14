import Report from "../models/Report.js";
import WorkerProfile from "../models/WorkerProfile.js";

/**
 * Submit a report/flag against a worker profile
 * @route POST /api/extensions/reports
 */
export const submitReport = async (req, res) => {
    try {
        const { workerId, reason } = req.body;
        const reportedBy = req.user._id;

        if (!workerId || !reason || !reason.trim()) {
            return res.status(400).json({
                success: false,
                message: "Worker profile ID and report reason are required",
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

        // Check if report already submitted by this user for this worker
        const existing = await Report.findOne({ reportedBy, workerId });
        if (existing) {
            return res.status(400).json({
                success: false,
                message: "You have already submitted a report against this professional profile",
            });
        }

        const report = await Report.create({
            reportedBy,
            workerId,
            reason: reason.trim(),
            status: "pending",
        });

        return res.status(201).json({
            success: true,
            message: "Report submitted successfully. Administrators will review the profile.",
            data: report,
        });
    } catch (error) {
        console.error("Submit Report Error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to submit report",
        });
    }
};

/**
 * Retrieve all profile reports (Admin only)
 * @route GET /api/extensions/reports
 */
export const getReports = async (req, res) => {
    try {
        // Enforce admin role
        if (req.user.role !== "admin") {
            return res.status(403).json({
                success: false,
                message: "Access restricted to administrators only",
            });
        }

        const reports = await Report.find()
            .populate("reportedBy", "fullName email")
            .populate({
                path: "workerId",
                populate: { path: "userId", select: "fullName email" }
            })
            .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            message: "Reports retrieved successfully",
            data: reports,
        });
    } catch (error) {
        console.error("Get Reports Error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to retrieve reports list",
        });
    }
};
