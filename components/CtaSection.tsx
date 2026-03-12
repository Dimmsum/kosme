"use client";

import { useState, type FormEvent } from "react";
import { Mail } from "lucide-react";
import Reveal from "./Reveal";
import SectionTag from "./SectionTag";

export default function CtaSection() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);

    // Send waitlist email — replace this URL with your API endpoint
    try {
      await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
    } catch {
      // Even if the API isn't set up yet, show success for now
    }

    setLoading(false);
    setSubmitted(true);
    setEmail("");
  };

  return (
    <section
      id="cta"
      className="relative overflow-hidden px-4 py-20 text-center sm:px-6 sm:py-24 md:px-12 md:py-[140px]"
    >
      {/* Radial glow */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full sm:h-[520px] sm:w-[520px] md:h-[600px] md:w-[600px]"
        style={{
          background:
            "radial-gradient(circle, rgba(59,10,42,0.08) 0%, transparent 70%)",
        }}
      />

      <Reveal className="relative z-10 max-w-[1400px] mx-auto">
        <SectionTag center>Join the Waitlist</SectionTag>
        <h2 className="mb-6 font-serif text-[clamp(2.4rem,11vw,5rem)] font-light leading-[1.0] tracking-tight4 sm:mb-7">
          Be the first to
          <br />
          experience <em className="italic text-k-primary">Kosmè</em>
        </h2>
        <p className="mx-auto mb-10 max-w-[520px] text-sm font-light leading-[1.8] text-k-gray-600 sm:mb-12 sm:text-[1.05rem]">
          Whether you&apos;re a student, educator, client, or employer — Kosmè
          has a place for you. Join our waitlist and be the first to know when
          we launch.
        </p>

        {submitted ? (
          <div className="inline-flex max-w-full items-center gap-3 rounded-full bg-k-primary/10 px-5 py-4 text-sm font-medium text-k-primary sm:px-8 sm:text-base">
            <Mail size={20} />
            You&apos;re on the list! We&apos;ll be in touch.
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="mx-auto flex max-w-[520px] flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center"
          >
            <input
              type="email"
              required
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full flex-1 min-w-[240px] rounded-full border border-k-gray-200 bg-k-white px-6 py-4
                         text-base text-k-black placeholder:text-k-gray-400 outline-none
                         transition-all duration-200 focus:border-k-primary focus:shadow-[0_0_0_3px_rgba(59,10,42,0.1)]"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-k-primary px-10 py-4 text-base font-medium tracking-wide text-k-white sm:w-auto
                         shadow-[0_4px_20px_rgba(59,10,42,0.25)] transition-all duration-200
                         hover:bg-k-primary-light hover:-translate-y-0.5 hover:shadow-[0_8px_32px_rgba(59,10,42,0.3)]
                         disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? "Joining..." : "Join Waitlist"}
            </button>
          </form>
        )}

        <p className="text-xs text-k-gray-400 mt-5 font-light">
          No spam, ever. We&apos;ll only email you when Kosmè is ready.
        </p>
      </Reveal>
    </section>
  );
}
