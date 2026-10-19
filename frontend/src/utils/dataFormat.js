// Presentation helpers only. Backend validation and authorization are separate.
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
                .filter(Boolean),
        ),
    ];
}

export function getExperienceRange(value) {
    const text = String(value || "")
        .trim()
        .toLowerCase();
    if (text === "fresher") return { min: 0, max: 0 };
    const match = text.match(
        /^(\d+(?:\.\d+)?)\s*(?:(?:[-–—]|to)\s*(\d+(?:\.\d+)?)|(\+))?\s*(?:years?)?$/,
    );
    if (!match) return null;
    const min = Number(match[1]);
    const max = match[3] ? Infinity : Number(match[2] ?? match[1]);
    return min <= max ? { min, max } : null;
}

export function normalizeJob(source) {
    return {
        ...source,
        id: String(source.id || source._id || ""),
        skills: toTextList(source.skills),
        requirements: toTextList(source.requirements, /\n/),
    };
}

export function normalizeApplication(source) {
    const applicant = source.applicant || {};
    const resume =
        source.resume ||
        (source.resumeUrl
            ? {
                  url: source.resumeUrl,
                  name: source.resumeName || "Submitted resume",
              }
            : null);

    return {
        ...source,
        id: String(source.id || source._id || ""),
        applicant: {
            ...applicant,
            name: applicant.name || source.candidate || source.name || "",
            email: applicant.email || source.email || "",
            phone: applicant.phone || source.phone || "",
            qualification:
                applicant.qualification || source.qualification || "",
            experience: applicant.experience || source.experience || "",
            skills: toTextList(applicant.skills ?? source.skills),
        },
        resume,
        history: (Array.isArray(source.history) ? source.history : []).map(
            (entry) => ({
                ...entry,
                note: entry.message ?? entry.note ?? "",
            }),
        ),
    };
}

export function toAdminApplication(source) {
    const normalized = normalizeApplication(source);
    return {
        ...normalized,
        candidate: normalized.applicant.name,
        email: normalized.applicant.email,
        phone: normalized.applicant.phone,
        qualification: normalized.applicant.qualification,
        experience: normalized.applicant.experience,
        skills: normalized.applicant.skills,
        resumeUrl: normalized.resume?.url || "",
        history: normalized.history.map((entry) => ({
            ...entry,
            message: entry.note,
        })),
    };
}

// Accept backend-provided HTTPS links or same-origin download endpoints.
// This only checks URL shape; the backend must authorize every download.
export function getResumeUrl(value) {
    if (typeof value !== "string") return "";
    const url = value.trim();
    if (!url || /[\\\u0000-\u001f\u007f]/.test(url)) return "";
    if (/^\/(?!\/)/.test(url)) return url;

    try {
        const parsed = new URL(url);
        return parsed.protocol === "https:" && !parsed.username && !parsed.password
            ? parsed.href
            : "";
    } catch {
        return "";
    }
}
