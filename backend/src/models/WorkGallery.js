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

        viewsCount: {
            type: Number,
            default: 0,
        },

        likesCount: {
            type: Number,
            default: 0,
        },
    },
    {
        timestamps: true,
    }
);

export default mongoose.model("WorkGallery", workGallerySchema);