const express = require("express");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");

const ExpressError = require("./utils/ExpressError");
const errorMiddleware = require("./middleware/errorMiddleware");

// ================== APPLICATION SETUP ==================
const app = express();

// Hide the Express framework identification header.
app.disable("x-powered-by");

// ================== SECURITY HEADERS ==================
// Add common HTTP security headers to responses.
app.use(helmet());

// ================== REQUEST BODY PARSING ==================
// Read JSON request bodies and limit their size.
app.use(express.json({ limit: "100kb" }));

// ================== COOKIE PARSING ==================
// Read cookies sent by the browser.
// Authentication middleware will verify the JWT separately.
app.use(cookieParser());

// ================== HEALTH CHECK ==================
// Check whether the API server is responding.
app.get("/api/health", (req, res) => {
    res.status(200).json({
        success: true,
        message: "Recruitment Management System API is running.",
    });
});

// ================== APPLICATION ROUTES ==================
// Register feature routes here as their modules are completed.

// ================== ROUTE NOT FOUND ==================
// Handle requests that do not match any registered route.
app.use((req, res, next) => {
    next(new ExpressError(404, "Route not found."));
});

// ================== CENTRAL ERROR HANDLER ==================
// Keep error handling after all routes and middleware.
app.use(errorMiddleware);

// ================== EXPORT ==================
module.exports = app;