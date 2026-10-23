const ExpressError = require("../utils/ExpressError");

// ================== CENTRAL ERROR HANDLER ==================
// Convert application errors into consistent JSON responses.
function errorMiddleware(error, req, res, next) {
    // Delegate to Express if the response has already started.
    if (res.headersSent) {
        return next(error);
    }

    let statusCode = 500;
    let message = "Something went wrong. Please try again later.";

    // Handle intentionally created application errors.
    // Expose only deliberately created application errors, never raw provider errors.
    if (
        error instanceof ExpressError &&
        Number.isInteger(error.statusCode) &&
        error.statusCode >= 400 &&
        error.statusCode <= 599
    ) {
        statusCode = error.statusCode;
        message = error.message;
    }

    // Handle malformed JSON sent in the request body.
    if (error.type === "entity.parse.failed" && error.status === 400) {
        statusCode = 400;
        message = "Invalid JSON in request body.";
    }

    // Handle request bodies larger than the configured limit.
    if (error.type === "entity.too.large" && error.status === 413) {
        statusCode = 413;
        message = "Request body is too large.";
    }

    // Log error details during development only.
    if (statusCode >= 500) {
        if (process.env.NODE_ENV !== "production") {
            console.error("Server error:", error);
        } else {
            console.error("An unexpected server error occurred.");
        }
    }

    return res.status(statusCode).json({
        success: false,
        message,
    });
}

// ================== EXPORT ==================
module.exports = errorMiddleware;
