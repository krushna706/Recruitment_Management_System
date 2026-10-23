const express = require("express");
const path = require("node:path");
const { existsSync } = require("node:fs");
const helmet = require("helmet");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const authRoutes = require("./routes/authRoutes");
const jobRoutes = require("./routes/jobRoutes");
const applicationRoutes = require("./routes/applicationRoutes");
const userRoutes = require("./routes/userRoutes");
const contactRoutes = require("./routes/contactRoutes");
const adminRoutes = require("./routes/adminRoutes");

const ExpressError = require("./utils/ExpressError");
const errorMiddleware = require("./middleware/errorMiddleware");

// ================== APPLICATION SETUP ==================
const app = express();

app.disable("x-powered-by");

// Trust only the configured number of reverse proxies, never every forwarded IP.
const proxyHops = Number(process.env.TRUST_PROXY_HOPS || 0);
if (!Number.isInteger(proxyHops) || proxyHops < 0 || proxyHops > 10) {
    throw new Error("TRUST_PROXY_HOPS must be an integer between 0 and 10.");
}
if (proxyHops) app.set("trust proxy", proxyHops);

// ================== FRONTEND ORIGIN CONFIGURATION ==================
const clientOrigin = process.env.CLIENT_ORIGIN;

if (!clientOrigin) {
    throw new Error("CLIENT_ORIGIN is missing in environment configuration.");
}

// Accept only a complete HTTP/HTTPS origin without paths or credentials.
const clientUrl = new URL(clientOrigin);

if (!["http:", "https:"].includes(clientUrl.protocol) || clientUrl.origin !== clientOrigin) {
    throw new Error("CLIENT_ORIGIN must be an HTTP/HTTPS origin without a path or trailing slash.");
}

if (process.env.NODE_ENV === "production" && clientUrl.protocol !== "https:") {
    throw new Error("CLIENT_ORIGIN must use HTTPS in production.");
}

// ================== SECURITY HEADERS ==================
app.use(
    helmet({
        contentSecurityPolicy: {
            directives: {
                imgSrc: ["'self'", "data:", "blob:", "https://res.cloudinary.com"],
                frameSrc: ["'self'", "blob:"],
                upgradeInsecureRequests: process.env.NODE_ENV === "production" ? [] : null,
            },
        },
    })
);

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
                return next(new ExpressError(403, "Invalid request origin."));
            }
        }
    }

    if (requestOrigin !== clientOrigin) {
        return next(new ExpressError(403, "Request origin is not allowed."));
    }

    return next();
});

// ================== REQUEST BODY PARSING ==================
// JSON requests only. Multipart resume uploads are handled by Multer.
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

// ================== API ROUTES ==================
app.use("/api/auth", authRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/applications", applicationRoutes);
app.use("/api/users", userRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/admin", adminRoutes);

// ================== OPTIONAL SAME-ORIGIN FRONTEND ==================
// Enable only when this service also hosts the built React application.
if (process.env.SERVE_FRONTEND === "true") {
    const frontendPath = path.resolve(__dirname, "../frontend/dist");
    const indexPath = path.join(frontendPath, "index.html");
    if (!existsSync(indexPath))
        throw new Error("Build the frontend before enabling SERVE_FRONTEND.");
    app.use(express.static(frontendPath, { index: false }));
    app.get("/{*path}", (req, res, next) => {
        if (
            req.path === "/api" ||
            req.path.startsWith("/api/") ||
            path.extname(req.path) ||
            !req.accepts("html")
        )
            return next();
        res.set("Cache-Control", "no-store");
        return res.sendFile(indexPath);
    });
}

// ================== ROUTE NOT FOUND ==================
app.use((req, res, next) => {
    next(new ExpressError(404, "Route not found."));
});

// ================== CENTRAL ERROR HANDLER ==================
app.use(errorMiddleware);

// ================== EXPORT ==================
module.exports = app;
