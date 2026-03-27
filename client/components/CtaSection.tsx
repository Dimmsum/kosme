"use client";

import Link from "next/link";
import Reveal from "./Reveal";
import SectionTag from "./SectionTag";

export default function CtaSection() {
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
        <SectionTag center>Get Started</SectionTag>
        <h2 className="mb-6 font-serif text-[clamp(2.4rem,11vw,5rem)] font-light leading-[1.0] tracking-tight4 sm:mb-7">
          Be the first to
          <br />
          experience <em className="italic text-k-primary">Kosmè</em>
        </h2>
        <p className="mx-auto mb-10 max-w-[520px] text-sm font-light leading-[1.8] text-k-gray-600 sm:mb-12 sm:text-[1.05rem]">
          Whether you&apos;re a student, educator, client, or employer — Kosmè
          has a place for you. Create your account and get started today.
        </p>

        <Link
          href="/signup"
          className="inline-flex items-center justify-center rounded-full bg-k-primary px-10 py-4 text-base font-medium tracking-wide text-k-white no-underline
                     shadow-[0_4px_20px_rgba(59,10,42,0.25)] transition-all duration-200
                     hover:bg-k-primary-light hover:-translate-y-0.5 hover:shadow-[0_8px_32px_rgba(59,10,42,0.3)]"
        >
          Create your account
        </Link>
      </Reveal>
    </section>
  );
}
