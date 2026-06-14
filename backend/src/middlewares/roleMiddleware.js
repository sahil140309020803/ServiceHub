/**
 * Middleware to restrict access to specific roles
 * @param {...string} roles - The roles allowed to access the route
 */
export const authorize = (...roles) => {
    return (req, res, next) => {

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: `'${req.user.role}' is not authorized to access this resource`,
            });
        }

        next();
    };
};

export default authorize;
