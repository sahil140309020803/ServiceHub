import jwt from "jsonwebtoken";

// userId -> The Database id of user
// Returns the JWT token for the user

const generateToken = (userId) => {
    return jwt.sign(
        { id: userId },
        process.env.JWT_SECRET,
        {
            expiresIn: process.env.JWT_EXPIRES_IN || "1d",
        }
    );
};

export default generateToken;
