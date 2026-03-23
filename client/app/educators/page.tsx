"use client";

import { motion } from "framer-motion";
import { CheckSquare, Lock, Clock, ArrowRight } from "lucide-react";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import Reveal from "@/components/Reveal";
import SectionTag from "@/components/SectionTag";
import CtaSection from "@/components/CtaSection";

const ease = [0.22, 1, 0.36, 1] as const;

const features = [
  {
    icon: CheckSquare,
    title: "No grading required",
    description:
      "Verification confirms competence, not grades. Your role is to approve or request revision — keeping the process simple and fast.",
  },
  {
    icon: Lock,
    title: "Locked verified records",
    description:
      "Once you approve a submission, the record is cryptographically locked. Immutable evidence your students can share with confidence.",
  },
  {
    icon: Clock,
    title: "Async verification queue",
    description:
      "Review submissions entirely on your own schedule. No synchronous sign-offs, no chasing paperwork — just a clean queue at your pace.",
  },
];

const pendingSubmissions = [
  {
    student: "Amara Osei",
    service: "Full Colour Application",
    date: "19 Mar 2025",
  },
  {
    student: "Jake Hendry",
    service: "Scalp Treatment & Massage",
    date: "21 Mar 2025",
  },
  {
    student: "Priya Sharma",
    service: "Blow-dry & Finish",
    date: "22 Mar 2025",
  },
];

export default function EducatorsPage() {
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
              className="grid grid-cols-2 gap-3 p-8"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 0.22, scale: 1 }}
              transition={{ duration: 1.2, delay: 0.5, ease }}
            >
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="h-20 w-20 rounded-2xl border border-white/30 sm:h-28 sm:w-28"
                />
              ))}
            </motion.div>
          </div>
          <motion.div
            className="absolute bottom-8 left-8 right-8 rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.9, ease }}
          >
            <p className="font-serif text-base italic text-white/80 leading-snug">
              &ldquo;I went from chasing paper sign-offs to approving verified
              records in seconds.&rdquo;
            </p>
            <p className="mt-2 text-xs text-white/40 tracking-wide">
              — Dr. Fiona Walsh, Senior Lecturer
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
            <SectionTag>For Educators</SectionTag>
          </motion.div>

          <motion.h1
            className="mb-6 font-serif text-[clamp(2.4rem,9vw,4.8rem)] font-light leading-[1.0] tracking-tight3 text-k-black sm:mb-7"
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.5, ease }}
          >
            Verify competence
            <br />
            without the{" "}
            <em className="italic text-k-primary">admin burden.</em>
          </motion.h1>

          <motion.p
            className="mb-9 max-w-[420px] text-sm font-light leading-7 text-k-gray-600 sm:mb-10 sm:text-base"
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.7, ease }}
          >
            Kosmè replaces paper-based sign-offs with a structured async
            verification workflow — so you can confirm student competence
            efficiently without disrupting your teaching schedule.
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
              href="#features"
              className="inline-flex items-center justify-center gap-2 text-sm font-normal tracking-wide text-k-black no-underline transition-[gap] duration-200 hover:gap-3.5 sm:justify-start"
            >
              See features <ArrowRight size={15} />
            </a>
          </motion.div>
        </div>
      </section>

      {/* Features grid */}
      <section id="features" className="px-4 py-20 sm:px-6 sm:py-24 md:px-12 md:py-[120px]">
        <div className="mx-auto max-w-[1400px]">
          <Reveal>
            <SectionTag>Built for educators</SectionTag>
            <h2 className="mb-4 font-serif text-[clamp(2rem,7vw,3.6rem)] font-light leading-[1.05] tracking-tight3 text-k-black">
              Less admin,
              <br />
              <em className="italic text-k-primary">more impact</em>
            </h2>
            <p className="mb-16 max-w-[480px] text-sm font-light leading-7 text-k-gray-600 sm:text-base">
              Kosmè handles the workflow so you can focus on what matters —
              guiding your students toward genuine professional competence.
            </p>
          </Reveal>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, i) => {
              const Icon = feature.icon;
              return (
                <Reveal key={feature.title} delay={i * 0.1} direction="up">
                  <div className="rounded-3xl border border-k-gray-200 bg-k-white p-8 transition-shadow duration-300 hover:shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
                    <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-k-primary/8">
                      <Icon size={22} className="text-k-primary" />
                    </div>
                    <h3 className="mb-3 font-serif text-xl font-light text-k-black">
                      {feature.title}
                    </h3>
                    <p className="text-sm font-light leading-7 text-k-gray-600">
                      {feature.description}
                    </p>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* Verification queue mockup */}
      <section className="bg-k-gray-100 px-4 py-20 sm:px-6 sm:py-24 md:px-12 md:py-[120px]">
        <div className="mx-auto max-w-[1400px]">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-20 lg:items-center">
            <Reveal direction="left">
              <SectionTag>Verification queue</SectionTag>
              <h2 className="mb-5 font-serif text-[clamp(1.9rem,6vw,3.4rem)] font-light leading-[1.05] tracking-tight3 text-k-black">
                A queue that
                <br />
                <em className="italic text-k-primary">works for you</em>
              </h2>
              <p className="max-w-[400px] text-sm font-light leading-7 text-k-gray-600 sm:text-base">
                Submissions land in your queue only after the client has already
                confirmed the session — so every record you review is already
                half-verified.
              </p>
            </Reveal>

            <Reveal direction="right" delay={0.1}>
              <div className="rounded-3xl border border-k-gray-200 bg-k-white p-6 shadow-[0_8px_40px_rgba(0,0,0,0.07)] sm:p-8">
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <h3 className="font-serif text-lg text-k-black">
                      Verification Queue
                    </h3>
                    <p className="mt-0.5 text-xs text-k-gray-400">
                      {pendingSubmissions.length} pending review
                    </p>
                  </div>
                  <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">
                    {pendingSubmissions.length} Pending
                  </span>
                </div>

                <div className="flex flex-col gap-4">
                  {pendingSubmissions.map((sub) => (
                    <div
                      key={sub.student}
                      className="rounded-2xl border border-k-gray-200 bg-k-gray-100 p-5"
                    >
                      <div className="mb-3 flex items-start justify-between">
                        <div>
                          <p className="text-sm font-medium text-k-black">
                            {sub.student}
                          </p>
                          <p className="mt-0.5 text-xs font-light text-k-gray-600">
                            {sub.service}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1.5">
                          <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-medium text-amber-700">
                            Pending Review
                          </span>
                          <span className="text-[11px] text-k-gray-400">
                            {sub.date}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className="flex-1 rounded-full bg-k-primary px-4 py-2 text-xs font-medium text-k-white transition-colors duration-200 hover:bg-k-primary-light"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          className="flex-1 rounded-full border border-k-gray-200 px-4 py-2 text-xs font-medium text-k-black transition-colors duration-200 hover:border-k-primary hover:text-k-primary"
                        >
                          Request revision
                        </button>
                      </div>
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
