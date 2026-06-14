import mongoose from "mongoose";

const searchHistorySchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },

        searchText: String,

        categoryId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Category",
        },

        location: String,
    },
    {
        timestamps: true,
    }
);

export default mongoose.model("SearchHistory", searchHistorySchema);