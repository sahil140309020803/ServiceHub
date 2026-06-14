import express from 'express'
import cors from "cors";
import dotenv from "dotenv";
import connectDB from './src/config/db.js';
import authRoutes from './src/routes/authRoutes.js';

// Configuring environment variables
dotenv.config();

const app = express();

// MongoDB Connection
connectDB();

// Middlewares
app.use(cors());                // Allows frontend to connect with backend
app.use(express.json());        // Allows to parse JSON data from frontend
app.use(express.urlencoded({ extended: true })); // Allows to parse URL-encoded data from frontend


// Routes
app.use('/api/auth', authRoutes);


// Health Check Route
app.get("/", (req, res) => {
    res.status(200).json({
        success: true,
        message: "ServiceHub API is running 🚀",
    });
});

const PORT = process.env.PORT || 5000

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
})
