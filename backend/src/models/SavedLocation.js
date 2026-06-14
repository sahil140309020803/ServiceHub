import mongoose from "mongoose";

const savedLocationSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        locationName: {
            type: String,
            required: true,
            trim: true,
        },

        latitude: Number,

        longitude: Number,
    },
    {
        timestamps: true,
    }
);

export default mongoose.model("SavedLocation", savedLocationSchema);