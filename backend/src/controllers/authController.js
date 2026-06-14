import bcrypt from "bcryptjs";
import User from "../models/User.js";
import generateToken from "../utils/generateToken.js";

/**
 * Register User
 * POST /api/auth/register
 */
export const register = async (req, res) => {
    try {
        const {
            fullName,
            email,
            phoneNumber,
            password,
            role,
        } = req.body;

        if (!fullName || !email || !phoneNumber || !password) {
            return res.status(400).json({
                success: false,
                message: "Please provide all required fields",
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 6 characters long",
            });
        }

        const normalizedEmail = email.toLowerCase().trim();

        const existingEmail = await User.findOne({
            email: normalizedEmail,
        });

        if (existingEmail) {
            return res.status(400).json({
                success: false,
                message: "Email is already registered",
            });
        }

        const existingPhone = await User.findOne({
            phoneNumber,
        });

        if (existingPhone) {
            return res.status(400).json({
                success: false,
                message: "Phone number is already registered",
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await User.create({
            fullName: fullName.trim(),
            email: normalizedEmail,
            phoneNumber: phoneNumber.trim(),
            password: hashedPassword,

            // Prevent admin registration
            role: role === "worker" ? "worker" : "customer",
        });

        const token = generateToken(user._id);

        return res.status(201).json({
            success: true,
            message: "User registered successfully",
            data: {
                token,
                user: {
                    _id: user._id,
                    fullName: user.fullName,
                    email: user.email,
                    phoneNumber: user.phoneNumber,
                    role: user.role,
                    profileImage: user.profileImage,
                    isActive: user.isActive,
                    createdAt: user.createdAt,
                    updatedAt: user.updatedAt,
                },
            },
        });
    } catch (error) {
        console.error("Register Error:", error);

        return res.status(500).json({
            success: false,
            message: "Registration failed",
        });
    }
};

/**
 * Login User
 * POST /api/auth/login
 */
export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Please provide email and password",
            });
        }

        const normalizedEmail = email.toLowerCase().trim();

        const user = await User.findOne({
            email: normalizedEmail,
        });

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password",
            });
        }

        if (!user.isActive) {
            return res.status(403).json({
                success: false,
                message: "Account has been disabled",
            });
        }

        const isPasswordMatched = await bcrypt.compare(
            password,
            user.password
        );

        if (!isPasswordMatched) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password",
            });
        }

        user.lastLogin = new Date();
        await user.save();

        const token = generateToken(user._id);

        return res.status(200).json({
            success: true,
            message: "Login successful",
            data: {
                token,
                user: {
                    _id: user._id,
                    fullName: user.fullName,
                    email: user.email,
                    phoneNumber: user.phoneNumber,
                    role: user.role,
                    profileImage: user.profileImage,
                    isActive: user.isActive,
                    lastLogin: user.lastLogin,
                    createdAt: user.createdAt,
                    updatedAt: user.updatedAt,
                },
            },
        });
    } catch (error) {
        console.error("Login Error:", error);

        return res.status(500).json({
            success: false,
            message: "Login failed",
        });
    }
};

/**
 * Get Current User
 * GET /api/auth/me
 */
export const getMe = async (req, res) => {
    try {
        return res.status(200).json({
            success: true,
            message: "User profile retrieved successfully",
            data: req.user,
        });
    } catch (error) {
        console.error("Get Me Error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to retrieve profile",
        });
    }
};

/**
 * Update Current User Profile
 * PUT /api/auth/update
 */
export const updateMe = async (req, res) => {
    try {
        const { fullName, email, phoneNumber } = req.body;
        const user = await User.findById(req.user._id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        // Email uniqueness check if email is updated
        if (email && email.toLowerCase().trim() !== user.email.toLowerCase()) {
            const emailExists = await User.findOne({ email: email.toLowerCase().trim() });
            if (emailExists) {
                return res.status(400).json({
                    success: false,
                    message: "Email is already registered by another account",
                });
            }
            user.email = email.toLowerCase().trim();
        }

        // Phone number uniqueness check if phone is updated
        if (phoneNumber && phoneNumber.trim() !== user.phoneNumber) {
            const phoneExists = await User.findOne({ phoneNumber: phoneNumber.trim() });
            if (phoneExists) {
                return res.status(400).json({
                    success: false,
                    message: "Phone number is already registered by another account",
                });
            }
            user.phoneNumber = phoneNumber.trim();
        }

        if (fullName) {
            user.fullName = fullName.trim();
        }

        await user.save();

        const updatedUser = {
            _id: user._id,
            fullName: user.fullName,
            email: user.email,
            phoneNumber: user.phoneNumber,
            role: user.role,
            profileImage: user.profileImage,
            isActive: user.isActive,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
        };

        return res.status(200).json({
            success: true,
            message: "Profile updated successfully",
            data: updatedUser,
        });
    } catch (error) {
        console.error("Update User Error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to update profile",
        });
    }
};