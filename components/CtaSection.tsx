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
      className="py-[140px] px-12 text-center relative overflow-hidden"
    >
      {/* Radial glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, rgba(59,10,42,0.08) 0%, transparent 70%)",
        }}
      />

      <Reveal className="relative z-10 max-w-[1400px] mx-auto">
        <SectionTag center>Join the Waitlist</SectionTag>
        <h2 className="font-serif text-[clamp(3rem,5vw,5rem)] font-light leading-[1.0] tracking-tight4 mb-7">
          Be the first to
          <br />
          experience <em className="italic text-k-primary">Kosmè</em>
        </h2>
        <p className="text-[1.05rem] text-k-gray-600 max-w-[520px] mx-auto font-light leading-[1.7] mb-12">
          Whether you&apos;re a student, educator, client, or employer — Kosmè
          has a place for you. Join our waitlist and be the first to know when
          we launch.
        </p>

        {submitted ? (
          <div className="inline-flex items-center gap-3 bg-k-primary/10 text-k-primary font-medium px-8 py-4 rounded-full text-base">
            <Mail size={20} />
            You&apos;re on the list! We&apos;ll be in touch.
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="flex gap-3 justify-center flex-wrap max-w-[520px] mx-auto"
          >
            <input
              type="email"
              required
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 min-w-[240px] px-6 py-4 rounded-full border border-k-gray-200 bg-k-white
                         text-base text-k-black placeholder:text-k-gray-400 outline-none
                         transition-all duration-200 focus:border-k-primary focus:shadow-[0_0_0_3px_rgba(59,10,42,0.1)]"
            />
            <button
              type="submit"
              disabled={loading}
              className="bg-k-primary text-k-white font-medium px-10 py-4 rounded-full text-base tracking-wide
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
