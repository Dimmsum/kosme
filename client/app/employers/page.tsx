"use client";

import { motion } from "framer-motion";
import { CheckCircle, XCircle, ArrowRight } from "lucide-react";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import Reveal from "@/components/Reveal";
import SectionTag from "@/components/SectionTag";
import CtaSection from "@/components/CtaSection";

const ease = [0.22, 1, 0.36, 1] as const;

const accessItems = [
  "Verified services only",
  "Before/after evidence for every record",
  "Summary of skills performed",
  "Institution and course level",
];

const privateItems = [
  "Draft or unverified submissions",
  "Educator grades and assessments",
  "Client personal details and feedback",
  "Work awaiting verification",
];

const serviceTags = ["Hair Colour", "Cut & Style", "Blow-dry Finish"];

export default function EmployersPage() {
  return (
    <>
      <Nav />

      {/* Hero */}
      <section className="grid min-h-screen grid-cols-1 overflow-hidden md:grid-cols-2">
        {/* Right — gradient block */}
        <motion.div
          className="relative order-first min-h-[360px] overflow-hidden sm:min-h-[440px] md:order-none md:min-h-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.2 }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-k-primary via-k-primary-light to-[#7A2058]" />
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.div
              className="relative"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 0.2, y: 0 }}
              transition={{ duration: 1.2, delay: 0.5, ease }}
            >
              <div className="h-36 w-56 rounded-3xl border-2 border-white/40 sm:h-48 sm:w-72" />
              <div className="absolute -bottom-5 -right-5 h-24 w-36 rounded-2xl border border-white/20 sm:h-32 sm:w-48" />
              <div className="absolute -top-5 -left-5 h-20 w-32 rounded-2xl border border-white/20 sm:h-24 sm:w-40" />
            </motion.div>
          </div>
          <motion.div
            className="absolute bottom-8 left-8 right-8 rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.9, ease }}
          >
            <p className="font-serif text-base italic text-white/80 leading-snug">
              &ldquo;We hired two graduates based entirely on their Kosmè
              portfolios. The evidence spoke for itself.&rdquo;
            </p>
            <p className="mt-2 text-xs text-white/40 tracking-wide">
              — Salon Owner, London
            </p>
          </motion.div>
        </motion.div>

        {/* Left — content */}
        <div className="relative z-10 flex flex-col justify-center px-4 pb-16 pt-10 sm:px-6 sm:pb-20 sm:pt-12 md:px-14 md:pb-20 md:pt-[120px]">
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.3, ease }}
          >
            <SectionTag>For Employers</SectionTag>
          </motion.div>

          <motion.h1
            className="mb-6 font-serif text-[clamp(2.6rem,10vw,5rem)] font-light leading-[1.0] tracking-tight3 text-k-black sm:mb-7"
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.5, ease }}
          >
            Hire with{" "}
            <em className="italic text-k-primary">evidence.</em>
            <br />
            Not just a CV.
          </motion.h1>

          <motion.p
            className="mb-9 max-w-[420px] text-sm font-light leading-7 text-k-gray-600 sm:mb-10 sm:text-base"
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.7, ease }}
          >
            Browse verified student portfolios to find candidates whose
            competence is backed by real, educator-approved evidence — not just
            a claimed list of services on a CV.
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
              href="#portfolio"
              className="inline-flex items-center justify-center gap-2 text-sm font-normal tracking-wide text-k-black no-underline transition-[gap] duration-200 hover:gap-3.5 sm:justify-start"
            >
              See an example <ArrowRight size={15} />
            </a>
          </motion.div>
        </div>
      </section>

      {/* Portfolio preview mockup */}
      <section id="portfolio" className="bg-k-gray-100 px-4 py-20 sm:px-6 sm:py-24 md:px-12 md:py-[120px]">
        <div className="mx-auto max-w-[1400px]">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-20 lg:items-center">
            <Reveal direction="left">
              <SectionTag>What you see</SectionTag>
              <h2 className="mb-5 font-serif text-[clamp(1.9rem,6vw,3.4rem)] font-light leading-[1.05] tracking-tight3 text-k-black">
                Portfolios built
                <br />
                <em className="italic text-k-primary">on real evidence</em>
              </h2>
              <p className="max-w-[400px] text-sm font-light leading-7 text-k-gray-600 sm:text-base">
                Every entry in a student portfolio has been confirmed by a
                client and verified by an educator. What you see is what
                actually happened.
              </p>
            </Reveal>

            {/* Static portfolio card mockup */}
            <Reveal direction="right" delay={0.1}>
              <div className="rounded-3xl border border-k-gray-200 bg-k-white p-6 shadow-[0_8px_40px_rgba(0,0,0,0.07)] sm:p-8">
                {/* Student header */}
                <div className="mb-6 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-full bg-gradient-to-br from-k-primary to-k-primary-light" />
                    <div>
                      <p className="text-sm font-medium text-k-black">
                        Sophie Marchetti
                      </p>
                      <p className="text-xs text-k-gray-400">
                        London College of Beauty, Level 3
                      </p>
                    </div>
                  </div>
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
                    Verified
                  </span>
                </div>

                {/* Before / After placeholders */}
                <div className="mb-5 grid grid-cols-2 gap-3">
                  <div className="flex flex-col overflow-hidden rounded-2xl">
                    <div className="flex h-28 items-center justify-center bg-k-gray-200 sm:h-36">
                      <span className="text-xs font-medium uppercase tracking-[0.08em] text-k-gray-400">
                        Before
                      </span>
                    </div>
                    <span className="bg-k-gray-100 py-1.5 text-center text-[10px] font-medium uppercase tracking-[0.08em] text-k-gray-400">
                      Before
                    </span>
                  </div>
                  <div className="flex flex-col overflow-hidden rounded-2xl">
                    <div className="flex h-28 items-center justify-center bg-k-primary/10 sm:h-36">
                      <span className="text-xs font-medium uppercase tracking-[0.08em] text-k-primary/50">
                        After
                      </span>
                    </div>
                    <span className="bg-k-primary/5 py-1.5 text-center text-[10px] font-medium uppercase tracking-[0.08em] text-k-primary/50">
                      After
                    </span>
                  </div>
                </div>

                {/* Service tags */}
                <div className="mb-4 flex flex-wrap gap-2">
                  {serviceTags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-k-gray-200 bg-k-gray-100 px-3 py-1 text-xs font-medium text-k-gray-600"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Verified line */}
                <div className="flex items-center gap-2 border-t border-k-gray-200 pt-4">
                  <CheckCircle size={14} className="text-emerald-500" />
                  <span className="text-xs font-light text-k-gray-600">
                    Verified by Dr. Fiona Walsh · 19 Mar 2025
                  </span>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* What you see / What stays private */}
      <section className="px-4 py-20 sm:px-6 sm:py-24 md:px-12 md:py-[120px]">
        <div className="mx-auto max-w-[1400px]">
          <Reveal>
            <SectionTag center>Transparency</SectionTag>
            <h2 className="mb-4 text-center font-serif text-[clamp(2rem,7vw,3.6rem)] font-light leading-[1.05] tracking-tight3 text-k-black">
              Access with{" "}
              <em className="italic text-k-primary">integrity</em>
            </h2>
            <p className="mx-auto mb-16 max-w-[480px] text-center text-sm font-light leading-7 text-k-gray-600 sm:text-base">
              Kosmè gives you the evidence you need to make confident hiring
              decisions, while keeping students&apos; private data protected.
            </p>
          </Reveal>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {/* What you get */}
            <Reveal direction="left" delay={0.05}>
              <div className="h-full rounded-3xl bg-k-primary p-8 sm:p-10">
                <h3 className="mb-6 font-serif text-xl font-light text-k-white">
                  What you get access to
                </h3>
                <ul className="flex flex-col gap-4">
                  {accessItems.map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <CheckCircle
                        size={18}
                        className="mt-0.5 shrink-0 text-k-accent"
                        aria-hidden="true"
                      />
                      <span className="text-sm font-light leading-6 text-white/80">
                        {item}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>

            {/* What stays private */}
            <Reveal direction="right" delay={0.1}>
              <div className="h-full rounded-3xl bg-k-gray-100 p-8 sm:p-10">
                <h3 className="mb-6 font-serif text-xl font-light text-k-black">
                  What stays private
                </h3>
                <ul className="flex flex-col gap-4">
                  {privateItems.map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <XCircle
                        size={18}
                        className="mt-0.5 shrink-0 text-k-gray-400"
                        aria-hidden="true"
                      />
                      <span className="text-sm font-light leading-6 text-k-gray-600">
                        {item}
                      </span>
                    </li>
                  ))}
                </ul>
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
