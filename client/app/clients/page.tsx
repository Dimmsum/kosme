"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  CheckCircle,
  ArrowRight,
  Eye,
  EyeOff,
  CheckCircle2,
} from "lucide-react";
import { useSignUp, useAuth as useClerkAuth } from "@clerk/nextjs";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import Reveal from "@/components/Reveal";
import SectionTag from "@/components/SectionTag";
import { supabase } from "@/lib/supabase";

const { data: { publicUrl: HERO_VIDEO_URL } } = supabase.storage
  .from("videos")
  .getPublicUrl("Kosme.mp4");

const ease = [0.22, 1, 0.36, 1] as const;

const PARISHES = [
  "Kingston",
  "St. Andrew",
  "St. Thomas",
  "Portland",
  "St. Mary",
  "St. Ann",
  "Trelawny",
  "St. James",
  "Hanover",
  "Westmoreland",
  "St. Elizabeth",
  "Manchester",
  "Clarendon",
  "St. Catherine",
];

const participationSteps = [
  {
    number: "01",
    title: "Browse opportunities",
    description:
      "Explore available student practicals by service category — from colour and cutting to skincare and treatments.",
  },
  {
    number: "02",
    title: "Volunteer for a session",
    description:
      "Choose a session that interests you and register your interest. You'll receive clear details about what the service involves.",
  },
  {
    number: "03",
    title: "Confirm service completion",
    description:
      "After your appointment, confirm in-app that the session took place. One tap — that's all it takes to help a student's record progress.",
  },
  {
    number: "04",
    title: "Leave optional feedback",
    description:
      "Share an optional note about your experience. Your feedback is private and only seen by the supervising educator.",
  },
];

const trustPoints = [
  {
    title: "Always supervised",
    description:
      "Every student service is performed under the supervision of a qualified educator. You are never in an unsupported environment.",
  },
  {
    title: "Clear consent",
    description:
      "You confirm your participation before every session. You are always in control — nothing proceeds without your explicit agreement.",
  },
  {
    title: "Your privacy matters",
    description:
      "Your personal details are never shared publicly. Your participation is visible only to the student and their supervising educator.",
  },
];

type FormState = {
  full_name: string;
  gender: string;
  whatsapp: string;
  email: string;
  parish: string;
  service_preferences: string[];
  availability: string[];
  preferred_time: string[];
  willing_to_travel: string;
  photo_consent: boolean;
  trainee_acknowledgement: boolean;
  password: string;
  confirmPassword: string;
};

const initialForm: FormState = {
  full_name: "",
  gender: "",
  whatsapp: "",
  email: "",
  parish: "",
  service_preferences: [],
  availability: [],
  preferred_time: [],
  willing_to_travel: "",
  photo_consent: false,
  trainee_acknowledgement: false,
  password: "",
  confirmPassword: "",
};

function toggleArray(arr: string[], value: string): string[] {
  return arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
}

export default function ClientsPage() {
  const router = useRouter();
  const { isLoaded, signUp, setActive } = useSignUp();
  const { isSignedIn, getToken } = useClerkAuth();

  const [videoLoaded, setVideoLoaded] = useState(false);
  const [form, setForm] = useState<FormState>(initialForm);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [step, setStep] = useState<"form" | "verify" | "success">("form");
  const [otpCode, setOtpCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // After Clerk session becomes active, sync the profile + save preferences
  useEffect(() => {
    if (!isSignedIn || step !== "verify") return;
    (async () => {
      try {
        const token = await getToken();
        const apiUrl =
          process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

        // Sync role to DB
        await fetch(`${apiUrl}/api/auth/sync`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ role: "client", full_name: form.full_name }),
        });

        // Save client preferences
        await fetch(`${apiUrl}/api/client-signup`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            full_name: form.full_name,
            gender: form.gender,
            whatsapp: form.whatsapp,
            email: form.email,
            parish: form.parish,
            service_preferences: form.service_preferences,
            availability: form.availability,
            preferred_time: form.preferred_time,
            willing_to_travel: form.willing_to_travel === "yes",
            photo_consent: form.photo_consent,
            trainee_acknowledgement: form.trainee_acknowledgement,
          }),
        });

        setStep("success");
        // Redirect to client dashboard after showing the success message briefly
        setTimeout(() => router.push("/volunteer/dashboard"), 2000);
      } catch {
        setError(
          "Account created but failed to save preferences. Please contact us.",
        );
        setSubmitting(false);
      }
    })();
  }, [isSignedIn]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!isLoaded) return;

    if (form.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (form.service_preferences.length === 0) {
      setError("Please select at least one service preference.");
      return;
    }
    if (form.availability.length === 0) {
      setError("Please select at least one availability option.");
      return;
    }
    if (form.preferred_time.length === 0) {
      setError("Please select at least one preferred time.");
      return;
    }

    setSubmitting(true);

    const [firstName, ...rest] = form.full_name.trim().split(" ");
    const lastName = rest.join(" ") || undefined;

    try {
      const result = await signUp!.create({
        emailAddress: form.email,
        password: form.password,
        firstName,
        lastName,
        unsafeMetadata: { role: "client", full_name: form.full_name },
      });

      if (result.status === "complete") {
        await setActive!({ session: result.createdSessionId });
        // useEffect above will fire when isSignedIn flips to true
      } else {
        await signUp!.prepareEmailAddressVerification({
          strategy: "email_code",
        });
        setSubmitting(false);
        setStep("verify");
      }
    } catch (err: unknown) {
      const clerkErr = err as {
        errors?: Array<{
          message: string;
          longMessage?: string;
          code?: string;
        }>;
      };
      const e = clerkErr?.errors?.[0];
      setError(
        e
          ? (e.longMessage ?? e.message)
          : "An error occurred. Please try again.",
      );
      setSubmitting(false);
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!isLoaded || !signUp) return;
    setSubmitting(true);
    setError(null);

    try {
      const result = await signUp.attemptEmailAddressVerification({
        code: otpCode,
      });
      if (result.status === "complete") {
        await setActive!({ session: result.createdSessionId });
        // useEffect fires once isSignedIn becomes true
      } else {
        setError("Verification incomplete. Please try again.");
        setSubmitting(false);
      }
    } catch (err: unknown) {
      const clerkErr = err as { errors?: Array<{ message: string }> };
      setError(
        clerkErr?.errors?.[0]?.message ?? "Invalid code. Please try again.",
      );
      setSubmitting(false);
    }
  }

  return (
    <>
      <Nav />

      {/* Hero */}
      <section className="relative w-full overflow-hidden pt-16 md:pt-20">
        {/* Video — maintains native aspect ratio */}
        <motion.div
          className="relative aspect-video w-full"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.2 }}
        >
          {/* Skeleton shown while video buffering */}
          {!videoLoaded && (
            <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-k-primary via-k-primary-light to-[#7A2058]" />
          )}
          <video
            src={HERO_VIDEO_URL}
            autoPlay
            loop
            muted
            playsInline
            onCanPlay={() => setVideoLoaded(true)}
            className={`h-full w-full object-cover transition-opacity duration-700 ${videoLoaded ? "opacity-100" : "opacity-0"}`}
          />
        </motion.div>

        {/* Dark overlay for text legibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />

        {/* CTA overlay — centered */}
        <motion.div
          className="absolute inset-0 flex flex-col items-center justify-center gap-5"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.5, ease }}
        >
          <a
            href="#signup"
            className="inline-flex items-center justify-center rounded-full bg-white px-10 py-4 text-sm font-medium tracking-wide text-k-primary no-underline shadow-[0_4px_24px_rgba(0,0,0,0.3)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/90 hover:shadow-[0_8px_32px_rgba(0,0,0,0.35)]"
          >
            Sign up now
          </a>
          <a
            href="#how"
            className="inline-flex items-center gap-2 text-sm font-normal tracking-wide text-white no-underline drop-shadow-[0_1px_3px_rgba(0,0,0,0.6)] transition-[gap] duration-200 hover:gap-3.5"
          >
            How it works <ArrowRight size={15} />
          </a>
        </motion.div>
      </section>


{/* Participation steps */}
      <section
        id="how"
        className="px-4 py-20 sm:px-6 sm:py-24 md:px-12 md:py-[120px]"
      >
        <div className="mx-auto max-w-[1400px]">
          <Reveal>
            <SectionTag>How it works</SectionTag>
            <h2 className="mb-4 font-serif text-[clamp(2rem,7vw,3.6rem)] font-light leading-[1.05] tracking-tight3 text-k-black">
              Simple from
              <br />
              <em className="italic text-k-primary">start to finish</em>
            </h2>
            <p className="mb-16 max-w-[480px] text-sm font-light leading-7 text-k-gray-600 sm:text-base">
              Participating takes minutes. Your contribution makes a real
              difference to a student&apos;s professional journey.
            </p>
          </Reveal>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {participationSteps.map((step, i) => (
              <Reveal key={step.number} delay={i * 0.1} direction="up">
                <div className="relative rounded-3xl border border-k-gray-200 bg-k-white p-7 h-full">
                  <div className="mb-5 inline-flex h-10 w-10 items-center justify-center rounded-full bg-k-accent/10">
                    <span className="font-serif text-sm font-medium text-k-accent">
                      {step.number}
                    </span>
                  </div>
                  <h3 className="mb-3 font-serif text-xl font-light text-k-black">
                    {step.title}
                  </h3>
                  <p className="text-sm font-light leading-7 text-k-gray-600">
                    {step.description}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Safety & consent */}
      <section className="bg-k-primary px-4 py-20 sm:px-6 sm:py-24 md:px-12 md:py-[120px]">
        <div className="mx-auto max-w-[1400px]">
          <Reveal direction="none">
            <SectionTag light>Safety &amp; consent</SectionTag>
            <h2 className="mb-4 font-serif text-[clamp(2rem,7vw,3.6rem)] font-light leading-[1.05] tracking-tight3 text-k-white">
              Your wellbeing
              <br />
              <em className="italic text-k-accent-light">always comes first</em>
            </h2>
            <p className="mb-16 max-w-[480px] text-sm font-light leading-7 text-white/60 sm:text-base">
              We have built consent and safeguarding into every step of the
              process. Being a Kosmè Beauty Client is transparent, respectful,
              and entirely in your hands.
            </p>
          </Reveal>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            {trustPoints.map((point, i) => (
              <Reveal key={point.title} delay={i * 0.1} direction="up">
                <div className="rounded-3xl border border-white/10 bg-white/5 p-8">
                  <CheckCircle
                    size={28}
                    className="mb-5 text-k-accent"
                    aria-hidden="true"
                  />
                  <h3 className="mb-3 font-serif text-xl font-light text-k-white">
                    {point.title}
                  </h3>
                  <p className="text-sm font-light leading-7 text-white/55">
                    {point.description}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Sign-up form */}
      <section
        id="signup"
        className="px-4 py-20 sm:px-6 sm:py-24 md:px-12 md:py-[120px]"
      >
        <div className="mx-auto max-w-2xl">
          <Reveal>
            <SectionTag>Join Kosmè</SectionTag>
            <h2 className="mb-4 font-serif text-[clamp(2rem,7vw,3.2rem)] font-light leading-[1.05] tracking-tight3 text-k-black">
              Become a{" "}
              <em className="italic text-k-primary">Kosmè Beauty Client</em>
            </h2>
            <p className="mb-12 text-sm font-light leading-7 text-k-gray-600 sm:text-base">
              Fill in the form below and we will reach out to confirm your first
              session.
            </p>
          </Reveal>

          {/* ── Success ── */}
          {step === "success" && (
            <motion.div
              className="rounded-3xl border border-k-gray-200 bg-k-white p-10 text-center"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease }}
            >
              <CheckCircle size={48} className="mx-auto mb-5 text-k-primary" />
              <p className="font-serif text-2xl font-light text-k-black">
                Thank you for signing up. You are now a Kosmè Beauty Client. We
                will have a seat for you.
              </p>
            </motion.div>
          )}

          {/* ── OTP verification ── */}
          {step === "verify" && (
            <motion.div
              className="rounded-3xl border border-k-gray-200 bg-k-white px-8 py-10"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease }}
            >
              <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-full bg-k-primary/10">
                <CheckCircle2 size={24} className="text-k-primary" />
              </div>
              <h3 className="mb-2 font-serif text-2xl font-light text-k-black">
                Check your email
              </h3>
              <p className="mb-8 text-sm font-light leading-7 text-k-gray-600">
                We sent a 6-digit code to <strong>{form.email}</strong>. Enter
                it below to confirm your account.
              </p>

              {error && (
                <p className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                  {error}
                </p>
              )}

              <form onSubmit={handleVerify} className="flex flex-col gap-4">
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="000000"
                  value={otpCode}
                  onChange={(e) =>
                    setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  className="w-full rounded-xl border border-k-gray-200 bg-k-white px-5 py-3.5 text-center text-lg tracking-[0.3em] text-k-black placeholder:text-k-gray-300 outline-none transition-all duration-200 focus:border-k-primary focus:ring-2 focus:ring-k-primary/20"
                />
                <button
                  type="submit"
                  disabled={submitting || otpCode.length < 6}
                  className="w-full rounded-full bg-k-primary px-8 py-4 text-sm font-medium tracking-wide text-k-white shadow-[0_4px_20px_rgba(59,10,42,0.25)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-k-primary-light disabled:opacity-60 disabled:cursor-not-allowed disabled:translate-y-0"
                >
                  {submitting ? "Verifying…" : "Verify & complete sign-up"}
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await signUp?.prepareEmailAddressVerification({
                      strategy: "email_code",
                    });
                  }}
                  className="text-center text-sm font-light text-k-gray-400 transition-colors hover:text-k-primary"
                >
                  Resend code
                </button>
              </form>
            </motion.div>
          )}

          {/* ── Main form ── */}
          {step === "form" && (
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Required by Clerk bot protection */}
              <div id="clerk-captcha" />

              {/* Full name */}
              <div>
                <label className="mb-2 block text-sm font-medium text-k-black">
                  Full name <span className="text-k-primary">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.full_name}
                  onChange={(e) =>
                    setForm({ ...form, full_name: e.target.value })
                  }
                  placeholder="Your full name"
                  className="w-full rounded-xl border border-k-gray-200 bg-k-white px-4 py-3 text-sm text-k-black placeholder:text-k-gray-400 focus:border-k-primary focus:outline-none focus:ring-2 focus:ring-k-primary/20"
                />
              </div>

              {/* Gender */}
              <div>
                <label className="mb-3 block text-sm font-medium text-k-black">
                  Gender <span className="text-k-primary">*</span>
                </label>
                <div className="flex gap-4">
                  {["male", "female"].map((g) => (
                    <label
                      key={g}
                      className="flex cursor-pointer items-center gap-2"
                    >
                      <input
                        type="radio"
                        name="gender"
                        value={g}
                        checked={form.gender === g}
                        onChange={() => setForm({ ...form, gender: g })}
                        className="accent-k-primary"
                        required
                      />
                      <span className="text-sm capitalize text-k-black">
                        {g === "male" ? "Male" : "Female"}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* WhatsApp */}
              <div>
                <label className="mb-2 block text-sm font-medium text-k-black">
                  WhatsApp number <span className="text-k-primary">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={form.whatsapp}
                  onChange={(e) =>
                    setForm({ ...form, whatsapp: e.target.value })
                  }
                  placeholder="+1 876 000 0000"
                  className="w-full rounded-xl border border-k-gray-200 bg-k-white px-4 py-3 text-sm text-k-black placeholder:text-k-gray-400 focus:border-k-primary focus:outline-none focus:ring-2 focus:ring-k-primary/20"
                />
              </div>

              {/* Email */}
              <div>
                <label className="mb-2 block text-sm font-medium text-k-black">
                  Email address <span className="text-k-primary">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="you@example.com"
                  className="w-full rounded-xl border border-k-gray-200 bg-k-white px-4 py-3 text-sm text-k-black placeholder:text-k-gray-400 focus:border-k-primary focus:outline-none focus:ring-2 focus:ring-k-primary/20"
                />
              </div>

              {/* Password */}
              <div>
                <label className="mb-2 block text-sm font-medium text-k-black">
                  Password <span className="text-k-primary">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete="new-password"
                    value={form.password}
                    onChange={(e) =>
                      setForm({ ...form, password: e.target.value })
                    }
                    placeholder="Min. 8 characters"
                    className="w-full rounded-xl border border-k-gray-200 bg-k-white px-4 py-3 pr-12 text-sm text-k-black placeholder:text-k-gray-400 focus:border-k-primary focus:outline-none focus:ring-2 focus:ring-k-primary/20"
                  />
                  <button
                    type="button"
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-k-gray-400 hover:text-k-black"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Confirm password */}
              <div>
                <label className="mb-2 block text-sm font-medium text-k-black">
                  Confirm password <span className="text-k-primary">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showConfirm ? "text" : "password"}
                    required
                    autoComplete="new-password"
                    value={form.confirmPassword}
                    onChange={(e) =>
                      setForm({ ...form, confirmPassword: e.target.value })
                    }
                    placeholder="Re-enter your password"
                    className="w-full rounded-xl border border-k-gray-200 bg-k-white px-4 py-3 pr-12 text-sm text-k-black placeholder:text-k-gray-400 focus:border-k-primary focus:outline-none focus:ring-2 focus:ring-k-primary/20"
                  />
                  <button
                    type="button"
                    aria-label={showConfirm ? "Hide password" : "Show password"}
                    onClick={() => setShowConfirm((v) => !v)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-k-gray-400 hover:text-k-black"
                  >
                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Parish */}
              <div>
                <label className="mb-2 block text-sm font-medium text-k-black">
                  Parish <span className="text-k-primary">*</span>
                </label>
                <select
                  required
                  value={form.parish}
                  onChange={(e) => setForm({ ...form, parish: e.target.value })}
                  className="w-full rounded-xl border border-k-gray-200 bg-k-white px-4 py-3 text-sm text-k-black focus:border-k-primary focus:outline-none focus:ring-2 focus:ring-k-primary/20"
                >
                  <option value="" disabled>
                    Select your parish
                  </option>
                  {PARISHES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              {/* Service preference */}
              <div>
                <label className="mb-3 block text-sm font-medium text-k-black">
                  Service preference <span className="text-k-primary">*</span>
                  <span className="ml-1 font-normal text-k-gray-400">
                    (select all that apply)
                  </span>
                </label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {[
                    { value: "hair", label: "Hair" },
                    { value: "makeup", label: "Makeup" },
                    { value: "nails", label: "Nails" },
                    { value: "brows", label: "Brows" },
                    { value: "barbering", label: "Barbering" },
                    { value: "skincare", label: "Skincare" },
                    { value: "open_to_any", label: "Open to any" },
                  ].map(({ value, label }) => (
                    <label
                      key={value}
                      className="flex cursor-pointer items-center gap-2 rounded-xl border border-k-gray-200 px-3 py-2.5 hover:border-k-primary/40"
                    >
                      <input
                        type="checkbox"
                        checked={form.service_preferences.includes(value)}
                        onChange={() =>
                          setForm({
                            ...form,
                            service_preferences: toggleArray(
                              form.service_preferences,
                              value,
                            ),
                          })
                        }
                        className="accent-k-primary"
                      />
                      <span className="text-sm text-k-black">{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Availability */}
              <div>
                <label className="mb-3 block text-sm font-medium text-k-black">
                  Availability <span className="text-k-primary">*</span>
                  <span className="ml-1 font-normal text-k-gray-400">
                    (select all that apply)
                  </span>
                </label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {[
                    { value: "weekday", label: "Weekday" },
                    { value: "saturday", label: "Saturday" },
                    { value: "sunday", label: "Sunday" },
                    { value: "flexible", label: "Flexible" },
                  ].map(({ value, label }) => (
                    <label
                      key={value}
                      className="flex cursor-pointer items-center gap-2 rounded-xl border border-k-gray-200 px-3 py-2.5 hover:border-k-primary/40"
                    >
                      <input
                        type="checkbox"
                        checked={form.availability.includes(value)}
                        onChange={() =>
                          setForm({
                            ...form,
                            availability: toggleArray(form.availability, value),
                          })
                        }
                        className="accent-k-primary"
                      />
                      <span className="text-sm text-k-black">{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Preferred time */}
              <div>
                <label className="mb-3 block text-sm font-medium text-k-black">
                  Preferred time <span className="text-k-primary">*</span>
                  <span className="ml-1 font-normal text-k-gray-400">
                    (select all that apply)
                  </span>
                </label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {[
                    { value: "morning", label: "Morning" },
                    { value: "afternoon", label: "Afternoon" },
                    { value: "evening", label: "Evening" },
                    { value: "flexible", label: "Flexible" },
                  ].map(({ value, label }) => (
                    <label
                      key={value}
                      className="flex cursor-pointer items-center gap-2 rounded-xl border border-k-gray-200 px-3 py-2.5 hover:border-k-primary/40"
                    >
                      <input
                        type="checkbox"
                        checked={form.preferred_time.includes(value)}
                        onChange={() =>
                          setForm({
                            ...form,
                            preferred_time: toggleArray(
                              form.preferred_time,
                              value,
                            ),
                          })
                        }
                        className="accent-k-primary"
                      />
                      <span className="text-sm text-k-black">{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Willing to travel */}
              <div>
                <label className="mb-3 block text-sm font-medium text-k-black">
                  Willing to travel to a session location?{" "}
                  <span className="text-k-primary">*</span>
                </label>
                <div className="flex gap-4">
                  {[
                    { value: "yes", label: "Yes" },
                    { value: "no", label: "No" },
                  ].map(({ value, label }) => (
                    <label
                      key={value}
                      className="flex cursor-pointer items-center gap-2"
                    >
                      <input
                        type="radio"
                        name="willing_to_travel"
                        value={value}
                        checked={form.willing_to_travel === value}
                        onChange={() =>
                          setForm({ ...form, willing_to_travel: value })
                        }
                        className="accent-k-primary"
                        required
                      />
                      <span className="text-sm text-k-black">{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Consent & acknowledgements */}
              <div className="space-y-4 rounded-2xl border border-k-gray-200 bg-k-gray-50 p-6">
                <label className="flex cursor-pointer gap-3">
                  <input
                    type="checkbox"
                    required
                    checked={form.photo_consent}
                    onChange={(e) =>
                      setForm({ ...form, photo_consent: e.target.checked })
                    }
                    className="mt-0.5 h-4 w-4 flex-shrink-0 accent-k-primary"
                  />
                  <span className="text-sm font-light leading-relaxed text-k-gray-600">
                    I consent to service photos and/or video being taken during
                    my session for student portfolio purposes.{" "}
                    <span className="text-k-primary">*</span>
                  </span>
                </label>

                <label className="flex cursor-pointer gap-3">
                  <input
                    type="checkbox"
                    required
                    checked={form.trainee_acknowledgement}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        trainee_acknowledgement: e.target.checked,
                      })
                    }
                    className="mt-0.5 h-4 w-4 flex-shrink-0 accent-k-primary"
                  />
                  <span className="text-sm font-light leading-relaxed text-k-gray-600">
                    I acknowledge that services may be performed by students or
                    trainees under qualified supervision.{" "}
                    <span className="text-k-primary">*</span>
                  </span>
                </label>
              </div>

              {error && (
                <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting || !isLoaded}
                className="w-full rounded-full bg-k-primary px-8 py-4 text-sm font-medium tracking-wide text-k-white shadow-[0_4px_20px_rgba(59,10,42,0.25)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-k-primary-light hover:shadow-[0_8px_32px_rgba(59,10,42,0.3)] disabled:opacity-60 disabled:cursor-not-allowed disabled:translate-y-0"
              >
                {submitting
                  ? "Creating account…"
                  : "Become a Kosmè Beauty Client"}
              </button>
            </form>
          )}
        </div>
      </section>

      <Footer />
    </>
  );
}
