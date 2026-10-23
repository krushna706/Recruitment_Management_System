const mongoose = require("mongoose");

const { Schema } = mongoose;

// ================== CONDITIONAL REQUIRED RULES ==================
function requiredWhenPublished() {
    return this.status === "Published";
}

function requiredForPublishedClientJob() {
    return this.openingType === "client" && this.status === "Published";
}

// ================== JOB SCHEMA ==================
const jobSchema = new Schema(
    {
        openingType: {
            type: String,
            enum: ["client", "internal"],
            required: true,
            immutable: true,
        },
        company: {
            type: String,
            trim: true,
            maxlength: 150,
            default: "",
            required: function () {
                return this.openingType === "client";
            },
        },
        title: {
            type: String,
            required: true,
            trim: true,
            maxlength: 150,
        },
        department: {
            type: String,
            trim: true,
            maxlength: 100,
            default: "",
            required: requiredWhenPublished,
        },
        location: {
            type: String,
            trim: true,
            maxlength: 200,
            default: "",
            required: requiredWhenPublished,
        },
        type: {
            type: String,
            enum: ["", "Full Time", "Part Time", "Contract", "Internship"],
            default: "",
            required: requiredForPublishedClientJob,
        },
        mode: {
            type: String,
            enum: ["On-site", "Hybrid", "Remote"],
            default: "On-site",
            required: true,
        },

        // ================== EXPERIENCE AND COMPENSATION ==================
        experience: {
            type: String,
            trim: true,
            maxlength: 100,
            default: "",
            required: requiredWhenPublished,
        },
        salary: {
            type: String,
            trim: true,
            maxlength: 100,
            default: "",
        },
        openings: {
            type: Number,
            default: null,
            min: 1,
            max: 10000,
            validate: {
                validator: function (value) {
                    return value === null || Number.isInteger(value);
                },
                message: "Openings must be a whole number.",
            },
        },

        // ================== CANDIDATE REQUIREMENTS ==================
        qualification: {
            type: String,
            trim: true,
            maxlength: 500,
            default: "",
            required: requiredForPublishedClientJob,
        },
        skills: {
            type: [
                {
                    type: String,
                    required: true,
                    trim: true,
                    maxlength: 100,
                },
            ],
            default: [],
            validate: [
                {
                    validator: function (skills) {
                        return skills.length <= 50;
                    },
                    message: "A maximum of 50 job skills is allowed.",
                },
                {
                    validator: function (skills) {
                        return !requiredForPublishedClientJob.call(this) || skills.length > 0;
                    },
                    message: "Add at least one skill before publishing a client job.",
                },
            ],
        },

        // ================== SHORT AND FULL DESCRIPTIONS ==================
        // Manually written summary for homepage and job-list cards.
        shortDescription: {
            type: String,
            trim: true,
            maxlength: 150,
            default: "",
            required: requiredForPublishedClientJob,
        },

        // Full role description and responsibilities for Job Details.
        description: {
            type: String,
            trim: true,
            maxlength: 20000,
            default: "",
            required: requiredWhenPublished,
        },
        requirements: {
            type: String,
            trim: true,
            maxlength: 10000,
            default: "",
            required: requiredForPublishedClientJob,
        },

        // ================== PUBLICATION SETTINGS ==================
        status: {
            type: String,
            enum: ["Draft", "Published", "Closed"],
            default: "Draft",
            required: true,
        },
        featured: {
            type: Boolean,
            default: false,
        },

        // Set by the controller on first publication.
        publishedAt: {
            type: Date,
            default: null,
        },
        closedAt: {
            type: Date,
            default: null,
        },

        // ================== ADMIN ACTIVITY ==================
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            immutable: true,
        },
        updatedBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
    },
    {
        timestamps: true,
        optimisticConcurrency: true,
    }
);

// ================== QUERY INDEXES ==================
jobSchema.index({ openingType: 1, status: 1, publishedAt: -1, _id: -1 });
jobSchema.index({ openingType: 1, status: 1, featured: 1, publishedAt: -1, _id: -1 });

// ================== MODEL AND EXPORT ==================
const Job = mongoose.model("Job", jobSchema);

module.exports = Job;
