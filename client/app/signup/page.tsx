"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import { GraduationCap, BookOpen, Heart, Briefcase, ChevronLeft, Mail } from "lucide-react";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";

type Role = "student" | "educator" | "client" | "employer";

interface RoleCard {
  id: Role;
  icon: React.ElementType;
  label: string;
  sublabel: string;
  description: string;
}

const roleCards: RoleCard[] = [
  {
    id: "student",
    icon: GraduationCap,
    label: "Student",
    sublabel: "",
    description: "Track your practicals and build a verified portfolio",
  },
  {
    id: "educator",
    icon: BookOpen,
    label: "Educator",
    sublabel: "/ Lecturer",
    description: "Verify student competence efficiently",
  },
  {
    id: "client",
    icon: Heart,
    label: "Volunteer Client",
    sublabel: "",
    description: "Support student practice sessions",
  },
  {
    id: "employer",
    icon: Briefcase,
    label: "Employer",
    sublabel: "/ Salon Owner",
    description: "Browse verified student portfolios",
  },
];

const roleLabels: Record<Role, string> = {
  student: "Student",
  educator: "Educator / Lecturer",
  client: "Volunteer Client",
  employer: "Employer / Salon Owner",
};

export default function SignupPage() {
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [institution, setInstitution] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleContinue = () => {
    if (selectedRole) setStep(2);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email || !name || !selectedRole) return;
    setLoading(true);
    setError("");

    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
      await fetch(`${apiBase}/api/waitlist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name, role: selectedRole }),
      });
    } catch {
      // Show success even if API is unreachable during preview
    }

    setLoading(false);
    setSuccess(true);
  };

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
                  {roleCards.map(({ id, icon: Icon, label, sublabel, description }) => {
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
                        <p className="mb-1 text-sm font-medium text-k-black">
                          {label}
                          {sublabel && (
                            <span className="font-light text-k-gray-600">{sublabel}</span>
                          )}
                        </p>
                        <p className="text-xs font-light leading-5 text-k-gray-400">
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

            {/* ── STEP 2 — Details form ── */}
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
                {selectedRole && (
                  <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-k-primary/20 bg-k-primary/8 px-4 py-1.5">
                    <span className="text-xs font-medium text-k-primary">
                      {roleLabels[selectedRole]}
                    </span>
                  </div>
                )}

                <h2 className="mb-1.5 font-serif text-3xl font-light tracking-tight3 text-k-black sm:text-4xl">
                  Get started
                </h2>
                <p className="mb-8 text-sm font-light text-k-gray-600">
                  Join the waitlist and be first to know when Kosmè launches.
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

                  {/* Institution (optional) */}
                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="institution"
                      className="text-xs font-medium uppercase tracking-[0.1em] text-k-gray-600"
                    >
                      Institution{" "}
                      <span className="normal-case tracking-normal text-k-gray-400 font-light">
                        (optional)
                      </span>
                    </label>
                    <input
                      id="institution"
                      type="text"
                      autoComplete="organization"
                      placeholder="Your school or salon"
                      value={institution}
                      onChange={(e) => setInstitution(e.target.value)}
                      className="w-full rounded-full border border-k-gray-200 bg-k-white px-5 py-3.5 text-sm text-k-black placeholder:text-k-gray-400 outline-none transition-all duration-200 focus:border-k-primary focus:shadow-[0_0_0_3px_rgba(59,10,42,0.08)]"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !email || !name}
                    className="mt-1 w-full rounded-full bg-k-primary px-8 py-3.5 text-sm font-medium tracking-wide text-k-white shadow-[0_4px_20px_rgba(59,10,42,0.2)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-k-primary-light hover:shadow-[0_8px_28px_rgba(59,10,42,0.28)] disabled:cursor-not-allowed disabled:opacity-50 disabled:translate-y-0 disabled:shadow-none"
                  >
                    {loading ? "Joining..." : "Join waitlist"}
                  </button>
                </form>
              </>
            )}

            {/* ── SUCCESS state ── */}
            {step === 2 && success && (
              <div className="flex flex-col items-center py-8 text-center">
                <div className="mb-5 inline-flex h-16 w-16 items-center justify-center rounded-full bg-k-primary/10">
                  <Mail size={28} className="text-k-primary" aria-hidden="true" />
                </div>
                <h2 className="mb-2 font-serif text-2xl font-light tracking-tight3 text-k-black sm:text-3xl">
                  You&apos;re on the list!
                </h2>
                <p className="max-w-[300px] text-sm font-light leading-7 text-k-gray-600">
                  We&apos;ll be in touch as soon as Kosmè is ready for your
                  role. Keep an eye on your inbox.
                </p>
                <Link
                  href="/"
                  className="mt-8 inline-flex items-center justify-center rounded-full border border-k-gray-200 px-7 py-3 text-sm font-medium text-k-black no-underline transition-all duration-200 hover:border-k-primary hover:text-k-primary"
                >
                  Back to home
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
