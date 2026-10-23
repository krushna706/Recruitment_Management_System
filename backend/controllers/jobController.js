const Job = require("../models/Job");
const ExpressError = require("../utils/ExpressError");

// ================== COMPANY CONFIGURATION ==================
const COMPANY_NAME = process.env.COMPANY_NAME?.trim();

if (!COMPANY_NAME || COMPANY_NAME.length > 150) {
    throw new Error("COMPANY_NAME must contain 1–150 characters in environment configuration.");
}

// ================== JOB CONFIGURATION ==================
const JOB_TYPES = ["Full Time", "Part Time", "Contract", "Internship"];
const WORK_MODES = ["On-site", "Hybrid", "Remote"];
const JOB_STATUSES = ["Draft", "Published", "Closed"];

const EXPERIENCE_PATTERN =
    /^(\d+(?:\.\d+)?)\s*(?:(?:[-–—]|to)\s*(\d+(?:\.\d+)?)|(\+))?\s*(?:years?)?$/i;

const PUBLIC_JOB_FIELDS = [
    "company",
    "title",
    "department",
    "location",
    "type",
    "mode",
    "experience",
    "salary",
    "openings",
    "qualification",
    "skills",
    "shortDescription",
    "description",
    "requirements",
    "status",
    "featured",
    "publishedAt",
    "closedAt",
    "createdAt",
    "updatedAt",
].join(" ");

// ================== JOB ID VALIDATION ==================
function validateJobId(id) {
    if (typeof id !== "string" || !/^[a-fA-F0-9]{24}$/.test(id)) {
        throw new ExpressError(400, "Invalid job ID.");
    }
}

// ================== QUERY VALIDATION ==================
function getQueryText(value, label, maxLength = 200) {
    if (value === undefined) {
        return "";
    }

    if (typeof value !== "string") {
        throw new ExpressError(400, `${label} must be text.`);
    }

    const text = value.trim();

    if (text.length > maxLength) {
        throw new ExpressError(400, `${label} cannot exceed ${maxLength} characters.`);
    }

    return text;
}

function getPositiveInteger(value, fallback, maximum, label) {
    if (value === undefined) {
        return fallback;
    }

    if (typeof value !== "string" || !/^[1-9]\d*$/.test(value)) {
        throw new ExpressError(400, `${label} must be a positive whole number.`);
    }

    const number = Number(value);

    if (!Number.isSafeInteger(number) || number > maximum) {
        throw new ExpressError(400, `${label} cannot exceed ${maximum}.`);
    }

    return number;
}

// ================== SAFE TEXT SEARCH ==================
function escapeRegex(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ================== EXPERIENCE FILTER ==================
// Convert the stored experience text inside the database query.
// Filtering happens before pagination and uses the same rule for counts.
function getExperienceFilter(value) {
    const experience = getQueryText(value, "Experience", 10);

    if (!experience) {
        return null;
    }

    if (!/^(?:[0-9]|[12][0-9]|30|30\+)$/.test(experience)) {
        throw new ExpressError(400, "Select experience between 0 and 30 years, or 30+.");
    }

    const moreThanThirty = experience === "30+";
    const years = moreThanThirty ? null : Number(experience);

    return {
        $let: {
            vars: {
                text: {
                    $toLower: {
                        $trim: {
                            input: { $ifNull: ["$experience", ""] },
                        },
                    },
                },
            },
            in: {
                $cond: [
                    { $eq: ["$$text", "fresher"] },

                    // Fresher matches only a candidate with zero experience.
                    !moreThanThirty && years === 0,

                    {
                        $let: {
                            vars: {
                                parsed: {
                                    $regexFind: {
                                        input: "$$text",
                                        regex: EXPERIENCE_PATTERN,
                                    },
                                },
                            },
                            in: {
                                $let: {
                                    vars: {
                                        captures: {
                                            $ifNull: ["$$parsed.captures", []],
                                        },
                                    },
                                    in: {
                                        $let: {
                                            vars: {
                                                minimum: {
                                                    $convert: {
                                                        input: {
                                                            $arrayElemAt: ["$$captures", 0],
                                                        },
                                                        to: "double",
                                                        onError: null,
                                                        onNull: null,
                                                    },
                                                },
                                                maximum: {
                                                    $convert: {
                                                        input: {
                                                            $arrayElemAt: ["$$captures", 1],
                                                        },
                                                        to: "double",
                                                        onError: null,
                                                        onNull: null,
                                                    },
                                                },
                                                openEnded: {
                                                    $eq: [
                                                        {
                                                            $arrayElemAt: ["$$captures", 2],
                                                        },
                                                        "+",
                                                    ],
                                                },
                                            },
                                            in: {
                                                $let: {
                                                    vars: {
                                                        upper: {
                                                            $ifNull: ["$$maximum", "$$minimum"],
                                                        },
                                                    },
                                                    in: {
                                                        $and: [
                                                            {
                                                                $ne: ["$$minimum", null],
                                                            },
                                                            {
                                                                $or: [
                                                                    "$$openEnded",
                                                                    {
                                                                        $gte: [
                                                                            "$$upper",
                                                                            "$$minimum",
                                                                        ],
                                                                    },
                                                                ],
                                                            },
                                                            moreThanThirty
                                                                ? {
                                                                      $or: [
                                                                          "$$openEnded",
                                                                          {
                                                                              $gt: ["$$upper", 30],
                                                                          },
                                                                      ],
                                                                  }
                                                                : {
                                                                      $and: [
                                                                          {
                                                                              $lte: [
                                                                                  "$$minimum",
                                                                                  years,
                                                                              ],
                                                                          },
                                                                          {
                                                                              $or: [
                                                                                  "$$openEnded",
                                                                                  {
                                                                                      $gte: [
                                                                                          "$$upper",
                                                                                          years,
                                                                                      ],
                                                                                  },
                                                                              ],
                                                                          },
                                                                      ],
                                                                  },
                                                        ],
                                                    },
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                ],
            },
        },
    };
}

// ================== ALLOWED JOB FIELDS ==================
// The route must validate the body with clientJobSchema first.
function getJobFields(body) {
    const skills = [
        ...new Set(
            body.skills
                .split(/[,\n]/)
                .map((skill) => skill.trim())
                .filter(Boolean)
        ),
    ];

    return {
        company: body.company,
        title: body.title,
        department: body.department,
        location: body.location,
        type: body.type,
        mode: body.mode,
        experience: body.experience,
        salary: body.salary,
        openings: body.openings,
        qualification: body.qualification,
        skills,
        shortDescription: body.shortDescription,
        description: body.description,
        requirements: body.requirements,
        status: body.status,
        featured: body.featured,
    };
}

// ================== PUBLICATION DATES ==================
function updatePublicationDates(job, previousStatus) {
    const now = new Date();

    if (job.status === "Published" && !job.publishedAt) {
        job.publishedAt = now;
    }

    if (job.status === "Closed") {
        if (previousStatus !== "Closed" || !job.closedAt) {
            job.closedAt = now;
        }
    } else {
        job.closedAt = null;
    }
}

// ================== JOB RESPONSE ==================
function getJobResponse(source) {
    const job = typeof source.toObject === "function" ? source.toObject() : source;

    const details = { ...job };

    delete details.__v;

    return {
        ...details,
        id: String(job._id),
        version: job.__v ?? 0,
    };
}

// ================== JOB ERROR HANDLING ==================
function handleJobError(error, next) {
    if (error.name === "VersionError") {
        return next(
            new ExpressError(409, "This job was changed by another admin. Reload and try again.")
        );
    }

    if (error.name === "ValidationError") {
        return next(
            new ExpressError(
                400,
                "Job details are invalid or incomplete. Check the form and try again."
            )
        );
    }

    return next(error);
}

// ================== JOB LIST FILTERS ==================
function getJobFilters(query, isAdmin) {
    const allowedKeys = [
        "page",
        "limit",
        "search",
        "location",
        "experience",
        "type",
        "mode",
        "featured",
    ];

    if (isAdmin) {
        allowedKeys.push("status");
    }

    if (Object.keys(query).some((key) => !allowedKeys.includes(key))) {
        throw new ExpressError(400, "Request contains an unsupported job filter.");
    }

    const filter = {
        openingType: "client",
    };

    if (!isAdmin) {
        filter.status = "Published";
    }

    const search = getQueryText(query.search, "Search");
    const location = getQueryText(query.location, "Location");
    const type = getQueryText(query.type, "Job type", 30);
    const mode = getQueryText(query.mode, "Work mode", 30);
    const experienceFilter = getExperienceFilter(query.experience);

    if (search) {
        const pattern = new RegExp(escapeRegex(search), "i");

        filter.$or = [
            { title: pattern },
            { company: pattern },
            { department: pattern },
            { location: pattern },
            { shortDescription: pattern },
            { description: pattern },
        ];
    }

    if (location) {
        const pattern = new RegExp(escapeRegex(location), "i");

        filter.$and = [
            {
                $or: [{ location: pattern }, { mode: pattern }],
            },
        ];
    }

    if (experienceFilter) {
        filter.$expr = experienceFilter;
    }

    if (type) {
        if (!JOB_TYPES.includes(type)) {
            throw new ExpressError(400, "Invalid job type filter.");
        }

        filter.type = type;
    }

    if (mode) {
        if (!WORK_MODES.includes(mode)) {
            throw new ExpressError(400, "Invalid work mode filter.");
        }

        filter.mode = mode;
    }

    if (query.featured !== undefined) {
        if (!["true", "false"].includes(query.featured)) {
            throw new ExpressError(400, "Featured filter must be true or false.");
        }

        filter.featured = query.featured === "true";
    }

    if (isAdmin) {
        const status = getQueryText(query.status, "Status", 30);

        if (status) {
            if (!JOB_STATUSES.includes(status)) {
                throw new ExpressError(400, "Invalid job status filter.");
            }

            filter.status = status;
        }
    }

    return filter;
}

// ================== ADMIN OVERVIEW COUNTS ==================
// Overview counts are independent of table filters.
async function getAdminJobCounts() {
    const groupedCounts = await Job.aggregate([
        {
            $match: {
                openingType: "client",
            },
        },
        {
            $group: {
                _id: "$status",
                count: { $sum: 1 },
            },
        },
    ]);

    const counts = {
        total: 0,
        published: 0,
        draft: 0,
        closed: 0,
    };

    for (const group of groupedCounts) {
        counts.total += group.count;

        switch (group._id) {
            case "Published":
                counts.published = group.count;
                break;

            case "Draft":
                counts.draft = group.count;
                break;

            case "Closed":
                counts.closed = group.count;
                break;
        }
    }

    return counts;
}

// ================== SHARED JOB LIST ==================
async function listJobs(req, res, next, isAdmin) {
    try {
        const filter = getJobFilters(req.query, isAdmin);
        const page = getPositiveInteger(req.query.page, 1, 100000, "Page");
        const limit = getPositiveInteger(req.query.limit, 20, 100, "Page size");

        const sort = isAdmin ? { createdAt: -1, _id: -1 } : { publishedAt: -1, _id: -1 };

        const jobsQuery = Job.find(filter)
            .sort(sort)
            .skip((page - 1) * limit)
            .limit(limit);

        if (!isAdmin) {
            jobsQuery.select(PUBLIC_JOB_FIELDS);
        }

        const [jobs, total, counts] = await Promise.all([
            jobsQuery.lean(),
            Job.countDocuments(filter),
            isAdmin ? getAdminJobCounts() : Promise.resolve(null),
        ]);

        const response = {
            success: true,
            jobs: jobs.map(getJobResponse),
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };

        if (isAdmin) {
            response.counts = counts;
        }

        res.set("Cache-Control", "no-store");

        return res.status(200).json(response);
    } catch (error) {
        return handleJobError(error, next);
    }
}

// ================== ADMIN JOB LIST ==================
function getAdminJobs(req, res, next) {
    return listJobs(req, res, next, true);
}

// ================== PUBLIC JOB LIST ==================
function getPublicJobs(req, res, next) {
    return listJobs(req, res, next, false);
}

// ================== ADMIN JOB DETAILS ==================
async function getAdminJob(req, res, next) {
    try {
        validateJobId(req.params.id);

        const job = await Job.findOne({
            _id: req.params.id,
            openingType: "client",
        }).lean();

        if (!job) {
            return next(new ExpressError(404, "Job not found."));
        }

        res.set("Cache-Control", "no-store");

        return res.status(200).json({
            success: true,
            job: getJobResponse(job),
        });
    } catch (error) {
        return handleJobError(error, next);
    }
}

// ================== PUBLIC JOB DETAILS ==================
// Closed jobs remain accessible; draft jobs stay private.
async function getPublicJob(req, res, next) {
    try {
        validateJobId(req.params.id);

        const job = await Job.findOne({
            _id: req.params.id,
            openingType: "client",
            status: { $in: ["Published", "Closed"] },
        })
            .select(PUBLIC_JOB_FIELDS)
            .lean();

        if (!job) {
            return next(new ExpressError(404, "Job not found."));
        }

        res.set("Cache-Control", "no-store");

        return res.status(200).json({
            success: true,
            job: getJobResponse(job),
        });
    } catch (error) {
        return handleJobError(error, next);
    }
}

// ================== CREATE CLIENT JOB ==================
// Authentication, admin authorization and validation run in the router.
async function createJob(req, res, next) {
    try {
        const job = new Job({
            ...getJobFields(req.body),
            openingType: "client",
            createdBy: req.user._id,
            updatedBy: req.user._id,
        });

        updatePublicationDates(job, null);

        await job.save();

        res.set("Cache-Control", "no-store");

        return res.status(201).json({
            success: true,
            message: "Job created successfully.",
            job: getJobResponse(job),
        });
    } catch (error) {
        return handleJobError(error, next);
    }
}

// ================== UPDATE CLIENT JOB ==================
async function updateJob(req, res, next) {
    try {
        validateJobId(req.params.id);

        const job = await Job.findOne({
            _id: req.params.id,
            openingType: "client",
        });

        if (!job) {
            return next(new ExpressError(404, "Job not found."));
        }

        if (job.__v !== req.body.version) {
            throw new ExpressError(409, "Job changed since you opened it. Reload before saving.");
        }

        const previousStatus = job.status;

        job.set(getJobFields(req.body));
        job.updatedBy = req.user._id;

        updatePublicationDates(job, previousStatus);

        await job.save();

        let message = "Job updated successfully.";

        if (previousStatus !== job.status) {
            if (job.status === "Closed") {
                message = "Job closed successfully.";
            } else if (previousStatus === "Closed" && job.status === "Published") {
                message = "Job reopened successfully.";
            } else if (job.status === "Published") {
                message = "Job published successfully.";
            } else {
                message = "Job saved as draft.";
            }
        }

        res.set("Cache-Control", "no-store");

        return res.status(200).json({
            success: true,
            message,
            job: getJobResponse(job),
        });
    } catch (error) {
        return handleJobError(error, next);
    }
}

// ================== VACANCY RESPONSE FIELDS ==================
const PUBLIC_VACANCY_FIELDS = [
    "openingType",
    "company",
    "title",
    "department",
    "type",
    "mode",
    "experience",
    "location",
    "description",
    "status",
    "publishedAt",
    "closedAt",
    "createdAt",
    "updatedAt",
].join(" ");

// ================== ALLOWED VACANCY FIELDS ==================
// Internal openings use the company name configured on the server.
// The admin form does not need a separate company input.
function getVacancyFields(body) {
    return {
        company: COMPANY_NAME,
        title: body.title,
        department: body.department,
        type: body.type,
        mode: body.mode,
        experience: body.experience,
        location: body.location,
        description: body.description,
        status: body.status,
    };
}

// ================== VACANCY FILTERS ==================
function getVacancyFilters(query, isAdmin) {
    const allowedKeys = ["page", "limit", "search", "mode"];

    if (isAdmin) {
        allowedKeys.push("status");
    }

    if (Object.keys(query).some((key) => !allowedKeys.includes(key))) {
        throw new ExpressError(400, "Request contains an unsupported vacancy filter.");
    }

    const filter = {
        openingType: "internal",
    };

    if (!isAdmin) {
        filter.status = "Published";
    }

    const search = getQueryText(query.search, "Search");
    const mode = getQueryText(query.mode, "Work mode", 30);

    if (search) {
        const pattern = new RegExp(escapeRegex(search), "i");

        filter.$or = [
            { title: pattern },
            { department: pattern },
            { location: pattern },
            { description: pattern },
        ];
    }

    if (mode) {
        if (!WORK_MODES.includes(mode)) {
            throw new ExpressError(400, "Invalid work mode filter.");
        }

        filter.mode = mode;
    }

    if (isAdmin) {
        const status = getQueryText(query.status, "Status", 30);

        if (status) {
            if (!JOB_STATUSES.includes(status)) {
                throw new ExpressError(400, "Invalid vacancy status filter.");
            }

            filter.status = status;
        }
    }

    return filter;
}

// ================== VACANCY SUMMARY COUNTS ==================
// Count internal vacancies only, independently of table filters.
async function getAdminVacancyCounts() {
    const groupedCounts = await Job.aggregate([
        {
            $match: {
                openingType: "internal",
            },
        },
        {
            $group: {
                _id: "$status",
                count: { $sum: 1 },
            },
        },
    ]);

    const counts = {
        total: 0,
        published: 0,
        draft: 0,
        closed: 0,
    };

    const statusKeys = {
        Published: "published",
        Draft: "draft",
        Closed: "closed",
    };

    for (const group of groupedCounts) {
        counts.total += group.count;

        const key = statusKeys[group._id];

        if (key) {
            counts[key] = group.count;
        }
    }

    return counts;
}

// ================== SHARED VACANCY LIST ==================
async function listVacancies(req, res, next, isAdmin) {
    try {
        const filter = getVacancyFilters(req.query, isAdmin);
        const page = getPositiveInteger(req.query.page, 1, 100000, "Page");
        const limit = getPositiveInteger(req.query.limit, 10, 100, "Page size");

        const sort = isAdmin ? { createdAt: -1, _id: -1 } : { publishedAt: -1, _id: -1 };

        const query = Job.find(filter)
            .sort(sort)
            .skip((page - 1) * limit)
            .limit(limit);

        if (!isAdmin) {
            query.select(PUBLIC_VACANCY_FIELDS);
        }

        const [vacancies, total, counts] = await Promise.all([
            query.lean(),
            Job.countDocuments(filter),
            isAdmin ? getAdminVacancyCounts() : Promise.resolve(null),
        ]);

        const response = {
            success: true,
            vacancies: vacancies.map(getJobResponse),
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };

        if (isAdmin) {
            response.counts = counts;
        }

        res.set("Cache-Control", "no-store");

        return res.status(200).json(response);
    } catch (error) {
        return handleJobError(error, next);
    }
}

// ================== ADMIN VACANCY LIST ==================
function getAdminVacancies(req, res, next) {
    return listVacancies(req, res, next, true);
}

// ================== PUBLIC CAREERS LIST ==================
function getPublicVacancies(req, res, next) {
    return listVacancies(req, res, next, false);
}

// ================== SHARED VACANCY DETAILS ==================
async function getVacancyDetails(req, res, next, isAdmin) {
    try {
        validateJobId(req.params.id);

        const filter = {
            _id: req.params.id,
            openingType: "internal",
        };

        // Closed vacancies remain accessible; drafts stay private.
        if (!isAdmin) {
            filter.status = {
                $in: ["Published", "Closed"],
            };
        }

        const query = Job.findOne(filter);

        if (!isAdmin) {
            query.select(PUBLIC_VACANCY_FIELDS);
        }

        const vacancy = await query.lean();

        if (!vacancy) {
            throw new ExpressError(404, "Vacancy not found.");
        }

        res.set("Cache-Control", "no-store");

        return res.status(200).json({
            success: true,
            vacancy: getJobResponse(vacancy),
        });
    } catch (error) {
        return handleJobError(error, next);
    }
}

// ================== ADMIN VACANCY DETAILS ==================
function getAdminVacancy(req, res, next) {
    return getVacancyDetails(req, res, next, true);
}

// ================== PUBLIC VACANCY DETAILS ==================
function getPublicVacancy(req, res, next) {
    return getVacancyDetails(req, res, next, false);
}

// ================== CREATE INTERNAL VACANCY ==================
// Authentication, admin authorization and Joi validation run in the router.
async function createVacancy(req, res, next) {
    try {
        const vacancy = new Job({
            ...getVacancyFields(req.body),
            openingType: "internal",
            createdBy: req.user._id,
            updatedBy: req.user._id,
        });

        updatePublicationDates(vacancy, null);

        await vacancy.save();

        res.set("Cache-Control", "no-store");

        return res.status(201).json({
            success: true,
            message: "Vacancy created successfully.",
            vacancy: getJobResponse(vacancy),
        });
    } catch (error) {
        return handleJobError(error, next);
    }
}

// ================== UPDATE INTERNAL VACANCY ==================
async function updateVacancy(req, res, next) {
    try {
        validateJobId(req.params.id);

        const vacancy = await Job.findOne({
            _id: req.params.id,
            openingType: "internal",
        });

        if (!vacancy) {
            throw new ExpressError(404, "Vacancy not found.");
        }

        if (vacancy.__v !== req.body.version) {
            throw new ExpressError(
                409,
                "Vacancy changed since you opened it. Reload before saving."
            );
        }

        const previousStatus = vacancy.status;

        vacancy.set(getVacancyFields(req.body));
        vacancy.updatedBy = req.user._id;

        updatePublicationDates(vacancy, previousStatus);

        await vacancy.save();

        let message = "Vacancy updated successfully.";

        if (previousStatus !== vacancy.status) {
            if (vacancy.status === "Closed") {
                message = "Vacancy closed successfully.";
            } else if (previousStatus === "Closed" && vacancy.status === "Published") {
                message = "Vacancy reopened successfully.";
            } else if (vacancy.status === "Published") {
                message = "Vacancy published successfully.";
            } else {
                message = "Vacancy saved as draft.";
            }
        }

        res.set("Cache-Control", "no-store");

        return res.status(200).json({
            success: true,
            message,
            vacancy: getJobResponse(vacancy),
        });
    } catch (error) {
        return handleJobError(error, next);
    }
}

// ================== EXPORTS ==================
module.exports = {
    getAdminJobs,
    getAdminJob,
    getPublicJobs,
    getPublicJob,
    createJob,
    updateJob,
    getAdminVacancies,
    getAdminVacancy,
    getPublicVacancies,
    getPublicVacancy,
    createVacancy,
    updateVacancy,
};
