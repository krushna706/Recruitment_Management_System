const mongoose = require("mongoose");

const { Schema } = mongoose;

// ================== APPLICATION OPTIONS ==================
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

const INTERVIEW_MODES = ["Online", "In-person", "Phone"];

const RESUME_MIME_TYPES = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

// ================== APPLICANT DETAILS ==================
// Keep the information submitted for this particular application.
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
            required: true,
            default: [],
            validate: {
                validator(skills) {
                    return skills.length >= 1 && skills.length <= 15;
                },
                message: "Provide between 1 and 15 skills.",
            },
        },
    },
    { _id: false }
);

// ================== JOB SNAPSHOT ==================
// Preserve the opening details shown when the user applied.
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
            enum: [
                "",
                "Full Time",
                "Part Time",
                "Contract",
                "Internship",
                "Freelance",
            ],
            default: "",
        },

        mode: {
            type: String,
            required: true,
            enum: ["On-site", "Remote", "Hybrid"],
        },

        salary: {
            type: String,
            trim: true,
            default: "",
        },
    },
    { _id: false }
);

// ================== PRIVATE RESUME ==================
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
            enum: RESUME_MIME_TYPES,
        },

        size: {
            type: Number,
            required: true,
            min: 1,
            max: 5 * 1024 * 1024,
            validate: {
                validator: Number.isInteger,
                message: "Resume size must be a whole number.",
            },
        },
    },
    { _id: false }
);

// ================== INTERVIEW DETAILS ==================
// The status-update endpoint will validate that a new interview is in the future.
const interviewSchema = new Schema(
    {
        at: {
            type: Date,
            required: true,
        },

        mode: {
            type: String,
            required: true,
            enum: INTERVIEW_MODES,
        },

        note: {
            type: String,
            trim: true,
            maxlength: 1000,
            default: "",
        },
    },
    { _id: false }
);

// ================== SELECTION DETAILS ==================
const selectionSchema = new Schema(
    {
        note: {
            type: String,
            trim: true,
            maxlength: 1000,
            default: "",
        },
    },
    { _id: false }
);

// ================== STATUS HISTORY ==================
// Store the account and time responsible for each recorded status update.
const historySchema = new Schema(
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
    { _id: false }
);

// ================== APPLICATION MODEL ==================
const applicationSchema = new Schema(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            immutable: true,
        },

        jobId: {
            type: Schema.Types.ObjectId,
            ref: "Job",
            required: true,
            immutable: true,
        },

        openingType: {
            type: String,
            required: true,
            enum: ["client", "internal"],
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
            required: true,
            enum: APPLICATION_STATUSES,
            default: "Submitted",
        },

        interview: {
            type: interviewSchema,
            default: undefined,
        },

        selection: {
            type: selectionSchema,
            default: undefined,
        },

        history: {
            type: [historySchema],
            required: true,
            default: [],
            validate: {
                validator(history) {
                    return (
                        history.length > 0 &&
                        history[0].status === "Submitted" &&
                        history[history.length - 1].status === this.status
                    );
                },
                message: "Application status and history must match.",
            },
        },
    },
    {
        timestamps: true,
        optimisticConcurrency: true,
    }
);

// ================== DATABASE INDEXES ==================
// One application per user and job, including simultaneous requests.
applicationSchema.index(
    { userId: 1, jobId: 1 },
    { unique: true, name: "unique_user_job_application" }
);

applicationSchema.index({ userId: 1, createdAt: -1, _id: -1 });
applicationSchema.index({ jobId: 1, status: 1, createdAt: -1 });
applicationSchema.index({ status: 1, createdAt: -1, _id: -1 });

// ================== EXPORT ==================
module.exports = mongoose.model("Application", applicationSchema);