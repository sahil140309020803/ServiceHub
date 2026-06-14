import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
    {
        workerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "WorkerProfile",
            required: true,
        },

        customerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        rating: {
            type: Number,
            required: true,
            min: 1,
            max: 5,
        },

        reviewText: String,

        isApproved: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
    }
);

reviewSchema.index(
    { customerId: 1, workerId: 1 },
    { unique: true }
);

export default mongoose.model("Review", reviewSchema);