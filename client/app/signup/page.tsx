"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { GraduationCap, BookOpen, Heart, Briefcase, ChevronLeft, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import { supabase } from "@/lib/supabase";
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
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleContinue = () => {
    if (selectedRole) setStep(2);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email || !name || !password || !selectedRole) return;

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    setError("");

    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { role: selectedRole, full_name: name },
      },
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    // If session exists the user is auto-confirmed — redirect to their dashboard
    if (data.session) {
      const destination = ROLE_DASHBOARD[selectedRole as UserRole] ?? "/";
      router.push(destination);
      return;
    }

    // Otherwise show "check your email" confirmation
    setLoading(false);
    setSuccess(true);
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
            {step === 2 && !success && (
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
                        placeholder="Min. 6 characters"
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

            {/* ── SUCCESS — email confirmation ── */}
            {step === 2 && success && (
              <div className="flex flex-col items-center py-8 text-center">
                <div className="mb-5 inline-flex h-16 w-16 items-center justify-center rounded-full bg-k-primary/10">
                  <CheckCircle2 size={28} className="text-k-primary" aria-hidden="true" />
                </div>
                <h2 className="mb-2 font-serif text-2xl font-light tracking-tight3 text-k-black sm:text-3xl">
                  Check your email
                </h2>
                <p className="max-w-[300px] text-sm font-light leading-7 text-k-gray-600">
                  We&apos;ve sent a confirmation link to <strong>{email}</strong>. Click it to activate your account, then log in.
                </p>
                <Link
                  href="/login"
                  className="mt-8 inline-flex items-center justify-center rounded-full bg-k-primary px-7 py-3 text-sm font-medium text-k-white no-underline shadow-[0_4px_20px_rgba(59,10,42,0.2)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-k-primary-light"
                >
                  Go to login
                </Link>
              </div>
            )}

            {/* Log in link */}
            {!(step === 2 && success) && (
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
