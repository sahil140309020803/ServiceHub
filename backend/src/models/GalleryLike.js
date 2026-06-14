import mongoose from "mongoose";

const galleryLikeSchema = new mongoose.Schema(
    {
        galleryId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "WorkGallery",
            required: true,
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

// Prevent duplicate likes by creating a compound unique index
galleryLikeSchema.index({ galleryId: 1, userId: 1 }, { unique: true });

export default mongoose.model("GalleryLike", galleryLikeSchema);
