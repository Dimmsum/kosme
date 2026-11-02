"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useUser, useClerk, useAuth as useClerkAuth } from "@clerk/nextjs";

export type UserRole = "student" | "educator" | "client" | "employer" | "super_admin" | "school_admin";

export const ROLE_DASHBOARD: Record<UserRole, string> = {
  student: "/student/dashboard",
  educator: "/educator/dashboard",
  client: "/volunteer/dashboard",
  employer: "/employer/dashboard",
  super_admin: "/admin/dashboard",
  school_admin: "/school-admin/dashboard",
};

interface AuthState {
  user: { email: string; full_name: string | null } | null;
  role: UserRole | null;
  isDemo: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  user: null,
  role: null,
  isDemo: false,
  loading: true,
  signOut: async () => {},
});

export function normalizeRole(raw: string | null | undefined): UserRole | null {
  if (!raw) return null;
  const r = raw.toLowerCase();
  if (r === "volunteer") return "client"; // backward compat
  if (r === "student" || r === "educator" || r === "client" || r === "employer" || r === "super_admin" || r === "school_admin") {
    return r as UserRole;
  }
  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const { getToken, isSignedIn } = useClerkAuth();

  const [dbRole, setDbRole] = useState<UserRole | null>(null);
  const [dbFullName, setDbFullName] = useState<string | null>(null);
  const [isDemo, setIsDemo] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileFetched, setProfileFetched] = useState(false);
  const [wasSignedIn, setWasSignedIn] = useState(false);

  // Detect session expiry/revocation and redirect to login
  useEffect(() => {
    if (!isLoaded) return;
    if (isSignedIn) {
      setWasSignedIn(true);
    } else if (wasSignedIn) {
      signOut({ redirectUrl: "/login" });
    }
  }, [isSignedIn, isLoaded, wasSignedIn, signOut]);

  // Listen for 401 events dispatched by api.ts when the server rejects a token.
  // A 401 does NOT always mean the Clerk session is gone — it can also be a
  // server-side auth failure (e.g. the API verifying against the wrong Clerk
  // instance, clock skew, or a transient error). Signing out on every 401 would
  // force-logout a perfectly valid session, so we confirm the session is
  // actually gone (Clerk can no longer mint a token) before redirecting.
  useEffect(() => {
    const handleSessionExpired = async () => {
      try {
        const token = await getToken();
        if (token) {
          // Session is still valid — the 401 was server-side, not expiry.
          console.warn(
            "Received 401 from API but Clerk session is still valid — not signing out. " +
              "Check that the server's CLERK_SECRET_KEY matches this frontend's Clerk instance.",
          );
          return;
        }
      } catch {
        // getToken threw — treat as no valid session below.
      }
      signOut({ redirectUrl: "/login" });
    };
    window.addEventListener("session-expired", handleSessionExpired);
    return () => window.removeEventListener("session-expired", handleSessionExpired);
  }, [signOut, getToken]);

  // When user signs in, fetch their role from user_profiles (DB is source of truth)
  useEffect(() => {
    if (!isSignedIn || profileFetched || profileLoading) return;

    setProfileLoading(true);
    (async () => {
      try {
        const token = await getToken();
        const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
        const res = await fetch(`${apiUrl}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          const data = await res.json() as { role: string; full_name: string; is_demo?: boolean };
          setDbRole(normalizeRole(data.role));
          setDbFullName(data.full_name);
          setIsDemo(data.is_demo ?? false);
        } else {
          // The API rejected the session (bad token, wrong Clerk instance, no
          // profile, suspended account). Leave the role null so every role
          // layout shows its "role could not be confirmed" screen instead of
          // opening a dashboard whose every request will fail. Never fall back
          // to Clerk publicMetadata here — it is not an authorization source.
          console.warn(`/api/auth/me returned ${res.status}; role not confirmed.`);
        }
      } catch (err) {
        // API unreachable — same as above: no confirmed role, no dashboard.
        console.warn("/api/auth/me failed; role not confirmed.", err);
      } finally {
        setProfileFetched(true);
        setProfileLoading(false);
      }
    })();
  }, [isSignedIn, profileFetched, profileLoading, getToken]);

  // Reset profile state when user signs out
  useEffect(() => {
    if (!isSignedIn && profileFetched) {
      setDbRole(null);
      setDbFullName(null);
      setIsDemo(false);
      setProfileFetched(false);
    }
  }, [isSignedIn, profileFetched]);

  const email = user?.emailAddresses?.[0]?.emailAddress ?? null;
  const fullName = dbFullName ?? user?.fullName ?? null;
  const loading = !isLoaded || profileLoading || (!!isSignedIn && !profileFetched);

  return (
    <AuthContext.Provider
      value={{
        user: email ? { email, full_name: fullName } : null,
        role: dbRole,
        isDemo,
        loading,
        signOut: () => signOut({ redirectUrl: "/login" }),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
