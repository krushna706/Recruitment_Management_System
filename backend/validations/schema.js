const Joi = require("joi");

// ================== COMMON EMAIL RULE ==================
// Keep email formatting consistent across authentication requests.
const emailRule = Joi.string()
    .trim()
    .lowercase()
    .email()
    .max(254)
    .required()
    .messages({
        "string.base": "Email must be a string.",
        "string.empty": "Email is required.",
        "string.email": "Enter a valid email address.",
        "string.max": "Email cannot exceed 254 characters.",
        "any.required": "Email is required.",
    });

// ================== COMMON PASSWORD RULE ==================
// Do not trim or lowercase passwords.
// Reject values exceeding bcrypt's 72-byte input limit.
const passwordRule = Joi.string()
    .max(72)
    .custom((value, helpers) => {
        if (Buffer.byteLength(value, "utf8") > 72) {
            return helpers.error("password.byteLimit");
        }

        return value;
    }, "password byte limit")
    .required()
    .messages({
        "string.base": "Password must be a string.",
        "string.empty": "Password is required.",
        "string.max": "Password cannot exceed 72 UTF-8 bytes.",
        "password.byteLimit": "Password cannot exceed 72 UTF-8 bytes.",
        "any.required": "Password is required.",
    });

// ================== SIGNUP VALIDATION ==================
// Public signup accepts only basic account details.
const signupSchema = Joi.object({
    name: Joi.string()
        .trim()
        .min(2)
        .max(100)
        .required()
        .messages({
            "string.base": "Name must be a string.",
            "string.empty": "Name is required.",
            "string.min": "Name must contain at least 2 characters.",
            "string.max": "Name cannot exceed 100 characters.",
            "any.required": "Name is required.",
        }),

    email: emailRule,

    phone: Joi.string()
        .trim()
        .pattern(/^[6-9]\d{9}$/)
        .required()
        .messages({
            "string.base": "Phone number must be a string.",
            "string.empty": "Phone number is required.",
            "string.pattern.base": "Enter a valid 10-digit Indian mobile number.",
            "any.required": "Phone number is required.",
        }),

    password: passwordRule
        .min(6)
        .messages({
            "string.min": "Password must contain at least 6 characters.",
        }),
})
    .required()
    .unknown(false)
    .messages({
        "object.base": "Request body must be a JSON object.",
        "object.unknown": "Request contains an unsupported field.",
        "any.required": "Request body is required.",
    });

// ================== LOGIN VALIDATION ==================
// Login checks input format. Credentials are verified by the controller.
const loginSchema = Joi.object({
    email: emailRule,

    password: passwordRule,
})
    .required()
    .unknown(false)
    .messages({
        "object.base": "Request body must be a JSON object.",
        "object.unknown": "Request contains an unsupported field.",
        "any.required": "Request body is required.",
    });

// ================== EXPORTS ==================
module.exports = {
    signupSchema,
    loginSchema,
};