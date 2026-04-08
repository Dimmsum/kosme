"use client";

import { useState, useEffect, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Eye, EyeOff } from "lucide-react";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import { supabase } from "@/lib/supabase";
import { useAuth, ROLE_DASHBOARD } from "@/lib/auth-context";

export default function LoginPage() {
  const router = useRouter();
  const { user, role: ctxRole, loading: authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // If the user is already authenticated (e.g. navigated back to /login),
  // or the AuthProvider just resolved a fresh sign-in, redirect immediately.
  useEffect(() => {
    if (!authLoading && user && ctxRole) {
      router.replace(ROLE_DASHBOARD[ctxRole]);
    }
  }, [authLoading, user, ctxRole, router]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    setError("");

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    // Don't navigate here — the onAuthStateChange listener in AuthProvider
    // will update the context, and the useEffect above will redirect once
    // user + role are fully resolved. This eliminates the race condition.
  };

  return (
    <>
      <Nav />

      <main className="min-h-screen bg-k-white px-4 pb-24 pt-[72px] sm:pt-[80px]">
        <div className="mx-auto mt-12 w-full max-w-[440px] sm:mt-16">
          {/* Logo */}
          <div className="mb-8 flex justify-center">
            <Link href="/" aria-label="Go to Kosmè home">
              <Image
                src="/Logo Text Only.png"
                alt="Kosmè"
                width={120}
                height={32}
                className="h-7 w-auto"
                priority
              />
            </Link>
          </div>

          {/* Card */}
          <div className="rounded-3xl border border-k-gray-200 bg-k-white px-7 py-9 shadow-[0_4px_32px_rgba(0,0,0,0.06)] sm:px-9 sm:py-10">
            <h1 className="mb-1.5 font-serif text-3xl font-light tracking-tight3 text-k-black sm:text-4xl">
              Welcome back
            </h1>
            <p className="mb-8 text-sm font-light text-k-gray-600">
              Log in to your Kosmè account
            </p>

            {error && (
              <div className="mb-5 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <form
              onSubmit={handleSubmit}
              className="flex flex-col gap-4"
              noValidate
            >
              {/* Email */}
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="email"
                  className="text-xs font-medium uppercase tracking-[0.1em] text-k-gray-600"
                >
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-full border border-k-gray-200 bg-k-white px-5 py-3.5 text-sm text-k-black placeholder:text-k-gray-400 outline-none transition-all duration-200 focus:border-k-primary focus:shadow-[0_0_0_3px_rgba(59,10,42,0.08)]"
                />
              </div>

              {/* Password */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="password"
                    className="text-xs font-medium uppercase tracking-[0.1em] text-k-gray-600"
                  >
                    Password
                  </label>
                  <button
                    type="button"
                    tabIndex={-1}
                    className="text-xs font-light text-k-gray-400 no-underline transition-colors duration-200 hover:text-k-primary"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-full border border-k-gray-200 bg-k-white px-5 py-3.5 pr-12 text-sm text-k-black placeholder:text-k-gray-400 outline-none transition-all duration-200 focus:border-k-primary focus:shadow-[0_0_0_3px_rgba(59,10,42,0.08)]"
                  />
                  <button
                    type="button"
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-k-gray-400 transition-colors duration-200 hover:text-k-black"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading || !email || !password}
                className="mt-1 w-full rounded-full bg-k-primary px-8 py-3.5 text-sm font-medium tracking-wide text-k-white shadow-[0_4px_20px_rgba(59,10,42,0.2)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-k-primary-light hover:shadow-[0_8px_28px_rgba(59,10,42,0.28)] disabled:cursor-not-allowed disabled:opacity-50 disabled:translate-y-0 disabled:shadow-none"
              >
                {loading ? "Logging in..." : "Log in"}
              </button>
            </form>

            {/* Sign up link */}
            <p className="mt-7 text-center text-sm font-light text-k-gray-600">
              Don&apos;t have an account?{" "}
              <Link
                href="/signup"
                className="font-medium text-k-primary no-underline transition-colors duration-200 hover:text-k-primary-light"
              >
                Sign up →
              </Link>
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
