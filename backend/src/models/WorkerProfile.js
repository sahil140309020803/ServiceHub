import mongoose from "mongoose";

const workerProfileSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            unique: true,
        },

        profession: {
            type: String,
            required: true,
            trim: true,
        },

        experienceYears: {
            type: Number,
            default: 0,
            min: 0,
        },

        about: String,

        skills: [String],

        serviceCategories: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Category",
            },
        ],

        serviceAreas: [
            {
                area: String,
                city: String,
                state: String,
            },
        ],

        address: String,

        latitude: Number,

        longitude: Number,

        whatsappNumber: String,

        averageRating: {
            type: Number,
            default: 0,
            min: 0,
            max: 5,
        },

        totalReviews: {
            type: Number,
            default: 0,
        },

        profileViews: {
            type: Number,
            default: 0,
        },

        totalFavorites: {
            type: Number,
            default: 0,
        },

        isVerified: {
            type: Boolean,
            default: false,
        },

        isFeatured: {
            type: Boolean,
            default: false,
        },

        availabilityStatus: {
            type: String,
            enum: ["available", "busy", "offline"],
            default: "available",
        },
    },
    {
        timestamps: true,
    }
);

export default mongoose.model("WorkerProfile", workerProfileSchema);