const jwt = require("jsonwebtoken");

// ================== GENERATE AUTHENTICATION TOKEN ==================
// Receive a trusted database user after successful authentication.
function generateToken(user) {
    const secret = process.env.JWT_SECRET;

    // Prevent token generation with missing or short configuration.
    if (!secret || Buffer.byteLength(secret, "utf8") < 32) {
        throw new Error(
            "JWT_SECRET must contain at least 32 bytes."
        );
    }

    // tokenVersion must be explicitly selected when loading the user.
    if (
        !user ||
        !user._id ||
        !Number.isSafeInteger(user.tokenVersion) ||
        user.tokenVersion < 0
    ) {
        throw new Error("Invalid user data for token generation.");
    }

    return jwt.sign(
        {
            tokenVersion: user.tokenVersion,
        },
        secret,
        {
            algorithm: "HS256",
            subject: user._id.toString(),
            issuer: "recruitment-management-system",
            audience: "recruitment-management-system-api",
            expiresIn: "7d",
        }
    );
}

// ================== EXPORT ==================
module.exports = generateToken;