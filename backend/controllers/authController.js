const bcrypt = require("bcrypt");

const User = require("../models/User");
const ExpressError = require("../utils/ExpressError");
const generateToken = require("../utils/generateToken");

// ================== AUTHENTICATION CONFIGURATION ==================
const COOKIE_NAME = "token";
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;
const PASSWORD_SALT_ROUNDS = 12;

// ================== COOKIE OPTIONS ==================
// Use the same scope when setting and clearing the cookie.
function getCookieOptions() {
    return {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
    };
}

// ================== SAFE USER RESPONSE ==================
// Return only the account fields needed by the frontend.
function getUserResponse(user) {
    return {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        qualification: user.qualification || "",
        experience: user.experience || "",
        skills: user.skills || [],
        role: user.role,
        status: user.status,
        createdAt: user.createdAt,
        avatar: { url: user.avatar?.url || "" },
        mustChangePassword: user.role === "admin" && Boolean(user.mustChangePassword),
    };
}

// ================== SEND AUTHENTICATION RESPONSE ==================
// Store the JWT in an HttpOnly cookie, not in the JSON response.
function sendAuthResponse(res, user, statusCode, message) {
    const token = generateToken(user);

    res.cookie(COOKIE_NAME, token, {
        ...getCookieOptions(),
        maxAge: COOKIE_MAX_AGE,
    });

    res.set("Cache-Control", "no-store");

    return res.status(statusCode).json({
        success: true,
        message,
        user: getUserResponse(user),
    });
}

// ================== SIGNUP ==================
// POST /api/auth/signup
// Public signup always creates a normal user account.
async function signup(req, res, next) {
    try {
        const { name, email, phone, password } = req.body;

        const existingUser = await User.exists({ email });

        if (existingUser) {
            return next(new ExpressError(409, "An account with this email already exists."));
        }

        // Hash the password before creating the database document.
        const passwordHash = await bcrypt.hash(password, PASSWORD_SALT_ROUNDS);

        // Explicitly select allowed fields.
        // Never accept account permissions from the request body.
        const user = await User.create({
            name,
            email,
            phone,
            passwordHash,
            role: "user",
            status: "Active",
            tokenVersion: 0,
            lastLoginAt: new Date(),
        });

        return sendAuthResponse(res, user, 201, "Account created successfully.");
    } catch (error) {
        // Handle concurrent signup requests using the same email.
        if (error.code === 11000 && error.keyPattern?.email) {
            return next(new ExpressError(409, "An account with this email already exists."));
        }

        return next(error);
    }
}

// ================== LOGIN ==================
// POST /api/auth/login
// Both users and admins use this endpoint.
async function login(req, res, next) {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email }).select("+passwordHash +tokenVersion");

        if (!user) {
            return next(new ExpressError(401, "Invalid email or password."));
        }

        // Compare the entered password with the stored password hash.
        const passwordMatches = await bcrypt.compare(password, user.passwordHash);

        if (!passwordMatches) {
            return next(new ExpressError(401, "Invalid email or password."));
        }

        if (user.status !== "Active") {
            return next(new ExpressError(403, "Your account is inactive. Please contact support."));
        }

        // Recheck account state before completing the login.
        // Reject if credentials or session version changed meanwhile.
        const currentUser = await User.findOneAndUpdate(
            {
                _id: user._id,
                status: "Active",
                passwordHash: user.passwordHash,
                tokenVersion: user.tokenVersion,
            },
            {
                $set: {
                    lastLoginAt: new Date(),
                },
            },
            {
                returnDocument: "after",
                runValidators: true,
            }
        ).select("+tokenVersion +mustChangePassword");

        if (!currentUser) {
            return next(new ExpressError(401, "Your account details changed. Please login again."));
        }

        return sendAuthResponse(res, currentUser, 200, "Login successful.");
    } catch (error) {
        return next(error);
    }
}

// ================== LOGOUT ==================
// POST /api/auth/logout
// Authentication middleware must run before this controller.
// Revoke all existing login tokens for this account.
async function logout(req, res, next) {
    try {
        await User.updateOne(
            { _id: req.user._id },
            {
                $inc: {
                    tokenVersion: 1,
                },
            }
        );

        // Do not pass maxAge when clearing the cookie.
        res.clearCookie(COOKIE_NAME, getCookieOptions());
        res.set("Cache-Control", "no-store");

        return res.status(200).json({
            success: true,
            message: "Logged out successfully.",
        });
    } catch (error) {
        return next(error);
    }
}

// ================== CURRENT USER ==================
// GET /api/auth/me
// Return account details without creating a new token.
async function getCurrentUser(req, res, next) {
    try {
        const user = await User.findById(req.user._id)
            .select(
                "name email phone qualification experience skills role status createdAt avatar.url +mustChangePassword"
            )
            .lean();

        if (!user) {
            return next(new ExpressError(401, "Please login again."));
        }

        if (user.status !== "Active") {
            return next(new ExpressError(403, "Your account is inactive. Please contact support."));
        }

        res.set("Cache-Control", "no-store");

        return res.status(200).json({
            success: true,
            user: getUserResponse(user),
        });
    } catch (error) {
        return next(error);
    }
}

// ================== EXPORTS ==================
module.exports = {
    signup,
    login,
    logout,
    getCurrentUser,
};
