"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
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

async function resolveRole(u: User): Promise<UserRole | null> {
  const metadataRole = normalizeRole(
    u.user_metadata?.role as string | undefined,
  );
  return metadataRole ?? (await fetchRoleFromDb());
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const userRef = useRef<User | null>(null);
  const roleRef = useRef<UserRole | null>(null);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    roleRef.current = role;
  }, [role]);

  useEffect(() => {
    // Bootstrap: read the existing session from storage so protected
    // layouts don't flash back to /login on full-page reloads.
    supabase.auth.getSession().then(async ({ data: { session: initial } }) => {
      const initialUser = initial?.user ?? null;
      setSession(initial);
      setUser(initialUser);
      if (initialUser) {
        setRole(await resolveRole(initialUser));
      }
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        // TOKEN_REFRESHED is a silent background event — no loading flash needed
        // and the user's role hasn't changed, so skip the full resolution path.
        if (event === "TOKEN_REFRESHED") {
          setSession(newSession);
          return;
        }

        // INITIAL_SESSION is handled by getSession() above — skip to avoid
        // a redundant loading flash.
        if (event === "INITIAL_SESSION") return;
        const newUser = newSession?.user ?? null;
        const prevUser = userRef.current;
        const prevRole = roleRef.current;

        setSession(newSession);
        setUser(newUser);

        if (!newUser) {
          setRole(null);
          setLoading(false);
          return;
        }

        const metadataRole = normalizeRole(
          newUser.user_metadata?.role as string | undefined,
        );
        if (metadataRole) {
          setRole(metadataRole);
          setLoading(false);
          return;
        }

        // Keep the existing resolved role for the same user while we retry
        // role resolution from the database.
        const sameUser = prevUser?.id === newUser.id;
        if (sameUser && prevRole) {
          setRole(prevRole);
        } else {
          setLoading(true);
        }

        const resolvedRole = await fetchRoleFromDb();
        setRole(resolvedRole ?? (sameUser ? prevRole : null));
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
