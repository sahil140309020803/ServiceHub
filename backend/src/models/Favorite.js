import mongoose from "mongoose";

const favoriteSchema = new mongoose.Schema(
    {
        customerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
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

favoriteSchema.index(
    { customerId: 1, workerId: 1 },
    { unique: true }
);

export default mongoose.model("Favorite", favoriteSchema);