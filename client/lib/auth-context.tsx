"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "./supabase";

export type UserRole = "student" | "educator" | "client" | "employer";

export const ROLE_DASHBOARD: Record<UserRole, string> = {
  student: "/student/dashboard",
  educator: "/educator/dashboard",
  client: "/volunteer/dashboard",
  employer: "/employer/dashboard",
};

interface AuthState {
  user: User | null;
  session: Session | null;
  role: UserRole | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  user: null,
  session: null,
  role: null,
  loading: true,
  signOut: async () => {},
});

export function normalizeRole(raw: string | null | undefined): UserRole | null {
  if (!raw) return null;
  const role = raw.toLowerCase();
  if (role === "volunteer") return "client";
  if (
    role === "student" ||
    role === "educator" ||
    role === "client" ||
    role === "employer"
  ) {
    return role;
  }
  return null;
}

async function fetchRoleFromDb(): Promise<UserRole | null> {
  const { data, error } = await supabase.rpc("get_my_role");
  if (error) return null;
  return normalizeRole(data as string | null);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        // TOKEN_REFRESHED is a silent background event — no loading flash needed
        // and the user's role hasn't changed, so skip the full resolution path.
        if (event === "TOKEN_REFRESHED") {
          setSession(newSession);
          return;
        }

        // Block layouts while user + role are being resolved
        setLoading(true);
        const newUser = newSession?.user ?? null;
        setSession(newSession);
        setUser(newUser);

        if (newUser) {
          // Prefer role from user_metadata (written at signup since migration 0005).
          // Only fall back to a DB query for legacy accounts that predate the migration.
          const metadataRole = normalizeRole(
            newUser.user_metadata?.role as string | undefined,
          );
          const r = metadataRole ?? (await fetchRoleFromDb());
          setRole(r);
        } else {
          setRole(null);
        }

        setLoading(false);
      },
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, role, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
