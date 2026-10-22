// Presentation helpers only.
// Backend validation and authorization remain separate.

// ================== TEXT LIST ==================
export function toTextList(value, separator = /[,\n]/) {
    const values = Array.isArray(value)
        ? value
        : typeof value === "string"
          ? value.split(separator)
          : [];

    return [
        ...new Set(
            values
                .filter((item) => typeof item === "string")
                .map((item) => item.trim())
                .filter(Boolean)
        ),
    ];
}

// ================== EXPERIENCE RANGE ==================
export function getExperienceRange(value) {
    const text = String(value || "").trim().toLowerCase();

    if (text === "fresher") {
        return { min: 0, max: 0 };
    }

    const match = text.match(
        /^(\d+(?:\.\d+)?)\s*(?:(?:[-–—]|to)\s*(\d+(?:\.\d+)?)|(\+))?\s*(?:years?)?$/
    );

    if (!match) return null;

    const min = Number(match[1]);
    const max = match[3] ? Infinity : Number(match[2] ?? match[1]);

    return min <= max ? { min, max } : null;
}

// ================== JOB DATA ==================
export function normalizeJob(source = {}) {
    return {
        ...source,
        id: String(source.id || source._id || ""),
        skills: toTextList(source.skills),
        requirements: toTextList(source.requirements, /\n/),
    };
}

// ================== APPLICATION DATA ==================
// Support backend records and existing frontend demo records.
export function normalizeApplication(source = {}) {
    const applicant = source.applicant || {};
    const jobSnapshot = source.jobSnapshot || {};

    const resume =
        source.resume ||
        (source.resumeUrl
            ? {
                  url: source.resumeUrl,
                  name: source.resumeName || "Submitted resume",
              }
            : null);

    const history = Array.isArray(source.history)
        ? source.history
        : [];

    return {
        ...source,

        id: String(source.id || source._id || ""),
        jobId: String(source.jobId || ""),
        openingType: source.openingType || "",

        // Prefer the job details saved when the application was submitted.
        title: jobSnapshot.title ?? source.title ?? "",
        company: jobSnapshot.company ?? source.company ?? "",
        department: jobSnapshot.department ?? source.department ?? "",
        location: jobSnapshot.location ?? source.location ?? "",
        type: jobSnapshot.type ?? source.type ?? "",
        mode: jobSnapshot.mode ?? source.mode ?? "",
        salary: jobSnapshot.salary ?? source.salary ?? "",

        appliedAt: source.createdAt ?? source.appliedAt ?? "",

        applicant: {
            ...applicant,
            name: applicant.name ?? source.candidate ?? source.name ?? "",
            email: applicant.email ?? source.email ?? "",
            phone: applicant.phone ?? source.phone ?? "",
            qualification:
                applicant.qualification ?? source.qualification ?? "",
            experience: applicant.experience ?? source.experience ?? "",
            skills: toTextList(applicant.skills ?? source.skills),
        },

        resume,

        // Preserve interview and selection information from the API.
        interview: source.interview ?? null,
        selection: source.selection ?? null,

        history: history.map((entry) => {
            const message = entry.message ?? entry.note ?? "";
            const createdAt = entry.createdAt ?? entry.at ?? "";

            return {
                ...entry,
                message,
                note: message,
                createdAt,
                at: createdAt,
            };
        }),
    };
}

// ================== ADMIN APPLICATION DATA ==================
// Match the field names used by the admin table and details dialog.
export function toAdminApplication(source = {}) {
    const normalized = normalizeApplication(source);

    return {
        ...normalized,
        candidate: normalized.applicant.name,
        email: normalized.applicant.email,
        phone: normalized.applicant.phone,
        qualification: normalized.applicant.qualification,
        experience: normalized.applicant.experience,
        skills: normalized.applicant.skills,

        resumeName: normalized.resume?.name || "",
        resumeMimeType: normalized.resume?.mimeType || "",
        resumeSize: normalized.resume?.size ?? 0,

        // Compatibility for existing demo records.
        // Private application resume links come from the resume access API.
        resumeUrl: getResumeUrl(normalized.resume?.url),
    };
}

// ================== RESUME URL CHECK ==================
// Accept HTTPS links or same-origin paths.
// This checks URL format only; backend authorization is still required.
export function getResumeUrl(value) {
    if (typeof value !== "string") return "";

    const url = value.trim();

    if (!url || /[\\\u0000-\u001f\u007f]/.test(url)) {
        return "";
    }

    if (/^\/(?!\/)/.test(url)) {
        return url;
    }

    try {
        const parsed = new URL(url);

        if (
            parsed.protocol !== "https:" ||
            parsed.username ||
            parsed.password
        ) {
            return "";
        }

        return parsed.href;
    } catch {
        return "";
    }
}