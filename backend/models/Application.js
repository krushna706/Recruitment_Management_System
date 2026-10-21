const mongoose = require("mongoose");

const { Schema } = mongoose;

// ================== APPLICATION CONFIGURATION ==================
const APPLICATION_STATUSES = [
    "Submitted",
    "Under Review",
    "Shortlisted",
    "Interview",
    "Selected",
    "Rejected",
];

const QUALIFICATIONS = [
    "Secondary / Class 10",
    "Higher Secondary / Class 12",
    "Diploma",
    "Bachelor’s degree",
    "Master’s degree",
    "Doctorate",
    "Other",
];

const EXPERIENCE_OPTIONS = [
    "Fresher",
    "Less than 1 year",
    "1 year",
    "2 years",
    "3 years",
    "4 years",
    "5 years",
    "6–10 years",
    "More than 10 years",
];

// ================== APPLICANT DETAILS ==================
// Store the contact and professional details submitted with the application.
const applicantSchema = new Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            minlength: 2,
            maxlength: 100,
        },
        email: {
            type: String,
            required: true,
            trim: true,
            lowercase: true,
            maxlength: 254,
        },
        phone: {
            type: String,
            required: true,
            trim: true,
            maxlength: 25,
        },
        qualification: {
            type: String,
            required: true,
            enum: QUALIFICATIONS,
        },
        experience: {
            type: String,
            required: true,
            enum: EXPERIENCE_OPTIONS,
        },
        skills: {
            type: [
                {
                    type: String,
                    required: true,
                    trim: true,
                    maxlength: 60,
                },
            ],
            default: [],
            validate: {
                validator: function (skills) {
                    return skills.length >= 1 && skills.length <= 15;
                },
                message: "Add between 1 and 15 relevant skills.",
            },
        },
    },
    {
        _id: false,
    }
);

// ================== JOB SNAPSHOT ==================
// Preserve basic job details as they were when the user applied.
// The controller copies these values from the Job document.
const jobSnapshotSchema = new Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true,
            maxlength: 150,
        },
        company: {
            type: String,
            trim: true,
            maxlength: 150,
            default: "",
        },
        department: {
            type: String,
            trim: true,
            maxlength: 100,
            default: "",
        },
        location: {
            type: String,
            trim: true,
            maxlength: 200,
            default: "",
        },
        type: {
            type: String,
            enum: ["", "Full Time", "Part Time", "Contract", "Internship"],
            default: "",
        },
        mode: {
            type: String,
            enum: ["On-site", "Hybrid", "Remote"],
            required: true,
        },
    },
    {
        _id: false,
    }
);

// ================== RESUME METADATA ==================
// Store a private storage identifier, not a public download URL.
// Actual upload validation and authorized downloads run in the backend.
const resumeSchema = new Schema(
    {
        storageKey: {
            type: String,
            required: true,
            maxlength: 1024,
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
            enum: [
                "application/pdf",
                "application/msword",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            ],
        },
        size: {
            type: Number,
            required: true,
            min: 1,
            max: 5 * 1024 * 1024,
            validate: {
                validator: Number.isInteger,
                message: "Resume size must be a whole number of bytes.",
            },
        },
    },
    {
        _id: false,
    }
);

// ================== STATUS HISTORY ==================
// Record who changed the application status and when.
const statusHistorySchema = new Schema(
    {
        status: {
            type: String,
            required: true,
            enum: APPLICATION_STATUSES,
        },
        message: {
            type: String,
            trim: true,
            maxlength: 2000,
            default: "",
        },
        changedBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        createdAt: {
            type: Date,
            required: true,
            default: Date.now,
        },
    },
    {
        _id: false,
    }
);

// ================== APPLICATION SCHEMA ==================
const applicationSchema = new Schema(
    {
        // Ownership comes from the authenticated session.
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            immutable: true,
        },

        // Reference the actual job instead of trusting frontend job details.
        jobId: {
            type: Schema.Types.ObjectId,
            ref: "Job",
            required: true,
            immutable: true,
        },

        openingType: {
            type: String,
            enum: ["client", "internal"],
            required: true,
            immutable: true,
        },

        jobSnapshot: {
            type: jobSnapshotSchema,
            required: true,
            immutable: true,
        },

        applicant: {
            type: applicantSchema,
            required: true,
        },

        resume: {
            type: resumeSchema,
            required: true,
        },

        status: {
            type: String,
            enum: APPLICATION_STATUSES,
            required: true,
            default: "Submitted",
        },

        history: {
            type: [statusHistorySchema],
            default: [],
            validate: {
                validator: function (history) {
                    if (!history.length) {
                        return false;
                    }

                    return (
                        history[0].status === "Submitted" &&
                        history[history.length - 1].status === this.status
                    );
                },
                message: "Application history must start with Submitted and match the current status.",
            },
        },
    },
    {
        timestamps: true,
        optimisticConcurrency: true,
    }
);

// ================== DUPLICATE APPLICATION PROTECTION ==================
// One account can apply to the same job only once.
// This rule also applies after rejection or reopening the same job.
applicationSchema.index(
    { userId: 1, jobId: 1 },
    {
        unique: true,
        name: "unique_user_job_application",
    }
);

// ================== LISTING INDEXES ==================
applicationSchema.index({ userId: 1, createdAt: -1, _id: -1 });
applicationSchema.index({ jobId: 1, status: 1, createdAt: -1 });
applicationSchema.index({ status: 1, createdAt: -1, _id: -1 });

// ================== MODEL AND EXPORT ==================
const Application = mongoose.model("Application", applicationSchema);

module.exports = Application;