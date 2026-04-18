"use client";

import { useState, useEffect, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { GraduationCap, BookOpen, Heart, Briefcase, ChevronLeft, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { useSignUp, useAuth as useClerkAuth } from "@clerk/nextjs";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import { ROLE_DASHBOARD, normalizeRole, type UserRole } from "@/lib/auth-context";

interface RoleOption {
  id: string;
  label: string;
  icon: React.ElementType;
  description: string;
  hint: string;
}

const ROLES: RoleOption[] = [
  {
    id: "student",
    label: "Student",
    icon: GraduationCap,
    description: "Log practicals, capture before/after photos, and build a verified portfolio.",
    hint: "You'll document every client session and build an employer-ready portfolio.",
  },
  {
    id: "educator",
    label: "Educator / Lecturer",
    icon: BookOpen,
    description: "Review student work, give precise feedback, and sign off verified records.",
    hint: "You'll verify student practicals and track your cohort's progress in real time.",
  },
  {
    id: "client",
    label: "Volunteer Client",
    icon: Heart,
    description: "Book free student sessions and provide ratings that count toward portfolios.",
    hint: "You'll confirm your appointments and rate student work — helping them graduate.",
  },
  {
    id: "employer",
    label: "Employer / Salon Owner",
    icon: Briefcase,
    description: "Search verified graduate portfolios and shortlist top talent.",
    hint: "You'll browse verified portfolios and shortlist graduates to interview.",
  },
];

export default function SignupPage() {
  const router = useRouter();
  const { isLoaded, signUp, setActive } = useSignUp();
  const { isSignedIn, getToken } = useClerkAuth();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [needsSync, setNeedsSync] = useState<{ role: string; name: string } | null>(null);

  // Once Clerk session is active, sync the profile then redirect
  useEffect(() => {
    if (!isSignedIn || !needsSync) return;
    (async () => {
      try {
        const token = await getToken();
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/sync`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ role: needsSync.role, full_name: needsSync.name }),
        });
        if (!res.ok) {
          const body = await res.text();
          throw new Error(`Sync ${res.status}: ${body}`);
        }
        const destination = ROLE_DASHBOARD[normalizeRole(needsSync.role) as UserRole] ?? "/";
        router.push(destination);
      } catch (err) {
        console.error("Profile sync failed:", err);
        setError("Account created but failed to set up profile. Please log in.");
        setLoading(false);
        setNeedsSync(null);
      }
    })();
  }, [isSignedIn, needsSync, getToken, router]);

  const handleContinue = () => {
    if (selectedRole) setStep(2);
  };

  // Step 2 → create the Clerk account
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email || !name || !password || !selectedRole || !isLoaded) return;

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    setError("");

    const [firstName, ...rest] = name.trim().split(" ");
    const lastName = rest.join(" ") || undefined;

    try {
      const result = await signUp.create({
        emailAddress: email,
        password,
        firstName,
        lastName,
        unsafeMetadata: { role: selectedRole, full_name: name },
      });

      if (result.status === "complete") {
        // No email verification required — sign in immediately
        await setActive({ session: result.createdSessionId });
        setNeedsSync({ role: selectedRole, name });
      } else {
        // Email verification required — send OTP code
        await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
        setLoading(false);
        setStep(3);
      }
    } catch (err: unknown) {
      const clerkErr = err as { errors?: Array<{ message: string; longMessage?: string; code?: string }> };
      const e = clerkErr?.errors?.[0];
      setError(e ? `[${e.code}] ${e.longMessage ?? e.message}` : "An error occurred. Please try again.");
      setLoading(false);
    }
  };

  // Step 3 → verify the OTP code
  const handleVerify = async (e: FormEvent) => {
    e.preventDefault();
    if (!code || !isLoaded) return;
    setLoading(true);
    setError("");

    try {
      const result = await signUp.attemptEmailAddressVerification({ code });

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        setNeedsSync({ role: selectedRole!, name });
      } else {
        setError("Verification incomplete. Please try again.");
        setLoading(false);
      }
    } catch (err: unknown) {
      const clerkErr = err as { errors?: Array<{ message: string }> };
      setError(clerkErr?.errors?.[0]?.message ?? "Invalid code. Please try again.");
      setLoading(false);
    }
  };

  const selectedRoleData = ROLES.find((r) => r.id === selectedRole) ?? null;

  return (
    <>
      <Nav />

      <main className="min-h-screen bg-k-white px-4 pb-24 pt-[72px] sm:pt-[80px]">
        <div className="mx-auto mt-10 w-full max-w-[520px] sm:mt-14">
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

            {/* ── STEP 1 — Role selection ── */}
            {step === 1 && (
              <>
                <h1 className="mb-1.5 font-serif text-3xl font-light tracking-tight3 text-k-black sm:text-4xl">
                  I am a...
                </h1>
                <p className="mb-8 text-sm font-light text-k-gray-600">
                  Choose your role to get started. Your role determines how you
                  use Kosmè.
                </p>

                {/* Role grid */}
                <div className="mb-7 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {ROLES.map(({ id, label, icon: Icon, description }) => {
                    const isSelected = selectedRole === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setSelectedRole(id)}
                        aria-pressed={isSelected}
                        className={`flex flex-col items-start rounded-2xl border-2 p-6 text-left transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-k-primary focus-visible:ring-offset-2 ${
                          isSelected
                            ? "border-k-primary bg-k-primary/5"
                            : "border-k-gray-200 bg-k-white hover:border-k-primary/40"
                        }`}
                      >
                        <div
                          className={`mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl transition-colors duration-200 ${
                            isSelected ? "bg-k-primary/10" : "bg-k-gray-100"
                          }`}
                        >
                          <Icon
                            size={20}
                            className={isSelected ? "text-k-primary" : "text-k-gray-600"}
                          />
                        </div>
                        <p className="text-sm font-medium text-k-black">
                          {label}
                        </p>
                        <p className="mt-1.5 text-xs font-light leading-5 text-k-gray-600">
                          {description}
                        </p>
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  disabled={!selectedRole}
                  onClick={handleContinue}
                  className="w-full rounded-full bg-k-primary px-8 py-3.5 text-sm font-medium tracking-wide text-k-white shadow-[0_4px_20px_rgba(59,10,42,0.2)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-k-primary-light hover:shadow-[0_8px_28px_rgba(59,10,42,0.28)] disabled:cursor-not-allowed disabled:opacity-40 disabled:translate-y-0 disabled:shadow-none"
                >
                  Continue →
                </button>
              </>
            )}

            {/* ── STEP 2 — Account details ── */}
            {step === 2 && (
              <>
                {/* Back */}
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="mb-6 inline-flex items-center gap-1.5 text-sm font-light text-k-gray-600 transition-colors duration-200 hover:text-k-black"
                >
                  <ChevronLeft size={15} />
                  Back
                </button>

                {/* Selected role badge */}
                {selectedRoleData && (
                  <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-k-primary/20 bg-k-primary/8 px-4 py-1.5">
                    <span className="text-xs font-medium text-k-primary">
                      {selectedRoleData.label}
                    </span>
                  </div>
                )}

                {/* Role-specific hint */}
                {selectedRoleData && (
                  <div className="mb-6 rounded-2xl border border-k-primary/10 bg-k-primary/5 px-4 py-3">
                    <p className="text-xs font-light leading-5 text-k-primary">
                      {selectedRoleData.hint}
                    </p>
                  </div>
                )}

                <h2 className="mb-1.5 font-serif text-3xl font-light tracking-tight3 text-k-black sm:text-4xl">
                  Create account
                </h2>
                <p className="mb-8 text-sm font-light text-k-gray-600">
                  Set up your Kosmè account to get started.
                </p>

                {error && (
                  <div className="mb-5 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
                  {/* Required by Clerk bot protection in custom flows */}
                  <div id="clerk-captcha" />
                  {/* Full name */}
                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="name"
                      className="text-xs font-medium uppercase tracking-[0.1em] text-k-gray-600"
                    >
                      Full name
                    </label>
                    <input
                      id="name"
                      type="text"
                      autoComplete="name"
                      required
                      placeholder="Your full name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full rounded-full border border-k-gray-200 bg-k-white px-5 py-3.5 text-sm text-k-black placeholder:text-k-gray-400 outline-none transition-all duration-200 focus:border-k-primary focus:shadow-[0_0_0_3px_rgba(59,10,42,0.08)]"
                    />
                  </div>

                  {/* Email */}
                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="signup-email"
                      className="text-xs font-medium uppercase tracking-[0.1em] text-k-gray-600"
                    >
                      Email address
                    </label>
                    <input
                      id="signup-email"
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
                    <label
                      htmlFor="signup-password"
                      className="text-xs font-medium uppercase tracking-[0.1em] text-k-gray-600"
                    >
                      Password
                    </label>
                    <div className="relative">
                      <input
                        id="signup-password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="new-password"
                        required
                        placeholder="Min. 8 characters"
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

                  {/* Confirm Password */}
                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="confirm-password"
                      className="text-xs font-medium uppercase tracking-[0.1em] text-k-gray-600"
                    >
                      Confirm password
                    </label>
                    <div className="relative">
                      <input
                        id="confirm-password"
                        type={showConfirm ? "text" : "password"}
                        autoComplete="new-password"
                        required
                        placeholder="Re-enter your password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full rounded-full border border-k-gray-200 bg-k-white px-5 py-3.5 pr-12 text-sm text-k-black placeholder:text-k-gray-400 outline-none transition-all duration-200 focus:border-k-primary focus:shadow-[0_0_0_3px_rgba(59,10,42,0.08)]"
                      />
                      <button
                        type="button"
                        aria-label={showConfirm ? "Hide password" : "Show password"}
                        onClick={() => setShowConfirm((v) => !v)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-k-gray-400 transition-colors duration-200 hover:text-k-black"
                      >
                        {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !email || !name || !password || !confirmPassword}
                    className="mt-1 w-full rounded-full bg-k-primary px-8 py-3.5 text-sm font-medium tracking-wide text-k-white shadow-[0_4px_20px_rgba(59,10,42,0.2)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-k-primary-light hover:shadow-[0_8px_28px_rgba(59,10,42,0.28)] disabled:cursor-not-allowed disabled:opacity-50 disabled:translate-y-0 disabled:shadow-none"
                  >
                    {loading ? "Creating account..." : "Create account"}
                  </button>
                </form>
              </>
            )}

            {/* ── STEP 3 — OTP verification ── */}
            {step === 3 && (
              <>
                <button
                  type="button"
                  onClick={() => { setStep(2); setCode(""); setError(""); }}
                  className="mb-6 inline-flex items-center gap-1.5 text-sm font-light text-k-gray-600 transition-colors duration-200 hover:text-k-black"
                >
                  <ChevronLeft size={15} />
                  Back
                </button>

                <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-full bg-k-primary/10">
                  <CheckCircle2 size={24} className="text-k-primary" />
                </div>

                <h2 className="mb-1.5 font-serif text-3xl font-light tracking-tight3 text-k-black sm:text-4xl">
                  Check your email
                </h2>
                <p className="mb-8 text-sm font-light text-k-gray-600">
                  We sent a 6-digit code to <strong>{email}</strong>. Enter it below to confirm your account.
                </p>

                {error && (
                  <div className="mb-5 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">
                    {error}
                  </div>
                )}

                <form onSubmit={handleVerify} className="flex flex-col gap-4" noValidate>
                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="otp-code"
                      className="text-xs font-medium uppercase tracking-[0.1em] text-k-gray-600"
                    >
                      Verification code
                    </label>
                    <input
                      id="otp-code"
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      placeholder="000000"
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      className="w-full rounded-full border border-k-gray-200 bg-k-white px-5 py-3.5 text-center text-lg tracking-[0.3em] text-k-black placeholder:text-k-gray-300 outline-none transition-all duration-200 focus:border-k-primary focus:shadow-[0_0_0_3px_rgba(59,10,42,0.08)]"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading || code.length < 6}
                    className="mt-1 w-full rounded-full bg-k-primary px-8 py-3.5 text-sm font-medium tracking-wide text-k-white shadow-[0_4px_20px_rgba(59,10,42,0.2)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-k-primary-light hover:shadow-[0_8px_28px_rgba(59,10,42,0.28)] disabled:cursor-not-allowed disabled:opacity-50 disabled:translate-y-0 disabled:shadow-none"
                  >
                    {loading ? "Verifying..." : "Verify & continue"}
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
                    }}
                    className="text-center text-sm font-light text-k-gray-400 transition-colors duration-200 hover:text-k-primary"
                  >
                    Resend code
                  </button>
                </form>
              </>
            )}


            {/* Log in link */}
            {step !== 3 && (
              <p className="mt-7 text-center text-sm font-light text-k-gray-600">
                Already have an account?{" "}
                <Link
                  href="/login"
                  className="font-medium text-k-primary no-underline transition-colors duration-200 hover:text-k-primary-light"
                >
                  Log in →
                </Link>
              </p>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
