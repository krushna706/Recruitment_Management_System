import { Link } from "react-router-dom";

const sampleJobs = [
    {
        id: "sample-1",
        company: "Sample Tech Solutions",
        title: "MERN Stack Developer",
        location: "Bengaluru, Karnataka",
        type: "Full Time",
        mode: "Hybrid",
        experience: "2–4 Years",
        salary: "₹6–10 LPA",
        postedAt: "2026-10-15",
        description:
            "Develop scalable full-stack web applications using modern technologies.",
    },
    {
        id: "sample-2",
        company: "Sample Digital Labs",
        title: "Frontend React Developer",
        location: "Pune, Maharashtra",
        type: "Full Time",
        mode: "On-site",
        experience: "1–3 Years",
        salary: "₹4–7 LPA",
        postedAt: "2026-10-16",
        description:
            "Build responsive interfaces and reusable frontend components.",
    },
    {
        id: "sample-3",
        company: "Sample Cloud Systems",
        title: "Backend Node.js Developer",
        location: "Hyderabad, Telangana",
        type: "Full Time",
        mode: "Remote",
        experience: "2–5 Years",
        salary: "₹7–12 LPA",
        postedAt: "2026-10-14",
        description:
            "Develop secure REST APIs and maintain backend services.",
    },
    {
        id: "sample-4",
        company: "Sample Innovations",
        title: "Full Stack Developer",
        location: "Mumbai, Maharashtra",
        type: "Full Time",
        mode: "Hybrid",
        experience: "3–5 Years",
        salary: "₹8–14 LPA",
        postedAt: "2026-10-13",
        description:
            "Build and maintain modern web applications and backend systems.",
    },
    {
        id: "sample-5",
        company: "Sample Creative Studio",
        title: "UI/UX Designer",
        location: "Bhubaneswar, Odisha",
        type: "Full Time",
        mode: "On-site",
        experience: "1–3 Years",
        salary: "₹4–7 LPA",
        postedAt: "2026-10-17",
        description:
            "Design intuitive user interfaces and engaging digital experiences.",
    },
];

/*
    Supports YYYY-MM-DD dates and ISO timestamps.
    Missing or invalid dates are not displayed.
*/
function getPostingInfo(value) {
    if (typeof value !== "string" || !value.trim()) {
        return null;
    }

    const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);

    let postedDate;

    if (dateOnly) {
        const [year, month, day] = value.split("-").map(Number);

        postedDate = new Date(year, month - 1, day);

        if (
            postedDate.getFullYear() !== year ||
            postedDate.getMonth() !== month - 1 ||
            postedDate.getDate() !== day
        ) {
            return null;
        }
    } else {
        postedDate = new Date(value);
    }

    if (Number.isNaN(postedDate.getTime())) {
        return null;
    }

    const now = new Date();

    const today = Date.UTC(
        now.getFullYear(),
        now.getMonth(),
        now.getDate()
    );

    const postedDay = Date.UTC(
        postedDate.getFullYear(),
        postedDate.getMonth(),
        postedDate.getDate()
    );

    const days = Math.floor(
        (today - postedDay) / (1000 * 60 * 60 * 24)
    );

    const label =
        days < 0
            ? "Scheduled"
            : days === 0
              ? "Today"
              : days === 1
                ? "1 day ago"
                : `${days} days ago`;

    return {
        label,
        dateTime: dateOnly ? value : postedDate.toISOString(),
        fullDate: postedDate.toLocaleDateString("en-IN", {
            day: "numeric",
            month: "long",
            year: "numeric",
        }),
    };
}

export default function FeaturedJobs({ jobs = sampleJobs }) {
    const featuredJobs = Array.isArray(jobs) ? jobs.slice(0, 5) : [];

    return (
        <section
            className="website-section rms-featured"
            aria-labelledby="rms-featured-title"
        >
            <div className="website-shell">
                {/* FEATURED JOBS HEADER */}
                <div className="rms-featured-header">
                    <div>
                        <p className="website-section-label">
                            FIND YOUR NEXT OPPORTUNITY
                        </p>

                        <h2
                            id="rms-featured-title"
                            className="website-section-title"
                        >
                            Explore featured
                            <span> job openings.</span>
                        </h2>

                        <p className="website-section-description">
                            Discover roles that match your experience
                            and take the next step in your career.
                        </p>
                    </div>

                    <Link
                        to="/jobs"
                        className="website-button website-button-outline"
                    >
                        View All Jobs
                        <i
                            className="fa-solid fa-arrow-right"
                            aria-hidden="true"
                        />
                    </Link>
                </div>

                {/* FEATURED JOB CARDS */}
                {featuredJobs.length > 0 ? (
                    <div className="jobs-list-grid">
                        {featuredJobs.map((job) => {
                            const jobId = job._id || job.id;

                            const jobUrl =
                                `/jobs/${encodeURIComponent(jobId)}`;

                            const experience =
                                job.experience ||
                                (Number.isFinite(job.minExperience) &&
                                Number.isFinite(job.maxExperience)
                                    ? `${job.minExperience}–${job.maxExperience} Years`
                                    : "Not specified");

                            const posting = getPostingInfo(job.postedAt);

                            return (
                                <article
                                    key={jobId}
                                    className="rms-job-card jobs-position-card"
                                >
                                    {/* COMPANY AND POSTING TIME */}
                                    <div className="jobs-card-topline">
                                        <p className="rms-job-company">
                                            {job.company ||
                                                "Company not specified"}
                                        </p>

                                        {posting && (
                                            <time
                                                className="jobs-posted"
                                                dateTime={posting.dateTime}
                                                title={`Posting date: ${posting.fullDate}`}
                                                aria-label={`Posting date: ${posting.fullDate}`}
                                            >
                                                <i
                                                    className="fa-regular fa-clock"
                                                    aria-hidden="true"
                                                />

                                                {posting.label}
                                            </time>
                                        )}
                                    </div>

                                    {/* JOB TITLE */}
                                    <div className="jobs-title-row">
                                        <h3 className="rms-job-title">
                                            <Link
                                                to={jobUrl}
                                                title={job.title}
                                            >
                                                {job.title}
                                            </Link>
                                        </h3>
                                    </div>

                                    {/* EMPLOYMENT TYPE AND WORK MODE */}
                                    <div className="rms-job-tags">
                                        <span>
                                            {job.employmentType ||
                                                job.type ||
                                                "Not specified"}
                                        </span>

                                        <span>
                                            {job.workMode ||
                                                job.mode ||
                                                "Not specified"}
                                        </span>
                                    </div>

                                    {/* JOB DESCRIPTION */}
                                    <p className="jobs-card-description">
                                        {job.description ||
                                            "Explore this career opportunity and learn more about the position."}
                                    </p>

                                    {/* EXPERIENCE AND SALARY */}
                                    <dl className="rms-job-meta jobs-card-meta">
                                        <div>
                                            <dt>
                                                <i
                                                    className="fa-solid fa-briefcase"
                                                    aria-hidden="true"
                                                />
                                                Experience
                                            </dt>

                                            <dd>{experience}</dd>
                                        </div>

                                        <div>
                                            <dt>
                                                <i
                                                    className="fa-solid fa-indian-rupee-sign"
                                                    aria-hidden="true"
                                                />
                                                Salary
                                            </dt>

                                            <dd>
                                                {job.salary || "Not disclosed"}
                                            </dd>
                                        </div>
                                    </dl>

                                    {/* LOCATION AND VIEW DETAILS */}
                                    <div className="rms-job-footer">
                                        <p
                                            className="rms-job-location"
                                            title={job.location}
                                        >
                                            <i
                                                className="fa-solid fa-location-dot"
                                                aria-hidden="true"
                                            />

                                            <span>
                                                {job.location ||
                                                    "Not specified"}
                                            </span>
                                        </p>

                                        <Link
                                            to={jobUrl}
                                            className="website-button website-button-outline jobs-details-button"
                                            aria-label={`View details for ${job.title}`}
                                        >
                                            View Details
                                            <i
                                                className="fa-solid fa-arrow-right"
                                                aria-hidden="true"
                                            />
                                        </Link>
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                ) : (
                    <div className="rms-jobs-empty">
                        <i
                            className="fa-solid fa-briefcase"
                            aria-hidden="true"
                        />

                        <h3>No featured openings right now</h3>

                        <p>
                            Check back later or explore our jobs page.
                        </p>
                    </div>
                )}

                {/* EXPLORE ALL JOBS CTA */}
                <div className="rms-jobs-cta">
                    <div>
                        <p className="website-section-label">
                            YOUR NEXT CHAPTER
                        </p>

                        <h3>
                            Ready to find your next opportunity?
                        </h3>

                        <p>
                            Explore available roles and find the one
                            that fits your goals.
                        </p>
                    </div>

                    <Link
                        to="/jobs"
                        className="website-button website-button-white"
                    >
                        Explore All Jobs
                        <i
                            className="fa-solid fa-arrow-right"
                            aria-hidden="true"
                        />
                    </Link>
                </div>
            </div>
        </section>
    );
}