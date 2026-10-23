import { Link } from "react-router-dom";

function WebsiteFooter() {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="website-footer">
            <div className="container-fluid website-shell">
                <div className="row g-4 g-lg-5 website-footer-content">
                    {/* Brand */}
                    <div className="col-12 col-lg-4">
                        <Link to="/" className="website-brand" aria-label="Recruitment portal home">
                            <img
                                src="/images/company_logo.svg"
                                alt="Company logo"
                                width="148"
                                height="40"
                                loading="lazy"
                            />
                        </Link>

                        <p className="website-footer-tagline">
                            Opportunities for your next chapter.
                        </p>

                        <p className="website-footer-description">
                            Explore open roles, discover our workplace and stay connected throughout
                            your application journey.
                        </p>
                    </div>

                    {/* Explore */}
                    <div className="col-6 col-lg-2">
                        <h2 className="website-footer-heading">Explore</h2>

                        <nav aria-label="Footer explore links">
                            <ul className="website-footer-links">
                                <li>
                                    <Link to="/">Home</Link>
                                </li>
                                <li>
                                    <Link to="/about">About Us</Link>
                                </li>
                                <li>
                                    <Link to="/jobs">Open Positions</Link>
                                </li>
                                <li>
                                    <Link to="/careers">Careers</Link>
                                </li>
                            </ul>
                        </nav>
                    </div>

                    {/* Candidate links */}
                    <div className="col-6 col-lg-2">
                        <h2 className="website-footer-heading">Candidates</h2>

                        <nav aria-label="Footer candidate links">
                            <ul className="website-footer-links">
                                <li>
                                    <Link to="/jobs">Browse Jobs</Link>
                                </li>
                                <li>
                                    <Link to="/manage/signup">Create Account</Link>
                                </li>
                                <li>
                                    <Link to="/manage?from=website">Sign In</Link>
                                </li>
                            </ul>
                        </nav>
                    </div>

                    {/* Contact */}
                    <div className="col-12 col-lg-4">
                        <h2 className="website-footer-heading">Let’s connect</h2>

                        <p className="website-footer-help">
                            Questions about a vacancy or the application process? Get in touch with
                            our team.
                        </p>

                        <Link to="/contact" className="website-footer-contact">
                            <span className="website-contact-icon">
                                <i className="fa-regular fa-envelope" aria-hidden="true" />
                            </span>

                            <span>Contact Us</span>

                            <i className="fa-solid fa-arrow-right" aria-hidden="true" />
                        </Link>
                    </div>
                </div>

                <div className="website-footer-bottom">
                    <p>© {currentYear} Recruitment Practice Project.</p>
                    <p>Learning project · Not affiliated with Naukri.</p>
                </div>
            </div>
        </footer>
    );
}

export default WebsiteFooter;
