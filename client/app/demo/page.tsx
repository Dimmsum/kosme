"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { GraduationCap, UserCheck, Users, Briefcase, Sparkles } from "lucide-react";
import { useSignIn, useAuth as useClerkAuth, useClerk } from "@clerk/nextjs";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import { ROLE_DASHBOARD, type UserRole } from "@/lib/auth-context";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

const ROLE_ICON: Record<string, typeof GraduationCap> = {
  student: GraduationCap,
  educator: UserCheck,
  client: Users,
  employer: Briefcase,
};

interface DemoRole {
  role: string;
  label: string;
  description: string;
}

export default function DemoPage() {
  const router = useRouter();
  const { isLoaded, signIn, setActive } = useSignIn();
  const { isSignedIn } = useClerkAuth();
  const { signOut } = useClerk();

  const [roles, setRoles] = useState<DemoRole[]>([]);
  const [rolesLoading, setRolesLoading] = useState(true);
  const [enteringRole, setEnteringRole] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_URL}/api/demo/roles`);
        if (res.ok) {
          const data = (await res.json()) as { roles: DemoRole[] };
          setRoles(data.roles);
        }
      } catch {
        // Leave roles empty — the page still renders with an error state below.
      } finally {
        setRolesLoading(false);
      }
    })();
  }, []);

  const enterDemo = async (role: string) => {
    if (!isLoaded || enteringRole) return;
    setEnteringRole(role);
    setError("");

    try {
      const loginRes = await fetch(`${API_URL}/api/demo/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });

      if (!loginRes.ok) {
        const body = await loginRes.json().catch(() => ({}));
        throw new Error(body.error ?? "Could not start the demo session.");
      }

      const { ticket } = (await loginRes.json()) as { ticket: string };

      // Switching roles while already in a demo (or real) session — clear the
      // current session first so the ticket sign-in has a clean slate.
      if (isSignedIn) {
        await signOut();
      }

      const result = await signIn.create({ strategy: "ticket", ticket });

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        router.push(ROLE_DASHBOARD[role as UserRole] ?? "/");
      } else {
        throw new Error("Sign-in could not be completed. Please try again.");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong.";
      setError(msg);
      setEnteringRole(null);
    }
  };

  return (
    <>
      <Nav />

      <main className="min-h-screen bg-k-white px-4 pb-24 pt-[96px] sm:pt-[110px]">
        <div className="mx-auto w-full max-w-[880px]">
          <div className="mb-3 flex items-center justify-center gap-2 text-k-primary">
            <Sparkles size={16} />
            <span className="text-xs font-medium uppercase tracking-[0.16em]">Demo mode</span>
          </div>

          <h1 className="mb-3 text-center font-serif text-4xl font-light tracking-tight3 text-k-black sm:text-5xl">
            Explore Kosmè
          </h1>
          <p className="mx-auto mb-12 max-w-[560px] text-center text-sm font-light leading-relaxed text-k-gray-600 sm:text-base">
            No account needed. Pick a role below and you'll be dropped straight
            into a live dashboard populated with sample data — perfect for a
            quick look around before you sign up.
          </p>

          {error && (
            <div className="mx-auto mb-8 max-w-[520px] rounded-2xl bg-red-50 px-4 py-3 text-center text-sm text-red-600">
              {error}
            </div>
          )}

          {rolesLoading ? (
            <p className="text-center text-sm font-light text-k-gray-400">Loading demo roles…</p>
          ) : roles.length === 0 ? (
            <p className="text-center text-sm font-light text-k-gray-400">
              Demo accounts aren't set up yet — check back soon.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              {roles.map(({ role, label, description }) => {
                const Icon = ROLE_ICON[role] ?? Sparkles;
                const busy = enteringRole === role;
                return (
                  <button
                    key={role}
                    type="button"
                    onClick={() => enterDemo(role)}
                    disabled={!!enteringRole}
                    className="group flex flex-col items-start gap-3 rounded-3xl border border-k-gray-200 bg-k-white px-7 py-8 text-left shadow-[0_4px_24px_rgba(0,0,0,0.04)] transition-all duration-200 hover:-translate-y-0.5 hover:border-k-primary hover:shadow-[0_8px_32px_rgba(59,10,42,0.10)] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
                  >
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-k-primary/10 text-k-primary">
                      <Icon size={20} />
                    </span>
                    <span className="font-serif text-xl font-light text-k-black">{label}</span>
                    <span className="text-sm font-light leading-relaxed text-k-gray-600">
                      {description}
                    </span>
                    <span className="mt-2 text-sm font-medium text-k-primary">
                      {busy ? "Entering…" : `Continue as ${label} →`}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          <p className="mt-12 text-center text-sm font-light text-k-gray-400">
            Ready for the real thing?{" "}
            <a href="/signup" className="font-medium text-k-primary no-underline hover:text-k-primary-light">
              Create an account →
            </a>
          </p>
        </div>
      </main>

      <Footer />
    </>
  );
}
