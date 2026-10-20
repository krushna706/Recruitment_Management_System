const ExpressError = require("../utils/ExpressError");

// ================== REQUEST BODY VALIDATION ==================
// Create middleware using the provided Joi schema.
function validateMiddleware(schema) {
    return (req, res, next) => {
        const { error, value } = schema.validate(req.body, {
            abortEarly: false,
            convert: true,
            stripUnknown: false,
        });

        // Forward validation errors to the central error handler.
        if (error) {
            const message = error.details
                .map((detail) => detail.message)
                .join(" ");

            return next(new ExpressError(400, message));
        }

        // Use validated and normalized data in the controller.
        req.body = value;

        return next();
    };
}

// ================== EXPORT ==================
module.exports = validateMiddleware;