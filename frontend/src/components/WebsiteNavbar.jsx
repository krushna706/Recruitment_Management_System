import { useRef, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import Button from "@mui/material/Button";
import { toast } from "react-toastify";

import { useAuth } from "../context/AuthContext";

// ================== NAVIGATION LINKS ==================
const navigationLinks = [
    { label: "Home", path: "/" },
    { label: "About", path: "/about" },
    { label: "Jobs", path: "/jobs" },
    { label: "Careers", path: "/careers" },
    { label: "Contact", path: "/contact" },
];

// ================== WEBSITE NAVBAR ==================
function WebsiteNavbar() {
    const location = useLocation();
    const { user, loading, authError, refreshUser, logout } = useAuth();

    const menuButtonRef = useRef(null);
    const logoutLock = useRef(false);

    const [menuOpen, setMenuOpen] = useState(false);
    const [menuLocation, setMenuLocation] = useState("");
    const [loggingOut, setLoggingOut] = useState(false);

    // A route change hides the mobile menu.
    const isMenuOpen = menuOpen && menuLocation === location.key;

    // ================== MOBILE MENU ==================
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

    // ================== LOGOUT ==================
    const handleLogout = async () => {
        if (logoutLock.current) {
            return;
        }

        logoutLock.current = true;
        setLoggingOut(true);

        try {
            await logout();

            closeMenu();
            toast.success("Logged out successfully.");
        } catch (error) {
            toast.error(error.response?.data?.message || "Unable to log out. Please try again.");
        } finally {
            logoutLock.current = false;
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
                        {loading ? (
                            <span className="website-auth-status" role="status">
                                Loading account…
                            </span>
                        ) : authError ? (
                            <>
                                <span
                                    className="website-auth-status"
                                    role="status"
                                    title={authError}
                                >
                                    Account check unavailable
                                </span>

                                <Button
                                    type="button"
                                    className="website-button website-button-outline"
                                    variant="outlined"
                                    onClick={refreshUser}
                                >
                                    Retry
                                </Button>
                            </>
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
                                    disabled={loggingOut}
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
                                    to="/manage/signup?from=website"
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
