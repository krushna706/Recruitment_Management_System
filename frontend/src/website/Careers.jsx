import usePageSEO from "../hooks/usePageSEO";
import { seoPages } from "../config/seoConfig";

import { useEffect, useState } from "react";
import { Alert, Button, Pagination } from "@mui/material";
import { Link } from "react-router-dom";

import api from "../services/api";

// ================== CAREERS CONFIGURATION ==================
const PAGE_SIZE = 10;

// ================== DESCRIPTION SUMMARY ==================
function getSummary(value = "") {
    const text = value.replace(/\s+/g, " ").trim();

    if (text.length <= 180) return text;

    const shortened = text.slice(0, 180);
    const lastSpace = shortened.lastIndexOf(" ");

    return `${shortened.slice(0, lastSpace > 120 ? lastSpace : 180)}…`;
}

// ================== CAREERS PAGE ==================
export default function Careers() {
        usePageSEO(seoPages.careers);

    const [positions, setPositions] = useState([]);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [page, setPage] = useState(1);
    const [revision, setRevision] = useState(0);

    // ================== FETCH PUBLISHED VACANCIES ==================
    useEffect(() => {
        const controller = new AbortController();

        async function fetchPositions() {
            setLoading(true);
            setError("");

            try {
                const { data } = await api.get("/jobs/vacancies", {
                    params: {
                        page,
                        limit: PAGE_SIZE,
                    },
                    signal: controller.signal,
                });

                if (controller.signal.aborted) return;

                const lastPage = Math.max(1, data.pagination.totalPages);

                if (page > lastPage) {
                    setPage(lastPage);
                    return;
                }

                setPositions(
                    data.vacancies.map((position) => ({
                        ...position,
                        id: String(position.id || position._id),
                    }))
                );

                setTotal(data.pagination.total);
                setTotalPages(data.pagination.totalPages);
            } catch (requestError) {
                if (controller.signal.aborted) return;

                setPositions([]);
                setTotal(0);
                setTotalPages(0);

                setError(
                    requestError.response?.data?.message ||
                        "Open positions could not be loaded. Please try again."
                );
            } finally {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            }
        }

        fetchPositions();

        return () => controller.abort();
    }, [page, revision]);

    return (
        <div className="careers-page">
            {/* ================== BANNER ================== */}
            <section className="about-hero" aria-labelledby="contact-title">
                <img
                    className="about-hero-image"
                    src="/images/about-banner.jpg"
                    alt=""
                    fetchPriority="high"
                />

                <div className="website-shell about-hero-inner">
                    <nav className="about-breadcrumb" aria-label="Breadcrumb">
                        <ol>
                            <li>
                                <Link to="/">Home</Link>
                            </li>

                            <li aria-current="page">Careers</li>
                        </ol>
                    </nav>

                    <div className="about-hero-content">
                        <p className="website-section-label">GROW WITH US</p>

                        <h1 id="contact-title" className="website-section-title">
                            Bring your talent.
                            <span>Build what comes next.</span>
                        </h1>

                        <p className="website-section-description careers-banner-description">
                            Discover opportunities within our team and take your next career step
                            with us.
                        </p>
                    </div>
                </div>
            </section>

            {/* ================== OPEN POSITIONS ================== */}
            <section
                id="career-positions"
                className="website-section careers-positions"
                aria-labelledby="careers-positions-title"
            >
                <div className="container">
                    <div className="careers-openings-heading">
                        <div className="careers-section-heading">
                            <p className="website-section-label">OPEN POSITIONS</p>

                            <h2 id="careers-positions-title" className="website-section-title">
                                Find your next
                                <span> opportunity.</span>
                            </h2>

                            <p className="website-section-description">
                                Explore opportunities with us. Apply through your account and track
                                your progress in My Applications.
                            </p>
                        </div>

                        {!loading && !error && (
                            <span className="careers-openings-count">
                                {total} open {total === 1 ? "position" : "positions"}
                            </span>
                        )}
                    </div>

                    <div aria-busy={loading}>
                        {loading ? (
                            <div className="careers-empty" role="status">
                                <p className="website-section-description">
                                    Loading opportunities...
                                </p>
                            </div>
                        ) : error ? (
                            <Alert
                                severity="error"
                                action={
                                    <Button
                                        color="inherit"
                                        size="small"
                                        onClick={() => setRevision((value) => value + 1)}
                                    >
                                        Retry
                                    </Button>
                                }
                            >
                                {error}
                            </Alert>
                        ) : positions.length ? (
                            <div className="careers-openings-list">
                                {positions.map((position) => (
                                    <article
                                        key={position.id}
                                        id={`vacancy-${position.id}`}
                                        className="careers-opening-row"
                                        aria-labelledby={`vacancy-title-${position.id}`}
                                    >
                                        <div className="careers-opening-main">
                                            <div className="careers-opening-content">
                                                <p className="careers-opening-department">
                                                    {position.department}
                                                </p>

                                                <h3 id={`vacancy-title-${position.id}`}>
                                                    {position.title}
                                                </h3>

                                                {position.company && (
                                                    <p className="careers-opening-company">
                                                        {position.company}
                                                    </p>
                                                )}

                                                <ul className="careers-opening-meta">
                                                    <li>
                                                        <i
                                                            className="fa-solid fa-location-dot"
                                                            aria-hidden="true"
                                                        />
                                                        {position.location}
                                                    </li>

                                                    <li>
                                                        <i
                                                            className="fa-solid fa-briefcase"
                                                            aria-hidden="true"
                                                        />
                                                        {position.experience}
                                                    </li>

                                                    {position.type && (
                                                        <li>
                                                            <i
                                                                className="fa-regular fa-clock"
                                                                aria-hidden="true"
                                                            />
                                                            {position.type}
                                                        </li>
                                                    )}

                                                    <li>
                                                        <i
                                                            className="fa-solid fa-laptop"
                                                            aria-hidden="true"
                                                        />
                                                        {position.mode}
                                                    </li>
                                                </ul>

                                                <p className="careers-opening-summary">
                                                    {getSummary(position.description)}
                                                </p>
                                            </div>

                                            <div className="careers-opening-actions">
                                                <span className="careers-opening-status">
                                                    <span aria-hidden="true" />
                                                    Open for applications
                                                </span>

                                                <Button
                                                    component={Link}
                                                    to={`/careers/${encodeURIComponent(position.id)}/apply`}
                                                    className="website-button website-button-primary"
                                                    aria-label={`Apply for ${position.title}`}
                                                >
                                                    Apply now
                                                    <i
                                                        className="fa-solid fa-arrow-right"
                                                        aria-hidden="true"
                                                    />
                                                </Button>
                                            </div>
                                        </div>

                                        <details className="careers-opening-details">
                                            <summary>
                                                View role details
                                                <i
                                                    className="fa-solid fa-chevron-down"
                                                    aria-hidden="true"
                                                />
                                            </summary>

                                            <div className="careers-opening-description">
                                                <h4>About this role</h4>
                                                <p>{position.description}</p>
                                            </div>
                                        </details>
                                    </article>
                                ))}
                            </div>
                        ) : (
                            <div className="careers-empty">
                                <span className="careers-empty-icon" aria-hidden="true">
                                    <i className="fa-solid fa-briefcase" />
                                </span>

                                <h3>No open positions right now.</h3>

                                <p className="website-section-description">
                                    Please check back for future opportunities. Thank you for your
                                    interest in joining us.
                                </p>

                                <div className="careers-empty-actions">
                                    <Button
                                        component={Link}
                                        to="/about"
                                        className="website-button website-button-primary"
                                    >
                                        Get to know us
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>

                    {!loading && !error && totalPages > 1 && (
                        <div className="careers-openings-pagination">
                            <Pagination
                                count={totalPages}
                                page={page}
                                onChange={(_, nextPage) => setPage(nextPage)}
                                color="primary"
                                size="small"
                                siblingCount={0}
                            />
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}
