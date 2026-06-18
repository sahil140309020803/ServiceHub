import mongoose from "mongoose";

let cachedConnection = null;

const connectDB = async () => {
    if (cachedConnection) {
        return cachedConnection;
    }

    try {
        const conn = await mongoose.connect(process.env.MONGO_URI);
        cachedConnection = conn;
        console.log("✅ MongoDB Connected");
        return cachedConnection;
    } catch (error) {
        console.error("❌ MongoDB Connection Failed");
        console.error(error.message);
        throw error;
    }
};

export default connectDB;