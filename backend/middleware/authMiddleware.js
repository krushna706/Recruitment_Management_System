const jwt = require("jsonwebtoken");

const User = require("../models/User");
const ExpressError = require("../utils/ExpressError");

// ================== AUTHENTICATION MIDDLEWARE ==================
// Allow access only when the token and current account are valid.
async function authMiddleware(req, res, next) {
    try {
        const token = req.cookies?.token;

        // Reject requests without a valid cookie value.
        if (typeof token !== "string" || !token) {
            return next(new ExpressError(401, "Please login to continue."));
        }

        const secret = process.env.JWT_SECRET;

        // Treat invalid server configuration as an internal error.
        if (!secret || Buffer.byteLength(secret, "utf8") < 32) {
            throw new Error("Invalid JWT_SECRET configuration.");
        }

        let decoded;

        try {
            // Verify signature, expiry and intended token usage.
            decoded = jwt.verify(token, secret, {
                algorithms: ["HS256"],
                issuer: "recruitment-management-system",
                audience: "recruitment-management-system-api",
            });
        } catch (error) {
            if (
                error.name === "TokenExpiredError" ||
                error.name === "JsonWebTokenError" ||
                error.name === "NotBeforeError"
            ) {
                return next(
                    new ExpressError(401, "Your session is invalid or expired. Please login again.")
                );
            }

            throw error;
        }

        // Validate claims before using them in a database query.
        if (
            !decoded ||
            typeof decoded !== "object" ||
            typeof decoded.sub !== "string" ||
            !/^[a-fA-F0-9]{24}$/.test(decoded.sub) ||
            !Number.isSafeInteger(decoded.tokenVersion) ||
            decoded.tokenVersion < 0 ||
            !Number.isInteger(decoded.exp)
        ) {
            return next(new ExpressError(401, "Your session is invalid. Please login again."));
        }

        // Use current database values for account permissions.
        const user = await User.findById(decoded.sub)
            .select("_id role status +tokenVersion +mustChangePassword")
            .lean();

        // Deleted accounts cannot continue using existing tokens.
        if (!user) {
            return next(new ExpressError(401, "Your session is invalid. Please login again."));
        }

        // Reject access for inactive accounts.
        if (user.status !== "Active") {
            return next(new ExpressError(403, "Your account is inactive. Please contact support."));
        }

        // Reject tokens issued before a session revocation.
        if (user.tokenVersion !== decoded.tokenVersion) {
            return next(new ExpressError(401, "Your session has ended. Please login again."));
        }

        // ================== INITIAL ADMIN PASSWORD ENFORCEMENT ==================
        // Block protected APIs until the initial password is changed.
        if (user.role === "admin" && user.mustChangePassword) {
            const requestPath = req.originalUrl.split("?")[0];

            // Allow only session checks, logout and password change.
            const allowedRequest =
                (req.method === "GET" &&
                    (requestPath === "/api/auth/me" || requestPath === "/api/admin/me/profile")) ||
                (req.method === "POST" && requestPath === "/api/auth/logout") ||
                (req.method === "PATCH" && requestPath === "/api/admin/me/password");

            if (!allowedRequest) {
                return next(
                    new ExpressError(403, "Please change your initial password before continuing.")
                );
            }
        }

        // Pass trusted account details to later middleware/controllers.
        req.user = {
            _id: user._id,
            role: user.role,
            status: user.status,
        };

        return next();
    } catch (error) {
        // Forward database and unexpected errors to the central handler.
        return next(error);
    }
}

// ================== EXPORT ==================
module.exports = authMiddleware;
