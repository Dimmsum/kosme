"use client";

import { motion } from "framer-motion";
import { CheckCircle, ArrowRight } from "lucide-react";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import Reveal from "@/components/Reveal";
import SectionTag from "@/components/SectionTag";
import CtaSection from "@/components/CtaSection";

const ease = [0.22, 1, 0.36, 1] as const;

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

export default function ClientsPage() {
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
          {/* Decorative pattern */}
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.div
              className="flex flex-col gap-3 opacity-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.15 }}
              transition={{ duration: 1.2, delay: 0.5, ease }}
            >
              {[...Array(4)].map((_, row) => (
                <div key={row} className="flex gap-3">
                  {[...Array(4)].map((_, col) => (
                    <div
                      key={col}
                      className="h-10 w-10 rounded-full border border-white/40 sm:h-14 sm:w-14"
                    />
                  ))}
                </div>
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
              &ldquo;I got a free blowout and helped a student tick off a
              practical. It felt genuinely worthwhile.&rdquo;
            </p>
            <p className="mt-2 text-xs text-white/40 tracking-wide">
              — Chloe B., Volunteer Client
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
            <SectionTag>For Volunteer Clients</SectionTag>
          </motion.div>

          <motion.h1
            className="mb-6 font-serif text-[clamp(2.4rem,9vw,4.8rem)] font-light leading-[1.0] tracking-tight3 text-k-black sm:mb-7"
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.5, ease }}
          >
            Support student
            <br />
            success. Be part
            <br />
            of{" "}
            <em className="italic text-k-primary">something meaningful.</em>
          </motion.h1>

          <motion.p
            className="mb-9 max-w-[420px] text-sm font-light leading-7 text-k-gray-600 sm:mb-10 sm:text-base"
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.7, ease }}
          >
            Volunteer to participate in supervised practice sessions and help
            cosmetology students build real, verified experience — safely,
            ethically, and entirely on your terms.
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
              href="#how"
              className="inline-flex items-center justify-center gap-2 text-sm font-normal tracking-wide text-k-black no-underline transition-[gap] duration-200 hover:gap-3.5 sm:justify-start"
            >
              How it works <ArrowRight size={15} />
            </a>
          </motion.div>
        </div>
      </section>

      {/* Participation steps */}
      <section id="how" className="px-4 py-20 sm:px-6 sm:py-24 md:px-12 md:py-[120px]">
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
                  {/* Number */}
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

      {/* Safety & consent — dark section */}
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
              process. Volunteering with Kosmè is transparent, respectful, and
              entirely in your hands.
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

      <CtaSection />
      <Footer />
    </>
  );
}
