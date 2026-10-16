import { Link } from "react-router-dom";

const sampleJobs = [
    {
        id: "sample-1",
        company: "Sample Tech Solutions",
        title: "MERN Stack Developer",
        department: "Engineering",
        location: "Bengaluru, Karnataka",
        type: "Full Time",
        mode: "Hybrid",
        experience: "2–4 Years",
        salary: "₹6–10 LPA",
    },
    {
        id: "sample-2",
        company: "Sample Digital Labs",
        title: "Frontend React Developer",
        department: "Engineering",
        location: "Pune, Maharashtra",
        type: "Full Time",
        mode: "On-site",
        experience: "1–3 Years",
        salary: "₹4–7 LPA",
    },
    {
        id: "sample-3",
        company: "Sample Cloud Systems",
        title: "Backend Node.js Developer",
        department: "Engineering",
        location: "Hyderabad, Telangana",
        type: "Full Time",
        mode: "Remote",
        experience: "2–5 Years",
        salary: "₹7–12 LPA",
    },
    {
        id: "sample-4",
        company: "Sample Innovations",
        title: "Full Stack Developer",
        department: "Engineering",
        location: "Mumbai, Maharashtra",
        type: "Full Time",
        mode: "Hybrid",
        experience: "3–5 Years",
        salary: "₹8–14 LPA",
    },
    {
        id: "sample-5",
        company: "Sample Creative Studio",
        title: "UI/UX Designer",
        department: "Design",
        location: "Bhubaneswar, Odisha",
        type: "Full Time",
        mode: "On-site",
        experience: "1–3 Years",
        salary: "₹4–7 LPA",
    },
];

export default function FeaturedJobs({ jobs = sampleJobs }) {
    const featuredJobs = Array.isArray(jobs) ? jobs.slice(0, 5) : [];

    return (
        <section
            className="website-section rms-featured"
            aria-labelledby="rms-featured-title"
        >
            <div className="website-shell">
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

                {featuredJobs.length > 0 ? (
                    <div className="rms-jobs-grid">
                        {featuredJobs.map((job) => {
                            const jobId = job._id || job.id;
                            const jobUrl = `/jobs/${encodeURIComponent(jobId)}`;

                            return (
                                <article
                                    key={jobId}
                                    className="rms-job-card"
                                >
                                    {/* Department, company and job title */}
                                    <div className="rms-job-heading">
                                        <p className="rms-job-department">
                                            {job.department || "Career opportunity"}
                                        </p>

                                        <p className="rms-job-company">
                                            {job.company || "Company not specified"}
                                        </p>

                                        <h3 className="rms-job-title">
                                            <Link to={jobUrl}>
                                                {job.title}
                                            </Link>
                                        </h3>
                                    </div>

                                    {/* Employment type and work mode */}
                                    <div className="rms-job-tags">
                                        <span>{job.type}</span>
                                        <span>{job.mode}</span>
                                    </div>

                                    {/* Experience and salary */}
                                    <dl className="rms-job-meta">
                                        <div>
                                            <dt>
                                                <i
                                                    className="fa-solid fa-briefcase"
                                                    aria-hidden="true"
                                                />
                                                Experience
                                            </dt>

                                            <dd>
                                                {job.experience || "Not specified"}
                                            </dd>
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

                                    {/* Location left, details button right */}
                                    <div className="rms-job-footer">
                                        <p className="rms-job-location">
                                            <i
                                                className="fa-solid fa-location-dot"
                                                aria-hidden="true"
                                            />

                                            <span>
                                                {job.location || "Not specified"}
                                            </span>
                                        </p>

                                        <Link
                                            to={jobUrl}
                                            className="website-button website-button-outline rms-job-details"
                                            aria-label={`View job details for ${job.title}`}
                                        >
                                            Job Details
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

                <div className="rms-jobs-cta">
                    <div>
                        <p className="website-section-label">
                            YOUR NEXT CHAPTER
                        </p>

                        <h3>Ready to find your next opportunity?</h3>

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