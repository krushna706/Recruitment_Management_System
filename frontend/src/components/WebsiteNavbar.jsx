import { useRef, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { Avatar, Button, Divider, Menu, MenuItem } from "@mui/material";
import { toast } from "react-toastify";

import { useAuth } from "../context/AuthContext";
import { getInitials } from "../utils/dataFormat";

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
    const [profileAnchor, setProfileAnchor] = useState(null);
    const [profileLocation, setProfileLocation] = useState("");

    // Route changes hide previously opened menus.
    const isMenuOpen = menuOpen && menuLocation === location.key;
    const profileOpen =
        Boolean(profileAnchor) &&
        !loading &&
        !authError &&
        profileLocation === location.key;

    const displayName = user?.name?.trim() || "My Account";
    const initials = user?.name?.trim() ? getInitials(user.name) : "U";
    const avatarUrl = user?.avatarUrl || user?.avatar?.url || "/images/default-avatar.svg";

    // ================== MENU HANDLERS ==================
    const closeProfile = () => {
        setProfileAnchor(null);
    };

    const closeMenu = () => {
        setMenuOpen(false);
        closeProfile();
    };

    const toggleMenu = () => {
        closeProfile();
        setMenuLocation(location.key);
        setMenuOpen(!isMenuOpen);
    };

    const openProfile = (event) => {
        setProfileLocation(location.key);
        setProfileAnchor(event.currentTarget);
    };

    const handleKeyDown = (event) => {
        if (event.key === "Escape" && isMenuOpen) {
            closeMenu();
            menuButtonRef.current?.focus();
        }
    };

    // ================== LOGOUT ==================
    const handleLogout = async () => {
        if (logoutLock.current) return;

        logoutLock.current = true;
        setLoggingOut(true);
        closeProfile();

        try {
            await logout();
            closeMenu();
            toast.success("Logged out successfully.");
        } catch (error) {
            toast.error(
                error.response?.data?.message || "Unable to log out. Please try again."
            );
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
                {/* ================== BRAND ================== */}
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

                {/* ================== MOBILE TOGGLE ================== */}
                <button
                    ref={menuButtonRef}
                    type="button"
                    className="website-menu-toggle"
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
                    {/* ================== PAGE LINKS ================== */}
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

                    {/* ================== ACCOUNT BUTTON ================== */}
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
                                    onClick={() => refreshUser()}
                                >
                                    Retry
                                </Button>
                            </>
                        ) : (
                            <Button
                                id="website-profile-button"
                                type="button"
                                className={`website-profile-button ${
                                    profileOpen ? "is-open" : ""
                                }`}
                                onClick={openProfile}
                                disabled={loggingOut}
                                aria-controls={
                                    profileOpen ? "website-profile-menu" : undefined
                                }
                                aria-haspopup="menu"
                                aria-expanded={profileOpen ? "true" : undefined}
                                aria-label={
                                    user
                                        ? `Open account menu for ${displayName}`
                                        : "Open sign in and create account menu"
                                }
                                disableRipple
                            >
                                {user ? (
                                    <Avatar
                                        src={avatarUrl}
                                        alt={displayName}
                                        className="website-profile-avatar"
                                    >
                                        {initials}
                                    </Avatar>
                                ) : (
                                    <span
                                        className="website-account-icon"
                                        aria-hidden="true"
                                    >
                                        <i className="fa-regular fa-user" />
                                    </span>
                                )}

                                <span className="website-profile-copy">
                                    <strong title={user ? displayName : undefined}>
                                        {loggingOut
                                            ? "Logging out…"
                                            : user
                                              ? displayName
                                              : "Hello, Sign in"}
                                    </strong>
                                </span>

                                <i
                                    className="fa-solid fa-chevron-down website-profile-chevron"
                                    aria-hidden="true"
                                />
                            </Button>
                        )}
                    </div>
                </div>
            </nav>

            {/* ================== SHARED ACCOUNT DROPDOWN ================== */}
            <Menu
                id="website-profile-menu"
                anchorEl={profileAnchor}
                open={profileOpen}
                onClose={closeProfile}
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                transformOrigin={{ vertical: "top", horizontal: "right" }}
                slotProps={{
                    paper: {
                        className: "website-profile-menu",
                    },
                    list: {
                        "aria-labelledby": "website-profile-button",
                    },
                }}
            >
                {user && (
                    <li className="website-profile-menu-summary" role="none">
                        <Avatar
                            src={avatarUrl}
                            alt={displayName}
                            className="website-profile-avatar"
                        >
                            {initials}
                        </Avatar>

                        <div className="website-profile-menu-copy">
                            <strong>{displayName}</strong>
                        </div>
                    </li>
                )}

                {user && <Divider />}

                <MenuItem
                    component={Link}
                    to={user ? "/manage/dashboard" : "/manage?from=website"}
                    onClick={closeMenu}
                >
                    <span className="website-dropdown-icon" aria-hidden="true">
                        <i
                            className={
                                user
                                    ? "fa-solid fa-table-columns"
                                    : "fa-solid fa-arrow-right-to-bracket"
                            }
                        />
                    </span>

                    <span>{user ? "My Panel" : "Sign In"}</span>

                    <i
                        className="fa-solid fa-chevron-right website-dropdown-arrow"
                        aria-hidden="true"
                    />
                </MenuItem>

                {user ? (
                    <MenuItem
                        className="website-logout-item"
                        onClick={handleLogout}
                        disabled={loggingOut}
                    >
                        <span className="website-dropdown-icon" aria-hidden="true">
                            <i className="fa-solid fa-arrow-right-from-bracket" />
                        </span>

                        <span>{loggingOut ? "Logging out…" : "Logout"}</span>
                    </MenuItem>
                ) : (
                    <MenuItem
                        component={Link}
                        to="/manage/signup?from=website"
                        onClick={closeMenu}
                    >
                        <span className="website-dropdown-icon" aria-hidden="true">
                            <i className="fa-solid fa-user-plus" />
                        </span>

                        <span>Create Account</span>

                        <i
                            className="fa-solid fa-chevron-right website-dropdown-arrow"
                            aria-hidden="true"
                        />
                    </MenuItem>
                )}
            </Menu>
        </header>
    );
}

export default WebsiteNavbar;