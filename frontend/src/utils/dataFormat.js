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
    const text = String(value || "")
        .trim()
        .toLowerCase();

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
// Current API shape only; obsolete demo-record compatibility is not needed.
export function toAdminApplication(source = {}) {
    const opening = source.jobSnapshot || {};
    const applicant = source.applicant || {};
    return {
        ...source,
        ...opening,
        id: String(source.id || source._id || ""),
        candidate: applicant.name || "",
        email: applicant.email || "",
        phone: applicant.phone || "",
        qualification: applicant.qualification || "",
        experience: applicant.experience || "",
        skills: toTextList(applicant.skills),
        appliedAt: source.createdAt,
        resumeName: source.resume?.name || "",
        resumeMimeType: source.resume?.mimeType || "",
        resumeSize: source.resume?.size || 0,
        history: source.history || [],
    };
}

// ================== SHARED PANEL DISPLAY ==================
export function formatDate(value, includeTime = false) {
    const date = new Date(value);
    if (!value || Number.isNaN(date.getTime())) return "Not available";
    return new Intl.DateTimeFormat("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        timeZone: "Asia/Kolkata",
        ...(includeTime ? { hour: "numeric", minute: "2-digit", timeZoneName: "short" } : {}),
    }).format(date);
}

export function formatFileSize(value) {
    const bytes = Number(value);
    if (!Number.isFinite(bytes) || bytes <= 0) return "Size unavailable";
    return bytes < 1024 * 1024
        ? `${Math.ceil(bytes / 1024)} KB`
        : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function getInitials(name = "") {
    return (
        name
            .trim()
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((part) => part.charAt(0))
            .join("")
            .toUpperCase() || "?"
    );
}

export function getErrorMessage(error, fallback) {
    const message = error.response?.data?.message;
    return typeof message === "string" && message.trim() ? message : fallback;
}

export function normalizeSkills(skills = []) {
    return [...new Map(toTextList(skills).map((skill) => [skill.toLowerCase(), skill])).values()];
}
