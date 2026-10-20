const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const authRoutes = require("./routes/authRoutes");
const ExpressError = require("./utils/ExpressError");
const errorMiddleware = require("./middleware/errorMiddleware");

// ================== APPLICATION SETUP ==================
const app = express();

app.disable("x-powered-by");

// ================== FRONTEND ORIGIN CONFIGURATION ==================
const clientOrigin = process.env.CLIENT_ORIGIN;

if (!clientOrigin) {
    throw new Error("CLIENT_ORIGIN is missing in environment configuration.");
}

// Accept only a complete HTTP/HTTPS origin without paths or credentials.
const clientUrl = new URL(clientOrigin);

if (
    !["http:", "https:"].includes(clientUrl.protocol) ||
    clientUrl.origin !== clientOrigin
) {
    throw new Error(
        "CLIENT_ORIGIN must be an HTTP/HTTPS origin without a path or trailing slash."
    );
}

if (
    process.env.NODE_ENV === "production" &&
    clientUrl.protocol !== "https:"
) {
    throw new Error("CLIENT_ORIGIN must use HTTPS in production.");
}

// ================== SECURITY HEADERS ==================
app.use(helmet());

// ================== CORS CONFIGURATION ==================
// Allow the configured frontend to make credentialed requests.
app.use(
    cors({
        origin: clientOrigin,
        credentials: true,
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type"],
        exposedHeaders: ["Retry-After"],
    })
);

// ================== REQUEST ORIGIN CHECK ==================
// Protect state-changing API requests against cross-site submissions.
app.use("/api", (req, res, next) => {
    // Read-only requests must never change application data.
    if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
        return next();
    }

    let requestOrigin = req.get("Origin");

    // Use Referer only when Origin is absent.
    if (!requestOrigin) {
        const referer = req.get("Referer");

        if (referer) {
            try {
                requestOrigin = new URL(referer).origin;
            } catch {
                return next(
                    new ExpressError(403, "Invalid request origin.")
                );
            }
        }
    }

    // Reject missing, null or unapproved origins.
    if (requestOrigin !== clientOrigin) {
        return next(
            new ExpressError(403, "Request origin is not allowed.")
        );
    }

    return next();
});

// ================== REQUEST BODY PARSING ==================
app.use(express.json({ limit: "100kb" }));

// ================== COOKIE PARSING ==================
app.use(cookieParser());

// ================== HEALTH CHECK ==================
app.get("/api/health", (req, res) => {
    res.status(200).json({
        success: true,
        message: "Recruitment Management System API is running.",
    });
});

// ================== AUTHENTICATION ROUTES ==================
app.use("/api/auth", authRoutes);

// ================== ROUTE NOT FOUND ==================
app.use((req, res, next) => {
    next(new ExpressError(404, "Route not found."));
});

// ================== CENTRAL ERROR HANDLER ==================
app.use(errorMiddleware);

// ================== EXPORT ==================
module.exports = app;