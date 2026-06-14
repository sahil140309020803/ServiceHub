import mongoose from "mongoose";

const contactClickSchema = new mongoose.Schema(
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

        contactType: {
            type: String,
            enum: ["call", "whatsapp"],
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

export default mongoose.model("ContactClick", contactClickSchema);