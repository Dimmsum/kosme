"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import Reveal from "@/components/Reveal";
import SectionTag from "@/components/SectionTag";
import CtaSection from "@/components/CtaSection";

const ease = [0.22, 1, 0.36, 1] as const;

const steps = [
  {
    number: "01",
    title: "Submit your service",
    description:
      "After completing a practical, upload the details and supporting photos directly in-app. Your record is created instantly.",
  },
  {
    number: "02",
    title: "Client confirms",
    description:
      "Your volunteer client receives a prompt to verify the session took place and that consent was maintained throughout.",
  },
  {
    number: "03",
    title: "Educator verifies",
    description:
      "Your lecturer reviews the record, approves competence, and locks it permanently — creating an immutable verified entry.",
  },
];

const mockServices = [
  { name: "Full Colour Application", status: "Verified", statusStyle: "bg-emerald-100 text-emerald-700" },
  { name: "Blow-dry & Style", status: "Awaiting Educator", statusStyle: "bg-blue-100 text-blue-700" },
  { name: "Scalp Treatment", status: "Awaiting Client", statusStyle: "bg-amber-100 text-amber-700" },
  { name: "Cut & Finish", status: "Verified", statusStyle: "bg-emerald-100 text-emerald-700" },
];

const progressRings = [
  { label: "Services", value: 12, max: 20, color: "#ee0384" },
  { label: "Verified", value: 8, max: 12, color: "#3B0A2A" },
  { label: "Pending", value: 2, max: 12, color: "#9B9690" },
];

function ProgressRing({
  value,
  max,
  color,
  label,
}: {
  value: number;
  max: number;
  color: string;
  label: string;
}) {
  const r = 28;
  const circ = 2 * Math.PI * r;
  const filled = (value / max) * circ;

  return (
    <div className="flex flex-col items-center gap-1.5">
      <svg width="72" height="72" className="-rotate-90">
        <circle cx="36" cy="36" r={r} fill="none" stroke="#E4E1DA" strokeWidth="5" />
        <circle
          cx="36"
          cy="36"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="5"
          strokeDasharray={`${filled} ${circ - filled}`}
          strokeLinecap="round"
        />
      </svg>
      <span className="font-serif text-xl text-k-black leading-none">{value}</span>
      <span className="text-[10px] font-medium uppercase tracking-[0.1em] text-k-gray-400">{label}</span>
    </div>
  );
}

export default function StudentsPage() {
  return (
    <>
      <Nav />

      {/* Hero — full-viewport split */}
      <section className="grid min-h-screen grid-cols-1 overflow-hidden md:grid-cols-2">
        {/* Right — gradient block (order-first on mobile) */}
        <motion.div
          className="relative order-first min-h-[360px] overflow-hidden sm:min-h-[440px] md:order-none md:min-h-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.2 }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-k-primary via-k-primary-light to-[#7A2058]" />
          {/* Decorative abstract shapes */}
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.div
              className="relative h-48 w-48 sm:h-64 sm:w-64 md:h-80 md:w-80"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 0.18, scale: 1 }}
              transition={{ duration: 1.2, delay: 0.5, ease }}
            >
              <div className="absolute inset-0 rounded-full border-2 border-k-accent-light" />
              <div className="absolute inset-8 rounded-full border border-k-accent-light/60" />
              <div className="absolute inset-16 rounded-full bg-k-accent/30" />
            </motion.div>
          </div>
          <motion.div
            className="absolute bottom-8 left-8 right-8 rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.9, ease }}
          >
            <p className="font-serif text-base italic text-white/80 leading-snug">
              &ldquo;My verified portfolio landed me my first salon role before I even graduated.&rdquo;
            </p>
            <p className="mt-2 text-xs text-white/40 tracking-wide">— Maya T., Level 3 Beauty Student</p>
          </motion.div>
        </motion.div>

        {/* Left — content */}
        <div className="relative z-10 flex flex-col justify-center px-4 pb-16 pt-10 sm:px-6 sm:pb-20 sm:pt-12 md:px-14 md:pb-20 md:pt-[120px]">
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.3, ease }}
          >
            <SectionTag>For Students</SectionTag>
          </motion.div>

          <motion.h1
            className="mb-6 font-serif text-[clamp(2.6rem,10vw,5rem)] font-light leading-[1.0] tracking-tight3 text-k-black sm:mb-7"
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.5, ease }}
          >
            Your practice,
            <br />
            verified. Your skills,{" "}
            <em className="italic text-k-primary">
              <span className="relative inline-block after:absolute after:bottom-1 after:left-0 after:right-0 after:h-0.5 after:bg-k-accent after:content-['']">
                showcased.
              </span>
            </em>
          </motion.h1>

          <motion.p
            className="mb-9 max-w-[420px] text-sm font-light leading-7 text-k-gray-600 sm:mb-10 sm:text-base"
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.7, ease }}
          >
            Build a verified portfolio of every practical you complete. Each
            service is confirmed by your client and approved by your educator —
            creating immutable proof of your growing expertise.
          </motion.p>

          <motion.div
            className="flex flex-col items-stretch gap-4 sm:flex-row sm:items-center"
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.9, ease }}
          >
            <a
              href="#cta"
              className="inline-flex items-center justify-center rounded-full bg-k-primary px-8 py-3.5 text-sm font-medium tracking-wide text-k-white no-underline shadow-[0_4px_20px_rgba(59,10,42,0.25)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-k-primary-light hover:shadow-[0_8px_32px_rgba(59,10,42,0.3)]"
            >
              Join waitlist
            </a>
            <a
              href="#journey"
              className="inline-flex items-center justify-center gap-2 text-sm font-normal tracking-wide text-k-black no-underline transition-[gap] duration-200 hover:gap-3.5 sm:justify-start"
            >
              See how it works <ArrowRight size={15} />
            </a>
          </motion.div>
        </div>
      </section>

      {/* Journey — 3-step flow */}
      <section id="journey" className="px-4 py-20 sm:px-6 sm:py-24 md:px-12 md:py-[120px]">
        <div className="mx-auto max-w-[1400px]">
          <Reveal>
            <SectionTag>How it works</SectionTag>
            <h2 className="mb-4 font-serif text-[clamp(2rem,7vw,3.6rem)] font-light leading-[1.05] tracking-tight3 text-k-black">
              Three steps to a
              <br />
              <em className="italic text-k-primary">verified record</em>
            </h2>
            <p className="mb-16 max-w-[480px] text-sm font-light leading-7 text-k-gray-600 sm:text-base">
              Every practical you complete follows the same structured workflow —
              transparent, fair, and backed by real evidence.
            </p>
          </Reveal>

          <div className="relative grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-0">
            {steps.map((step, i) => (
              <div key={step.number} className="relative flex md:contents">
                <Reveal delay={i * 0.12} direction="up">
                  <div className="relative flex-1 rounded-3xl border border-k-gray-200 bg-k-white p-8 md:mx-4 md:rounded-3xl">
                    <span className="mb-4 block font-serif text-4xl font-light text-k-accent leading-none">
                      {step.number}
                    </span>
                    <h3 className="mb-3 font-serif text-xl font-light text-k-black">
                      {step.title}
                    </h3>
                    <p className="text-sm font-light leading-7 text-k-gray-600">
                      {step.description}
                    </p>
                  </div>
                </Reveal>
                {/* Arrow connector — desktop only */}
                {i < steps.length - 1 && (
                  <div className="hidden md:flex items-center justify-center absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-10 w-8">
                    <ArrowRight size={18} className="text-k-gray-400" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Dashboard mockup */}
      <section className="bg-k-gray-100 px-4 py-20 sm:px-6 sm:py-24 md:px-12 md:py-[120px]">
        <div className="mx-auto max-w-[1400px]">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-20 lg:items-center">
            <Reveal direction="left">
              <SectionTag>Your dashboard</SectionTag>
              <h2 className="mb-5 font-serif text-[clamp(1.9rem,6vw,3.4rem)] font-light leading-[1.05] tracking-tight3 text-k-black">
                Everything in one
                <br />
                <em className="italic text-k-primary">place</em>
              </h2>
              <p className="max-w-[400px] text-sm font-light leading-7 text-k-gray-600 sm:text-base">
                Track every practical from submission to verification. See at a
                glance what&apos;s pending, what&apos;s approved, and how your
                portfolio is growing.
              </p>
            </Reveal>

            <Reveal direction="right" delay={0.1}>
              {/* Static app mockup card */}
              <div className="rounded-3xl border border-k-gray-200 bg-k-white p-6 shadow-[0_8px_40px_rgba(0,0,0,0.07)] sm:p-8">
                {/* Card header */}
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <h3 className="font-serif text-lg text-k-black">My Progress</h3>
                    <p className="text-xs text-k-gray-400 mt-0.5">Academic Year 2024–25</p>
                  </div>
                  <span className="rounded-full bg-k-primary/10 px-3 py-1 text-xs font-medium text-k-primary">
                    Level 3
                  </span>
                </div>

                {/* Progress rings */}
                <div className="mb-8 flex items-end justify-around border-b border-k-gray-200 pb-8">
                  {progressRings.map((ring) => (
                    <ProgressRing key={ring.label} {...ring} />
                  ))}
                </div>

                {/* Service list */}
                <div className="flex flex-col gap-3">
                  <p className="text-xs font-medium uppercase tracking-[0.1em] text-k-gray-400">
                    Recent Services
                  </p>
                  {mockServices.map((s) => (
                    <div
                      key={s.name}
                      className="flex items-center justify-between rounded-2xl bg-k-gray-100 px-4 py-3"
                    >
                      <span className="text-sm font-light text-k-black">{s.name}</span>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${s.statusStyle}`}
                      >
                        {s.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <CtaSection />
      <Footer />
    </>
  );
}
