// User panel
import UserDashboard from "../user/Dashboard";
import MyApplications from "../user/MyApplications";
import ApplicationStatus from "../user/ApplicationStatus";
import UserProfile from "../user/Profile";

// Admin panel
import AdminDashboard from "../admin/Dashboard";
import ManageJobs from "../admin/ManageJobs";
import ManageVacancies from "../admin/ManageVacancies";
import Applications from "../admin/Applications";
import ManageUsers from "../admin/ManageUsers";
import ManageAdmins from "../admin/ManageAdmins";
import ManageEnquiries from "../admin/ManageEnquiries";
import AdminProfile from "../admin/AdminProfile";

/* ===== REGISTERED ROLES ===== */

export const panelRoles = {
    user: {
        label: "User",
        dashboard: UserDashboard,
        profile: UserProfile,
    },
    admin: {
        label: "Admin",
        dashboard: AdminDashboard,
        profile: AdminProfile,
    },
};

export function getPanelRole(role) {
    return Object.prototype.hasOwnProperty.call(panelRoles, role) ? panelRoles[role] : null;
}

/* ===== PANEL PAGES AND PERMISSIONS ===== */

/*
    Add navigation only when a page should appear in the sidebar.
    Declare each unique path once.

    Frontend permissions control navigation and page access.
    Backend APIs must enforce authorization separately.
*/

export const panelPages = [
    {
        path: "my-applications",
        component: MyApplications,
        allowedRoles: ["user"],
        navigation: {
            label: "My Applications",
            icon: "fa-regular fa-file-lines",
            end: false,
        },
    },
    {
        path: "my-applications/:id",
        component: ApplicationStatus,
        allowedRoles: ["user"],
    },
    {
        path: "manage-jobs",
        component: ManageJobs,
        allowedRoles: ["admin"],
        navigation: {
            label: "Manage Jobs",
            icon: "fa-solid fa-briefcase",
            end: false,
        },
    },
    {
        path: "manage-vacancies",
        component: ManageVacancies,
        allowedRoles: ["admin"],
        navigation: {
            label: "Manage Vacancies",
            icon: "fa-solid fa-building",
            end: false,
        },
    },
    {
        path: "manage-applications",
        component: Applications,
        allowedRoles: ["admin"],
        navigation: {
            label: "Applications",
            icon: "fa-regular fa-file-lines",
            end: false,
        },
    },
    {
        path: "manage-users",
        component: ManageUsers,
        allowedRoles: ["admin"],
        navigation: {
            label: "Manage Users",
            icon: "fa-solid fa-users",
            end: false,
        },
    },
    {
        path: "manage-admins",
        component: ManageAdmins,
        allowedRoles: ["admin"],
        navigation: {
            label: "Manage Admins",
            icon: "fa-solid fa-user-shield",
            end: false,
        },
    },
    {
        path: "manage-enquiries",
        component: ManageEnquiries,
        allowedRoles: ["admin"],
        navigation: {
            label: "Manage Enquiries",
            icon: "fa-regular fa-envelope",
            end: false,
        },
    },
];

/* ===== SIDEBAR MENU ===== */

export function getPanelNavigation(role) {
    if (!getPanelRole(role)) {
        return [];
    }

    const pageLinks = panelPages
        .filter((page) => page.navigation && page.allowedRoles.includes(role))
        .map((page) => ({
            path: `/manage/${page.path}`,
            ...page.navigation,
        }));

    return [
        {
            label: "Dashboard",
            path: "/manage/dashboard",
            icon: "fa-solid fa-table-columns",
            end: true,
        },
        ...pageLinks,
        {
            label: "Profile",
            path: "/manage/profile",
            icon: "fa-regular fa-user",
            end: false,
        },
    ];
}
