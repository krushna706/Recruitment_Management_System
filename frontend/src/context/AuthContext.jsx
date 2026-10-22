
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

import api from "../services/api";

// ================== AUTHENTICATION CONTEXT ==================
const AuthContext = createContext(null);

// ================== NORMALIZE USER DATA ==================
// Keep the avatar URL compatible with the existing PanelHeader.
function normalizeAuthUser(user) {
    if (!user) return null;

    return {
        ...user,
        avatarUrl: user.avatar?.url || "",
    };
}

// ================== AUTHENTICATION PROVIDER ==================
export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [authError, setAuthError] = useState("");

    // Prevent older responses from overwriting newer authentication state.
    const sessionRequestId = useRef(0);

    // ================== CLEAR LOCAL SESSION ==================
    const clearSession = useCallback(() => {
        sessionRequestId.current += 1;

        setUser(null);
        setAuthError("");
        setLoading(false);
    }, []);

    // ================== GLOBAL SESSION ERROR HANDLING ==================
    useEffect(() => {
        // Tag requests with the current authentication state version.
        // This property stays in Axios configuration, not HTTP headers.
        const requestInterceptor = api.interceptors.request.use((config) => {
            config.authRequestId = sessionRequestId.current;

            return config;
        });

        const responseInterceptor = api.interceptors.response.use(
            (response) => response,
            (error) => {
                const config = error.config;

                const isCurrentRequest =
                    config?.authRequestId === sessionRequestId.current;

                if (
                    error.response?.status === 401 &&
                    config &&
                    !config.skipSessionHandling &&
                    isCurrentRequest
                ) {
                    clearSession();
                }

                // Let the calling page handle its error message.
                return Promise.reject(error);
            }
        );

        return () => {
            api.interceptors.request.eject(requestInterceptor);
            api.interceptors.response.eject(responseInterceptor);
        };
    }, [clearSession]);

    // ================== RESTORE SESSION ==================
    const refreshUser = useCallback(async () => {
        const requestId = ++sessionRequestId.current;

        setLoading(true);
        setAuthError("");

        try {
            const { data } = await api.get("/auth/me", {
                skipSessionHandling: true,
            });

            if (requestId === sessionRequestId.current) {
                setUser(normalizeAuthUser(data.user));
            }
        } catch (error) {
            if (requestId !== sessionRequestId.current) {
                return;
            }

            setUser(null);

            const status = error.response?.status;

            // A missing or expired login is a normal guest state.
            if (status === 401) {
                setAuthError("");
            } else if (status === 403) {
                setAuthError(
                    error.response?.data?.message ||
                    "Your account is not allowed to access this service."
                );
            } else {
                setAuthError(
                    "Unable to check your session. Please try again."
                );
            }
        } finally {
            if (requestId === sessionRequestId.current) {
                setLoading(false);
            }
        }
    }, []);

    // ================== INITIAL SESSION CHECK ==================
    useEffect(() => {
        refreshUser();

        return () => {
            // Ignore a pending session response after cleanup.
            sessionRequestId.current += 1;
        };
    }, [refreshUser]);

    // ================== LOGIN ==================
    const login = useCallback(async (credentials) => {
        const { data } = await api.post("/auth/login", credentials, {
            skipSessionHandling: true,
        });

        sessionRequestId.current += 1;

        setUser(normalizeAuthUser(data.user));
        setAuthError("");
        setLoading(false);

        return data;
    }, []);

    // ================== SIGNUP ==================
    const signup = useCallback(async (details) => {
        const { data } = await api.post("/auth/signup", details, {
            skipSessionHandling: true,
        });

        sessionRequestId.current += 1;

        setUser(normalizeAuthUser(data.user));
        setAuthError("");
        setLoading(false);

        return data;
    }, []);

    // ================== UPDATE SHARED PROFILE STATE ==================
    // Call only after the backend confirms a successful profile update.
    // This immediately refreshes the header name and avatar.
    const updateUserProfile = useCallback((profile) => {
        if (!profile?._id) return;

        setUser((currentUser) => {
            // Never update another authenticated user's local state.
            if (
                !currentUser ||
                String(currentUser._id) !== String(profile._id)
            ) {
                return currentUser;
            }

            return normalizeAuthUser({
                ...currentUser,
                name: profile.name ?? currentUser.name,
                email: profile.email ?? currentUser.email,
                phone: profile.phone ?? currentUser.phone,
                avatar: profile.avatar ?? currentUser.avatar,
            });
        });
    }, []);

    // ================== LOGOUT ==================
    const logout = useCallback(async () => {
        try {
            await api.post("/auth/logout", null, {
                skipSessionHandling: true,
            });
        } catch (error) {
            // A missing or expired session is already logged out.
            // Network and other errors remain visible to the caller.
            if (error.response?.status !== 401) {
                throw error;
            }
        }

        clearSession();
    }, [clearSession]);

    // ================== SHARED CONTEXT VALUE ==================
    const value = {
        user,
        loading,
        authError,
        isAuthenticated: Boolean(user),
        login,
        signup,
        logout,
        refreshUser,
        updateUserProfile,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

// ================== AUTHENTICATION HOOK ==================
export function useAuth() {
    const context = useContext(AuthContext);

    if (!context) {
        throw new Error("useAuth must be used inside AuthProvider.");
    }

    return context;
}
