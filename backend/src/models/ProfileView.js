import mongoose from "mongoose";

const profileViewSchema = new mongoose.Schema(
    {
        customerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
        workerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "WorkerProfile",
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

export default mongoose.model("ProfileView", profileViewSchema);
