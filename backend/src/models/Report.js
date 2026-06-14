import mongoose from "mongoose";

const reportSchema = new mongoose.Schema(
    {
        reportedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        workerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "WorkerProfile",
            required: true,
        },

        reason: {
            type: String,
            required: true,
        },

        status: {
            type: String,
            enum: ["pending", "resolved", "rejected"],
            default: "pending",
        },
    },
    {
        timestamps: true,
    }
);

export default mongoose.model("Report", reportSchema);