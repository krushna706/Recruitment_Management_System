const Joi = require("joi");

// ================== COMMON EMAIL RULE ==================
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
// Never trim or lowercase passwords.
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

// ================== COMMON OPENING RULES ==================
const openingStatusRule = Joi.string()
    .valid("Draft", "Published", "Closed")
    .required()
    .messages({
        "any.only": "Select Draft, Published or Closed.",
        "any.required": "Opening status is required.",
        "string.empty": "Opening status is required.",
    });

const workModeRule = Joi.string()
    .valid("On-site", "Hybrid", "Remote")
    .required()
    .messages({
        "any.only": "Select On-site, Hybrid or Remote.",
        "any.required": "Work mode is required.",
        "string.empty": "Work mode is required.",
    });

// ================== PUBLISHING TEXT RULE ==================
function publishedTextRule(label, maxLength) {
    return Joi.string()
        .trim()
        .max(maxLength)
        .when("status", {
            is: "Published",
            then: Joi.string().min(1).required(),
            otherwise: Joi.string().allow("").default(""),
        })
        .messages({
            "string.base": `${label} must be text.`,
            "string.empty": `${label} is required before publishing.`,
            "string.min": `${label} is required before publishing.`,
            "string.max": `${label} cannot exceed ${maxLength} characters.`,
            "any.required": `${label} is required before publishing.`,
        });
}

// ================== CLIENT JOB EXPERIENCE RULE ==================
function validateJobExperience(value, helpers) {
    if (helpers.state.ancestors[0].status !== "Published") {
        return value;
    }

    const text = value.toLowerCase();

    if (text === "fresher") {
        return value;
    }

    const match = text.match(
        /^(\d+(?:\.\d+)?)\s*(?:(?:[-–—]|to)\s*(\d+(?:\.\d+)?)|(\+))?\s*(?:years?)?$/
    );

    if (!match) {
        return helpers.error("experience.format");
    }

    const minimum = Number(match[1]);
    const maximum = match[3] ? Infinity : Number(match[2] ?? match[1]);

    if (!Number.isFinite(minimum) || minimum > maximum) {
        return helpers.error("experience.format");
    }

    if (!match[3] && !Number.isFinite(maximum)) {
        return helpers.error("experience.format");
    }

    return value;
}

// ================== CLIENT JOB SKILLS RULE ==================
// The controller converts this text into an array.
function validateJobSkills(value, helpers) {
    const skills = [
        ...new Set(
            value
                .split(/[,\n]/)
                .map((skill) => skill.trim())
                .filter(Boolean)
        ),
    ];

    if (
        helpers.state.ancestors[0].status === "Published" &&
        !skills.length
    ) {
        return helpers.error("skills.required");
    }

    if (skills.length > 50) {
        return helpers.error("skills.count");
    }

    if (skills.some((skill) => skill.length > 100)) {
        return helpers.error("skills.length");
    }

    return value;
}

// ================== CLIENT JOB VALIDATION ==================
// Used for full-form create and edit requests.
const clientJobSchema = Joi.object({
    company: Joi.string()
        .trim()
        .max(150)
        .required()
        .messages({
            "string.empty": "Company name is required.",
            "string.max": "Company name cannot exceed 150 characters.",
            "any.required": "Company name is required.",
        }),

    title: Joi.string()
        .trim()
        .max(150)
        .required()
        .messages({
            "string.empty": "Job title is required.",
            "string.max": "Job title cannot exceed 150 characters.",
            "any.required": "Job title is required.",
        }),

    department: publishedTextRule("Department", 100),

    location: publishedTextRule("Location", 200),

    type: Joi.string()
        .valid("Full Time", "Part Time", "Contract", "Internship")
        .required()
        .messages({
            "any.only": "Select a valid job type.",
            "string.empty": "Job type is required.",
            "any.required": "Job type is required.",
        }),

    mode: workModeRule,

    experience: publishedTextRule("Experience", 100)
        .custom(validateJobExperience, "client job experience")
        .messages({
            "experience.format": "Use Fresher, 2 years, 2–4 years or 5+ years.",
        }),

    salary: Joi.string()
        .trim()
        .max(100)
        .allow("")
        .default("")
        .messages({
            "string.max": "Salary cannot exceed 100 characters.",
        }),

    openings: Joi.number()
        .integer()
        .min(1)
        .max(10000)
        .empty("")
        .allow(null)
        .default(null)
        .messages({
            "number.base": "Openings must be a number.",
            "number.integer": "Openings must be a whole number.",
            "number.min": "Openings must be at least 1.",
            "number.max": "Openings cannot exceed 10,000.",
        }),

    qualification: publishedTextRule("Qualification", 500),

    skills: publishedTextRule("Skills", 10000)
        .custom(validateJobSkills, "client job skills")
        .messages({
            "skills.required": "Add at least one skill before publishing.",
            "skills.count": "A maximum of 50 job skills is allowed.",
            "skills.length": "Each skill cannot exceed 100 characters.",
        }),

    shortDescription: publishedTextRule("Short description", 150),

    description: publishedTextRule("Job description", 20000),

    requirements: publishedTextRule("Job requirements", 10000),

    status: openingStatusRule,

    featured: Joi.boolean()
        .strict()
        .default(false)
        .messages({
            "boolean.base": "Featured must be true or false.",
        }),
})
    .required()
    .unknown(false)
    .messages({
        "object.base": "Job details must be a JSON object.",
        "object.unknown": "Job details contain an unsupported field.",
        "any.required": "Job details are required.",
    });

// ================== INTERNAL VACANCY VALIDATION ==================
const vacancySchema = Joi.object({
    title: Joi.string()
        .trim()
        .max(150)
        .required()
        .messages({
            "string.empty": "Vacancy title is required.",
            "string.max": "Vacancy title cannot exceed 150 characters.",
            "any.required": "Vacancy title is required.",
        }),

    department: publishedTextRule("Department", 100),

    // Job type is required when publishing; optional for drafts/closed records.
    type: Joi.when("status", {
        is: "Published",
        then: Joi.string()
            .trim()
            .valid("Full Time", "Part Time", "Contract", "Internship")
            .required()
            .messages({
                "any.only": "Select a valid job type before publishing.",
                "string.empty": "Job type is required before publishing.",
                "any.required": "Job type is required before publishing.",
            }),
        otherwise: Joi.string()
            .trim()
            .valid("", "Full Time", "Part Time", "Contract", "Internship")
            .default("")
            .messages({
                "any.only": "Select a valid job type.",
            }),
    }),

    mode: workModeRule,

    experience: publishedTextRule("Experience", 100),

    location: publishedTextRule("Location", 200),

    description: publishedTextRule("Vacancy description", 20000),

    status: openingStatusRule,
})
    .required()
    .unknown(false)
    .messages({
        "object.base": "Vacancy details must be a JSON object.",
        "object.unknown": "Vacancy details contain an unsupported field.",
        "any.required": "Vacancy details are required.",
    });

// ================== APPLICATION OPTIONS ==================
const APPLICATION_QUALIFICATIONS = [
    "Secondary / Class 10",
    "Higher Secondary / Class 12",
    "Diploma",
    "Bachelor’s degree",
    "Master’s degree",
    "Doctorate",
    "Other",
];

const APPLICATION_EXPERIENCE = [
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

// ================== APPLICATION PHONE RULE ==================
function validateApplicationPhone(value, helpers) {
    const digits = value.replace(/\D/g, "");

    if (
        !/^\+?[\d\s()-]+$/.test(value) ||
        digits.length < 10 ||
        digits.length > 15
    ) {
        return helpers.error("phone.format");
    }

    return value;
}

// ================== APPLICATION VALIDATION ==================
// Ownership and job details are set by the controller.
// Upload middleware validates the resume separately.
const applicationSchema = Joi.object({
    name: Joi.string()
        .trim()
        .min(2)
        .max(100)
        .required()
        .messages({
            "string.base": "Name must be text.",
            "string.empty": "Full name is required.",
            "string.min": "Name must contain at least 2 characters.",
            "string.max": "Name cannot exceed 100 characters.",
            "any.required": "Full name is required.",
        }),

    email: emailRule,

    phone: Joi.string()
        .trim()
        .max(25)
        .custom(validateApplicationPhone, "application phone number")
        .required()
        .messages({
            "string.base": "Phone number must be text.",
            "string.empty": "Phone number is required.",
            "string.max": "Phone number cannot exceed 25 characters.",
            "phone.format": "Enter a valid phone number containing 10–15 digits.",
            "any.required": "Phone number is required.",
        }),

    qualification: Joi.string()
        .trim()
        .valid(...APPLICATION_QUALIFICATIONS)
        .required()
        .messages({
            "string.base": "Qualification must be text.",
            "string.empty": "Select your highest qualification.",
            "any.only": "Select a valid qualification.",
            "any.required": "Highest qualification is required.",
        }),

    experience: Joi.string()
        .trim()
        .valid(...APPLICATION_EXPERIENCE)
        .required()
        .messages({
            "string.base": "Experience must be text.",
            "string.empty": "Select your total experience.",
            "any.only": "Select a valid experience option.",
            "any.required": "Total experience is required.",
        }),

    skills: Joi.array()
        .items(
            Joi.string()
                .trim()
                .min(1)
                .max(60)
                .required()
                .messages({
                    "string.base": "Each skill must be text.",
                    "string.empty": "Skills cannot contain empty values.",
                    "string.min": "Skills cannot contain empty values.",
                    "string.max": "Each skill cannot exceed 60 characters.",
                })
        )
        .min(1)
        .max(15)
        .unique((first, second) => {
            if (typeof first !== "string" || typeof second !== "string") {
                return false;
            }

            return first.trim().toLowerCase() === second.trim().toLowerCase();
        })
        .required()
        .messages({
            "array.base": "Skills must be a list.",
            "array.min": "Add at least one relevant skill.",
            "array.max": "You can add a maximum of 15 skills.",
            "array.unique": "Remove duplicate skills.",
            "array.includesRequiredUnknowns": "Add at least one valid skill.",
            "any.required": "Relevant skills are required.",
        }),
})
    .required()
    .unknown(false)
    .messages({
        "object.base": "Application details must be an object.",
        "object.unknown": "Application contains an unsupported field.",
        "any.required": "Application details are required.",
    });

    
 // ================== USER PROFILE UPDATE VALIDATION ==================
 // Validate editable profile fields. Reject role/status changes.
 const profileUpdateSchema = Joi.object({
     name: Joi.string()
         .trim()
         .min(2)
         .max(100)
         .optional(),

     email: emailRule.optional(),


     phone: Joi.string()
        .trim()
        .pattern(/^[6-9]\d{9}$/)
        .optional()
        .messages({
            "string.base": "Phone number must be a string.",
            "string.pattern.base": "Enter a valid 10-digit Indian mobile number.",
        }),


     address: Joi.string()
         .trim()
         .max(500)
         .allow("")
         .optional(),

     qualification: Joi.string()
         .valid("", ...APPLICATION_QUALIFICATIONS)
         .optional(),

     experience: Joi.string()
         .valid("", ...APPLICATION_EXPERIENCE)
         .optional(),

     skills: Joi.array()
         .items(Joi.string().trim().min(1).max(60))
         .max(20)
         .unique((first, second) =>
             first.toLowerCase() === second.toLowerCase()
         )
         .optional()
         .messages({
             "array.max": "You can add a maximum of 20 skills.",
             "array.unique": "Remove duplicate skills.",
         }),

     // Required by controller only when email actually changes.
     currentPassword: Joi.when("email", {
         is: Joi.exist(),
         then: passwordRule.optional(),
         otherwise: Joi.forbidden(),
     }),
 })
     .or(
         "name",
         "email",
         "phone",
         "address",
         "qualification",
         "experience",
         "skills"
     )
     .required()
     .unknown(false)
     .messages({
         "object.base": "Profile details must be a JSON object.",
         "object.missing": "Provide at least one profile field to update.",
         "object.unknown": "Profile contains an unsupported field.",
     });


// ================== INTERVIEW UPDATE VALIDATION ==================
// Frontend sends an ISO timestamp with an explicit timezone.
const interviewUpdateSchema = Joi.object({
    at: Joi.string()
        .isoDate()
        .pattern(/(?:Z|[+-]\d{2}:\d{2})$/i)
        .custom((value, helpers) => {
            const timestamp = Date.parse(value);

            if (!Number.isFinite(timestamp) || timestamp <= Date.now()) {
                return helpers.error("interview.future");
            }

            return value;
        }, "future interview date")
        .required()
        .messages({
            "string.base": "Interview date and time must be text.",
            "string.empty": "Interview date and time are required.",
            "string.isoDate": "Enter a valid interview date and time.",
            "string.pattern.base": "Interview date and time must include a timezone.",
            "interview.future": "Select a future interview date and time.",
            "any.required": "Interview date and time are required.",
        }),

    mode: Joi.string()
        .valid("Online", "In-person", "Phone")
        .required()
        .messages({
            "string.base": "Interview mode must be text.",
            "string.empty": "Select an interview mode.",
            "any.only": "Select Online, In-person or Phone.",
            "any.required": "Interview mode is required.",
        }),
})
    .unknown(false)
    .messages({
        "object.base": "Interview details must be an object.",
        "object.unknown": "Interview details contain an unsupported field.",
    });

// ================== ADMIN APPLICATION STATUS VALIDATION ==================
// The controller must also verify the current database status and transition.
const applicationStatusSchema = Joi.object({
    expectedStatus: Joi.string()
        .valid("Submitted", "Under Review", "Shortlisted", "Interview")
        .required()
        .messages({
            "string.base": "Current application status must be text.",
            "string.empty": "Current application status is required.",
            "any.only": "This application cannot be updated from that status.",
            "any.required": "Current application status is required.",
        }),

    status: Joi.string()
        .valid("Under Review", "Shortlisted", "Interview", "Selected", "Rejected")
        .required()
        .messages({
            "string.base": "Next application status must be text.",
            "string.empty": "Select the next application status.",
            "any.only": "Select a valid next application status.",
            "any.required": "Next application status is required.",
        }),

    message: Joi.string()
        .trim()
        .max(1000)
        .allow("")
        .default("")
        .messages({
            "string.base": "Update message must be text.",
            "string.max": "Keep the update message within 1,000 characters.",
        }),

    interview: Joi.when("status", {
        is: "Interview",
        then: interviewUpdateSchema.required().messages({
            "any.required": "Interview date, time and mode are required.",
        }),
        otherwise: Joi.forbidden().messages({
            "any.unknown": "Interview details are allowed only for the Interview status.",
        }),
    }),
})
    .required()
    .unknown(false)
    .messages({
        "object.base": "Status update must be a JSON object.",
        "object.unknown": "Status update contains an unsupported field.",
        "any.required": "Status update is required.",
    });

    
 // ================== CONTACT ENQUIRY VALIDATION ==================
 // Validate public contact form submissions.
 // Enquiry ID and submission date are generated by the backend.
 const contactEnquirySchema = Joi.object({
     name: Joi.string()
         .trim()
         .min(2)
         .max(100)
         .required()
         .messages({
             "string.empty": "Full name is required.",
             "string.min": "Name must contain at least 2 characters.",
             "string.max": "Name cannot exceed 100 characters.",
             "any.required": "Full name is required.",
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


     subject: Joi.string()
         .trim()
         .min(1)
         .max(150)
         .required()
         .messages({
             "string.empty": "Subject is required.",
             "string.max": "Subject cannot exceed 150 characters.",
             "any.required": "Subject is required.",
         }),

     message: Joi.string()
         .trim()
         .min(1)
         .max(3000)
         .required()
         .messages({
             "string.empty": "Message is required.",
             "string.max": "Message cannot exceed 3000 characters.",
             "any.required": "Message is required.",
         }),
 })
     .required()
     .unknown(false)
     .messages({
         "object.base": "Contact details must be a JSON object.",
         "object.unknown": "Contact form contains an unsupported field.",
     });

     
 // ================== USER ACCOUNT STATUS VALIDATION ==================
 // Validate admin requests to activate or deactivate a user.
 // The controller also verifies the current MongoDB status.
 const userStatusSchema = Joi.object({
     expectedStatus: Joi.string()
         .valid("Active", "Inactive")
         .required()
         .messages({
             "any.only": "Invalid current account status.",
             "any.required": "Current account status is required.",
         }),

     status: Joi.string()
         .valid("Active", "Inactive")
         .required()
         .messages({
             "any.only": "Select Active or Inactive.",
             "any.required": "New account status is required.",
         }),
 })
     .custom((value, helpers) => {
         if (value.expectedStatus === value.status) {
             return helpers.message(
                 "New account status must be different from the current status."
             );
         }

         return value;
     })
     .required()
     .unknown(false)
     .messages({
         "object.base": "Status update must be a JSON object.",
         "object.unknown": "Unsupported account status field.",
     });



// ================== EXPORTS ==================

module.exports = {
    signupSchema,
    loginSchema,
    clientJobSchema,
    vacancySchema,
    applicationSchema,
    applicationStatusSchema,
    profileUpdateSchema,
    contactEnquirySchema,
    userStatusSchema,
};
