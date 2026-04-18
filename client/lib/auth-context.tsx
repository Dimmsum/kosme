"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useUser, useClerk, useAuth as useClerkAuth } from "@clerk/nextjs";

export type UserRole = "student" | "educator" | "client" | "employer";

export const ROLE_DASHBOARD: Record<UserRole, string> = {
  student: "/student/dashboard",
  educator: "/educator/dashboard",
  client: "/volunteer/dashboard",
  employer: "/employer/dashboard",
};

interface AuthState {
  user: { email: string } | null;
  role: UserRole | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  user: null,
  role: null,
  loading: true,
  signOut: async () => {},
});

export function normalizeRole(raw: string | null | undefined): UserRole | null {
  if (!raw) return null;
  const r = raw.toLowerCase();
  if (r === "volunteer") return "client";
  if (r === "student" || r === "educator" || r === "client" || r === "employer") {
    return r as UserRole;
  }
  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const { getToken, isSignedIn } = useClerkAuth();
  const [syncing, setSyncing] = useState(false);
  const [syncAttempted, setSyncAttempted] = useState(false);

  // Auto-sync: when user is signed in but publicMetadata.role is not yet set
  // (happens after email-link verification callback), sync using unsafeMetadata.role.
  // Only attempted once per session to avoid infinite loops when the sync fails.
  useEffect(() => {
    if (!isSignedIn || !user || syncing || syncAttempted) return;
    const pubRole = user.publicMetadata?.role as string | undefined;
    const unsafeRole = user.unsafeMetadata?.role as string | undefined;
    const unsafeName = user.unsafeMetadata?.full_name as string | undefined;
    if (!pubRole && unsafeRole && unsafeName) {
      setSyncing(true);
      setSyncAttempted(true);
      (async () => {
        try {
          const token = await getToken();
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/sync`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ role: unsafeRole, full_name: unsafeName }),
          });
          if (!res.ok) {
            console.error("Auto-sync failed:", res.status, await res.text());
          } else {
            await user.reload(); // refresh publicMetadata from Clerk
          }
        } catch (err) {
          console.error("Auto-sync error:", err);
        } finally {
          setSyncing(false);
        }
      })();
    } else if (!pubRole) {
      // No unsafeMetadata to sync from — mark as attempted so we don't loop
      setSyncAttempted(true);
    }
  }, [isSignedIn, user, syncing, syncAttempted, getToken]);

  const role = normalizeRole((user?.publicMetadata?.role as string) ?? null);
  const loading = !isLoaded || syncing;
  const email = user?.emailAddresses?.[0]?.emailAddress ?? null;

  return (
    <AuthContext.Provider
      value={{
        user: email ? { email } : null,
        role,
        loading,
        signOut: () => signOut(),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
