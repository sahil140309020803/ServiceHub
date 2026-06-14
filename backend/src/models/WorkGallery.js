import mongoose from "mongoose";

const workGallerySchema = new mongoose.Schema(
    {
        workerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "WorkerProfile",
            required: true,
        },

        imageUrl: {
            type: String,
            required: true,
        },

        title: {
            type: String,
            trim: true,
        },

        description: String,
    },
    {
        timestamps: true,
    }
);

export default mongoose.model("WorkGallery", workGallerySchema);