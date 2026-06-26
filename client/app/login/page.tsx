"use client";

import { useState, useEffect, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Eye, EyeOff } from "lucide-react";
import { useSignIn, useAuth as useClerkAuth } from "@clerk/nextjs";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import { useAuth, ROLE_DASHBOARD } from "@/lib/auth-context";

type ForgotStep = "idle" | "send" | "reset";

export default function LoginPage() {
  const router = useRouter();
  const { isLoaded, signIn, setActive } = useSignIn();
  const { isSignedIn } = useClerkAuth();
  const { user, role: ctxRole, loading: authLoading } = useAuth();

  // Login form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [redirecting, setRedirecting] = useState(false);

  // Forgot password flow state
  const [forgotStep, setForgotStep] = useState<ForgotStep>("idle");
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState("");

  // Redirect already-authenticated users to their dashboard
  useEffect(() => {
    if (!authLoading && user && ctxRole) {
      router.replace(ROLE_DASHBOARD[ctxRole]);
    }
  }, [authLoading, user, ctxRole, router]);

  // ── Login submit ──────────────────────────────────────────────────────────

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email || !password || !isLoaded) return;
    setLoading(true);
    setError("");

    try {
      // Already signed in — just redirect
      if (isSignedIn) {
        router.replace(ctxRole ? ROLE_DASHBOARD[ctxRole] : "/");
        return;
      }

      const result = await signIn.create({ identifier: email, password });

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        setRedirecting(true);
        // AuthProvider resolves the role and the useEffect above redirects
      } else {
        setError("Sign-in could not be completed. Please try again.");
        setLoading(false);
      }
    } catch (err: unknown) {
      const clerkErr = err as { errors?: Array<{ code: string; message: string }> };
      const code = clerkErr?.errors?.[0]?.code;

      if (code === "session_exists" || code === "single_session_mode") {
        setLoading(false);
        router.replace(ctxRole ? ROLE_DASHBOARD[ctxRole] : "/");
        return;
      }

      const msg = err instanceof Error ? err.message : "An error occurred";
      setError(clerkErr?.errors?.[0]?.message ?? msg);
      setLoading(false);
    }
  };

  // ── Forgot password: send reset code ─────────────────────────────────────

  const handleForgotSend = async (e: FormEvent) => {
    e.preventDefault();
    if (!email || !isLoaded) return;
    setForgotLoading(true);
    setForgotError("");

    try {
      await signIn!.create({
        strategy: "reset_password_email_code",
        identifier: email,
      });
      setForgotStep("reset");
    } catch (err: unknown) {
      const clerkErr = err as { errors?: Array<{ message: string }> };
      setForgotError(clerkErr?.errors?.[0]?.message ?? "Failed to send reset code.");
    } finally {
      setForgotLoading(false);
    }
  };

  // ── Forgot password: verify code + set new password ───────────────────────

  const handleForgotReset = async (e: FormEvent) => {
    e.preventDefault();
    if (!resetCode || !newPassword || !isLoaded) return;
    setForgotLoading(true);
    setForgotError("");

    try {
      const result = await signIn!.attemptFirstFactor({
        strategy: "reset_password_email_code",
        code: resetCode,
        password: newPassword,
      });

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        router.replace(ctxRole ? ROLE_DASHBOARD[ctxRole] : "/");
      } else {
        setForgotError("Could not reset password. Please try again.");
        setForgotLoading(false);
      }
    } catch (err: unknown) {
      const clerkErr = err as { errors?: Array<{ message: string }> };
      setForgotError(clerkErr?.errors?.[0]?.message ?? "An error occurred.");
      setForgotLoading(false);
    }
  };

  const backToLogin = () => {
    setForgotStep("idle");
    setForgotError("");
    setResetCode("");
    setNewPassword("");
  };

  // ── Render ────────────────────────────────────────────────────────────────

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

            {/* ── Step: Send reset code ── */}
            {forgotStep === "send" && (
              <>
                <h1 className="mb-1.5 font-serif text-3xl font-light tracking-tight3 text-k-black sm:text-4xl">
                  Reset password
                </h1>
                <p className="mb-8 text-sm font-light text-k-gray-600">
                  Enter your email and we'll send you a reset code.
                </p>

                {forgotError && (
                  <div className="mb-5 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">
                    {forgotError}
                  </div>
                )}

                <form onSubmit={handleForgotSend} className="flex flex-col gap-4" noValidate>
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="reset-email" className="text-xs font-medium uppercase tracking-[0.1em] text-k-gray-600">
                      Email address
                    </label>
                    <input
                      id="reset-email"
                      type="email"
                      autoComplete="email"
                      required
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full rounded-full border border-k-gray-200 bg-k-white px-5 py-3.5 text-sm text-k-black placeholder:text-k-gray-400 outline-none transition-all duration-200 focus:border-k-primary focus:shadow-[0_0_0_3px_rgba(59,10,42,0.08)]"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={forgotLoading || !email}
                    className="mt-1 w-full rounded-full bg-k-primary px-8 py-3.5 text-sm font-medium tracking-wide text-k-white shadow-[0_4px_20px_rgba(59,10,42,0.2)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-k-primary-light hover:shadow-[0_8px_28px_rgba(59,10,42,0.28)] disabled:cursor-not-allowed disabled:opacity-50 disabled:translate-y-0 disabled:shadow-none"
                  >
                    {forgotLoading ? "Sending…" : "Send reset code"}
                  </button>
                </form>

                <button
                  type="button"
                  onClick={backToLogin}
                  className="mt-6 w-full text-center text-sm font-light text-k-gray-400 transition-colors duration-200 hover:text-k-primary"
                >
                  ← Back to login
                </button>
              </>
            )}

            {/* ── Step: Enter code + new password ── */}
            {forgotStep === "reset" && (
              <>
                <h1 className="mb-1.5 font-serif text-3xl font-light tracking-tight3 text-k-black sm:text-4xl">
                  Set new password
                </h1>
                <p className="mb-8 text-sm font-light text-k-gray-600">
                  Enter the code we sent to <span className="font-medium text-k-black">{email}</span> and choose a new password.
                </p>

                {forgotError && (
                  <div className="mb-5 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">
                    {forgotError}
                  </div>
                )}

                <form onSubmit={handleForgotReset} className="flex flex-col gap-4" noValidate>
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="reset-code" className="text-xs font-medium uppercase tracking-[0.1em] text-k-gray-600">
                      Reset code
                    </label>
                    <input
                      id="reset-code"
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      required
                      placeholder="000000"
                      value={resetCode}
                      onChange={(e) => setResetCode(e.target.value.replace(/\D/g, ""))}
                      className="w-full rounded-full border border-k-gray-200 bg-k-white px-5 py-3.5 text-sm text-k-black placeholder:text-k-gray-400 outline-none transition-all duration-200 focus:border-k-primary focus:shadow-[0_0_0_3px_rgba(59,10,42,0.08)]"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="new-password" className="text-xs font-medium uppercase tracking-[0.1em] text-k-gray-600">
                      New password
                    </label>
                    <div className="relative">
                      <input
                        id="new-password"
                        type={showNewPassword ? "text" : "password"}
                        autoComplete="new-password"
                        required
                        placeholder="••••••••"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full rounded-full border border-k-gray-200 bg-k-white px-5 py-3.5 pr-12 text-sm text-k-black placeholder:text-k-gray-400 outline-none transition-all duration-200 focus:border-k-primary focus:shadow-[0_0_0_3px_rgba(59,10,42,0.08)]"
                      />
                      <button
                        type="button"
                        aria-label={showNewPassword ? "Hide password" : "Show password"}
                        onClick={() => setShowNewPassword((v) => !v)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-k-gray-400 transition-colors duration-200 hover:text-k-black"
                      >
                        {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={forgotLoading || !resetCode || !newPassword}
                    className="mt-1 w-full rounded-full bg-k-primary px-8 py-3.5 text-sm font-medium tracking-wide text-k-white shadow-[0_4px_20px_rgba(59,10,42,0.2)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-k-primary-light hover:shadow-[0_8px_28px_rgba(59,10,42,0.28)] disabled:cursor-not-allowed disabled:opacity-50 disabled:translate-y-0 disabled:shadow-none"
                  >
                    {forgotLoading ? "Resetting…" : "Reset password"}
                  </button>
                </form>

                <button
                  type="button"
                  onClick={backToLogin}
                  className="mt-6 w-full text-center text-sm font-light text-k-gray-400 transition-colors duration-200 hover:text-k-primary"
                >
                  ← Back to login
                </button>
              </>
            )}

            {/* ── Step: Normal login ── */}
            {forgotStep === "idle" && (
              <>
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

                <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
                  {/* Email */}
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="email" className="text-xs font-medium uppercase tracking-[0.1em] text-k-gray-600">
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
                      <label htmlFor="password" className="text-xs font-medium uppercase tracking-[0.1em] text-k-gray-600">
                        Password
                      </label>
                      <button
                        type="button"
                        tabIndex={-1}
                        onClick={() => { setForgotStep("send"); setError(""); }}
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
                        aria-label={showPassword ? "Hide password" : "Show password"}
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
                    {redirecting ? "Redirecting…" : loading ? "Logging in…" : "Log in"}
                  </button>
                </form>

                {/* Sign up link */}
                <p className="mt-7 text-center text-sm font-light text-k-gray-600">
                  Don&apos;t have an account?{" "}
                  <Link href="/signup" className="font-medium text-k-primary no-underline transition-colors duration-200 hover:text-k-primary-light">
                    Sign up →
                  </Link>
                </p>
              </>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
