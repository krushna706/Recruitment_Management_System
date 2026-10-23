// ================== CUSTOM ERROR CLASS ==================
// Attach an HTTP status code to an application error.
class ExpressError extends Error {
    constructor(statusCode, message) {
        super(message);

        this.name = "ExpressError";
        this.statusCode = statusCode;

        // Keep the stack trace focused on where the error was created.
        Error.captureStackTrace(this, ExpressError);
    }
}

// ================== EXPORT ==================
module.exports = ExpressError;
