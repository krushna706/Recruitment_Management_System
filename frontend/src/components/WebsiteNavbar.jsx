import { useRef, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import Button from "@mui/material/Button";
import { toast } from "react-toastify";

const navigationLinks = [
    { label: "Home", path: "/" },
    { label: "About", path: "/about" },
    { label: "Jobs", path: "/jobs" },
    { label: "Careers", path: "/careers" },
    { label: "Contact", path: "/contact" },
];

function WebsiteNavbar({ user = null, onLogout, authLoading = false }) {
    const location = useLocation();
    const menuButtonRef = useRef(null);

    const [menuOpen, setMenuOpen] = useState(false);
    const [menuLocation, setMenuLocation] = useState("");
    const [loggingOut, setLoggingOut] = useState(false);

    // A route change hides the mobile menu.
    const isMenuOpen = menuOpen && menuLocation === location.key;

    const closeMenu = () => {
        setMenuOpen(false);
    };

    const toggleMenu = () => {
        setMenuLocation(location.key);
        setMenuOpen(!isMenuOpen);
    };

    const handleKeyDown = (event) => {
        if (event.key === "Escape" && isMenuOpen) {
            closeMenu();
            menuButtonRef.current?.focus();
        }
    };

    const handleLogout = async () => {
        if (!onLogout || loggingOut) {
            return;
        }

        setLoggingOut(true);

        try {
            // Parent callback handles API logout and auth state.
            await onLogout();

            closeMenu();
            toast.success("Logged out successfully.");
        } catch {
            toast.error("Unable to log out. Please try again.");
        } finally {
            setLoggingOut(false);
        }
    };

    return (
        <header className="website-header">
            <nav
                className="container-fluid website-shell website-nav"
                aria-label="Main navigation"
                onKeyDown={handleKeyDown}
            >
                {/* Brand */}
                <Link
                    to="/"
                    className="website-brand"
                    aria-label="Recruitment portal home"
                    onClick={closeMenu}
                >
                    <img
                        src="/images/company_logo.svg"
                        alt="Company logo"
                        width="148"
                        height="40"
                    />
                </Link>

                {/* Mobile toggle */}
                <button
                    ref={menuButtonRef}
                    className="website-menu-toggle"
                    type="button"
                    aria-label={isMenuOpen ? "Close menu" : "Open menu"}
                    aria-expanded={isMenuOpen}
                    aria-controls="website-navigation"
                    onClick={toggleMenu}
                >
                    <i
                        className={`fa-solid ${isMenuOpen ? "fa-xmark" : "fa-bars"}`}
                        aria-hidden="true"
                    />
                </button>

                <div
                    id="website-navigation"
                    className={`website-navigation ${isMenuOpen ? "is-open" : ""}`}
                >
                    <ul className="website-nav-list">
                        {navigationLinks.map((item) => (
                            <li key={item.path}>
                                <NavLink
                                    to={item.path}
                                    end={item.path === "/"}
                                    onClick={closeMenu}
                                    className={({ isActive }) =>
                                        `website-nav-link ${isActive ? "is-active" : ""}`
                                    }
                                >
                                    {item.label}
                                </NavLink>
                            </li>
                        ))}
                    </ul>

                    {/* Guest / authenticated actions */}
                    <div className="website-nav-actions">
                        {authLoading ? (
                            <span className="website-auth-status" role="status">
                                Loading account…
                            </span>
                        ) : user ? (
                            <>
                                <Button
                                    component={Link}
                                    to="/manage/dashboard"
                                    className="website-button website-button-primary"
                                    variant="contained"
                                    disableElevation
                                    onClick={closeMenu}
                                >
                                    My Panel
                                </Button>

                                <Button
                                    type="button"
                                    className="website-button website-button-outline"
                                    variant="outlined"
                                    disabled={loggingOut || !onLogout}
                                    onClick={handleLogout}
                                >
                                    {loggingOut ? "Logging out…" : "Logout"}
                                </Button>
                            </>
                        ) : (
                            <>
                                <Link
                                    to="/manage?from=website"
                                    className="website-signin-link"
                                    onClick={closeMenu}
                                >
                                    Sign In
                                </Link>

                                <Button
                                    component={Link}
                                    to="/signup"
                                    className="website-button website-button-primary"
                                    variant="contained"
                                    disableElevation
                                    onClick={closeMenu}
                                >
                                    Create Account
                                    <i className="fa-solid fa-arrow-right" aria-hidden="true" />
                                </Button>
                            </>
                        )}
                    </div>
                </div>
            </nav>
        </header>
    );
}

export default WebsiteNavbar;