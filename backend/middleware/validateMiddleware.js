const ExpressError = require("../utils/ExpressError");

// ================== REQUEST BODY VALIDATION ==================
// jsonFields is used when multipart form fields contain JSON text.
function validateMiddleware(schema, { jsonFields = [] } = {}) {
    return (req, res, next) => {
        // ================== PARSE JSON FORM FIELDS ==================
        for (const field of jsonFields) {
            const fieldValue = req.body?.[field];

            // Missing fields are handled by the Joi schema.
            if (fieldValue === undefined) {
                continue;
            }

            if (typeof fieldValue !== "string") {
                return next(new ExpressError(400, `${field} must be sent as JSON text.`));
            }

            try {
                req.body[field] = JSON.parse(fieldValue);
            } catch {
                return next(new ExpressError(400, `${field} contains invalid JSON.`));
            }
        }

        // ================== VALIDATE REQUEST DATA ==================
        const { error, value } = schema.validate(req.body, {
            abortEarly: false,
            convert: true,
            stripUnknown: false,
        });

        if (error) {
            const message = error.details.map((detail) => detail.message).join(" ");

            return next(new ExpressError(400, message));
        }

        // Pass validated and normalized values to the controller.
        req.body = value;

        return next();
    };
}

// ================== EXPORT ==================
module.exports = validateMiddleware;
