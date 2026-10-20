const mongoose = require("mongoose");

const { Schema } = mongoose;

// ================== RESUME SCHEMA ==================
// Store resume metadata. The actual file stays in private storage.
const resumeSchema = new Schema(
    {
        publicId: {
            type: String,
            required: true,
            select: false,
        },

        name: {
            type: String,
            required: true,
            trim: true,
            maxlength: 255,
        },

        mimeType: {
            type: String,
            required: true,
        },

        size: {
            type: Number,
            required: true,
            min: 1,
        },

        uploadedAt: {
            type: Date,
            default: Date.now,
        },
    },
    {
        _id: false,
    }
);

// ================== USER SCHEMA ==================
const userSchema = new Schema(
    {
        // ================== BASIC DETAILS ==================
        name: {
            type: String,
            required: true,
            trim: true,
            maxlength: 100,
        },

        email: {
            type: String,
            required: true,
            trim: true,
            lowercase: true,
            maxlength: 254,
            unique: true,
        },

        phone: {
            type: String,
            trim: true,
            maxlength: 20,
            default: "",
        },

        // ================== AUTHENTICATION ==================
        // Hash passwords with bcrypt before saving.
        passwordHash: {
            type: String,
            required: true,
            select: false,
            match: /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/,
        },

        role: {
            type: String,
            enum: ["user", "admin"],
            default: "user",
            required: true,
        },

        status: {
            type: String,
            enum: ["Active", "Inactive"],
            default: "Active",
            required: true,
        },

        // Increment this value when existing sessions must be revoked.
        tokenVersion: {
            type: Number,
            default: 0,
            min: 0,
            select: false,
            validate: {
                validator: Number.isSafeInteger,
                message: "Token version must be a safe integer.",
            },
        },

        passwordChangedAt: {
            type: Date,
            default: null,
        },

        // ================== CANDIDATE PROFILE ==================
        address: {
            type: String,
            trim: true,
            maxlength: 500,
            default: "",
        },

        qualification: {
            type: String,
            trim: true,
            maxlength: 200,
            default: "",
        },

        experience: {
            type: String,
            trim: true,
            maxlength: 100,
            default: "",
        },

        skills: {
            type: [
                {
                    type: String,
                    trim: true,
                    maxlength: 100,
                },
            ],
            default: [],
            validate: {
                validator: function (skills) {
                    return skills.length <= 50;
                },
                message: "A maximum of 50 skills is allowed.",
            },
        },

        resume: {
            type: resumeSchema,
            default: null,
        },

        // ================== ACCOUNT ACTIVITY ==================
        // Update only after successful authentication.
        lastLoginAt: {
            type: Date,
            default: null,
        },

        // Record which admin created the account, when applicable.
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
            default: null,
            immutable: true,
        },
    },
    {
        // Automatically maintain createdAt and updatedAt.
        timestamps: true,

        // Detect conflicting document saves.
        optimisticConcurrency: true,

        // Remove sensitive fields when serializing a document to JSON.
        toJSON: {
            transform: function (doc, result) {
                delete result.passwordHash;
                delete result.tokenVersion;
                delete result.__v;

                if (result.resume) {
                    delete result.resume.publicId;
                }

                return result;
            },
        },
    }
);

// ================== MODEL ==================
const User = mongoose.model("User", userSchema);

// ================== EXPORT ==================
module.exports = User;