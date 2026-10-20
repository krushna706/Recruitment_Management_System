import { BrowserRouter, Routes, Route, Navigate, Outlet, Link, useLocation, useParams } from "react-router-dom";
import { ToastContainer } from "react-toastify";

import { useAuth } from "./context/AuthContext";

import WebsiteLayout from "./layouts/WebsiteLayout";
import PanelLayout from "./layouts/PanelLayout";

// Public website
import HomePage from "./website/Home/HomePage";
import Jobs from "./website/Jobs/Jobs";
import JobDetails from "./website/Jobs/JobDetails";
import JobApply from "./website/Jobs/JobApply";
import About from "./website/About";
import Careers from "./website/Careers";
import Contact from "./website/Contact";

// Authentication
import Login from "./auth/Login";
import Signup from "./auth/Signup";
import ForgotPassword from "./auth/ForgotPassword";

// Panel configuration
import { panelPages, getPanelRole } from "./config/panelConfig";

// Shared
import NotFound from "./components/NotFound";

import "./css/website.css";

// ================== SESSION FEEDBACK ==================
function SessionFeedback() {
    const { loading, authError, refreshUser } = useAuth();

    return (
        <section className="container-fluid py-5 text-center">
            {loading ? (
                <p role="status">Checking your session...</p>
            ) : (
                <>
                    <p role="alert">{authError}</p>

                    <button
                        type="button"
                        className="btn btn-primary"
                        onClick={refreshUser}
                    >
                        Try again
                    </button>

                    <Link to="/" className="btn btn-link">
                        Back to website
                    </Link>
                </>
            )}
        </section>
    );
}

// ================== ACCESS DENIED ==================
function AccessDenied() {
    return (
        <section className="container-fluid py-5 text-center">
            <h1>Access denied</h1>

            <p>
                Your account does not have permission to open this page.
            </p>

            <Link to="/" className="btn btn-primary">
                Back to website
            </Link>
        </section>
    );
}

// ================== PANEL ACCESS ==================
function PanelAccess() {
    const { user, loading, authError } = useAuth();
    const location = useLocation();

    if (loading || authError) {
        return <SessionFeedback />;
    }

    if (!user) {
        const returnTo =
            location.pathname + location.search + location.hash;

        return <Navigate to="/manage" replace state={{ returnTo }} />;
    }

    if (!getPanelRole(user.role)) {
        return <AccessDenied />;
    }

    return <Outlet />;
}

// ================== JOB APPLICATION ACCESS ==================
function JobApplicationAccess() {
    const { user, loading, authError } = useAuth();
    const { id } = useParams();

    if (loading || authError) {
        return <SessionFeedback />;
    }

    if (!user) {
        // Return to the same job details after authentication.
        return <Navigate to="/manage" replace state={{ returnTo: `/jobs/${encodeURIComponent(id)}` }} />;
    }

    if (user.role !== "user") {
        return <AccessDenied />;
    }

    return <JobApply user={user} />;
}

// ================== ROLE-BASED DASHBOARD AND PROFILE ==================
function RolePage({ user, page }) {
    const roleConfig = getPanelRole(user?.role);
    const PageComponent = roleConfig?.[page];

    if (!PageComponent) {
        return <AccessDenied />;
    }

    return <PageComponent user={user} />;
}

// ================== INDIVIDUAL PANEL PAGE ACCESS ==================
function PanelPage({ user, page }) {
    if (!user || !page.allowedRoles.includes(user.role)) {
        return <AccessDenied />;
    }

    const PageComponent = page.component;

    return <PageComponent user={user} />;
}

// ================== APPLICATION ROUTES ==================
function App() {
    const { user, logout } = useAuth();
    const roleConfig = getPanelRole(user?.role);

    const panelUser = user
        ? {
              ...user,
              roleLabel: roleConfig?.label || "Unknown role",
          }
        : null;

    return (
        <BrowserRouter>
            <ToastContainer position="top-right" autoClose={3000} />

            <Routes>
                {/* Authentication */}
                <Route path="/manage" element={<Login />} />
                <Route path="/manage/signup" element={<Signup />} />

                {/* Recovery remains a development preview only */}
                {import.meta.env.DEV && (
                    <Route path="/manage/forgot-password" element={<ForgotPassword />} />
                )}

                {/* Public website */}
                <Route element={<WebsiteLayout />}>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/jobs" element={<Jobs />} />
                    <Route path="/jobs/:id" element={<JobDetails user={user} />} />
                    <Route path="/jobs/:id/apply" element={<JobApplicationAccess />} />
                    <Route path="/about" element={<About />} />
                    <Route path="/careers" element={<Careers />} />
                    <Route path="/contact" element={<Contact />} />
                    <Route path="*" element={<NotFound />} />
                </Route>

                {/* Shared user/admin panel */}
                <Route element={<PanelAccess />}>
                    <Route path="/manage" element={<PanelLayout user={panelUser} onLogout={logout} />}>
                        <Route path="dashboard" element={<RolePage user={panelUser} page="dashboard" />} />
                        <Route path="profile" element={<RolePage user={panelUser} page="profile" />} />

                        {panelPages.map((page) => (
                            <Route key={page.path} path={page.path} element={<PanelPage user={panelUser} page={page} />} />
                        ))}

                        <Route path="*" element={<NotFound />} />
                    </Route>
                </Route>
            </Routes>
        </BrowserRouter>
    );
}

export default App;