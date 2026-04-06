"use client";

import { useRef } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";

export default function Hero() {
  const heroImageRef = useRef<HTMLDivElement>(null);

  return (
    <section className="grid min-h-screen grid-cols-1 overflow-hidden md:grid-cols-2">
      {/* ── RIGHT ── */}
      <div className="relative order-first min-h-[380px] overflow-hidden bg-k-gray-100 sm:min-h-[460px] md:order-none md:min-h-0">
        {/* Gradient bg */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-br from-k-primary via-k-primary-light to-[#7A2058]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.2 }}
        />

        {/* Hero image */}
        <motion.div
          ref={heroImageRef}
          className="absolute inset-0"
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <Image
            src="/hero-person.jpg"
            alt="Cosmetology student styling hair in a salon"
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover object-center"
            priority
          />
        </motion.div>
      </div>

      {/* ── LEFT ── */}
      <div className="relative z-10 flex flex-col justify-center px-4 pb-16 pt-10 sm:px-6 sm:pb-20 sm:pt-12 md:px-12 md:pb-20 md:pt-36">
        {/* Tag */}

        {/* Headline */}
        <motion.h1
          className="mb-6 font-serif text-[clamp(2.75rem,13vw,5.5rem)] font-light leading-[0.98] tracking-tight3 text-k-black sm:mb-7"
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          Where student
          <br />
          practice becomes
          <br />
          <em className="italic text-k-primary">
            verified{" "}
            <span className="relative inline-block after:content-[''] after:absolute after:bottom-1 after:left-0 after:right-0 after:h-0.5 after:bg-k-accent">
              expertise
            </span>
          </em>
        </motion.h1>

        {/* Sub */}
        <motion.p
          className="mb-9 max-w-[420px] text-sm font-light leading-7 text-k-gray-600 sm:mb-12 sm:text-base"
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          Kosmè transforms cosmetology training into structured, evidence-backed
          portfolios — connecting students, educators, clients, and employers in
          one verified ecosystem.
        </motion.p>

        {/* Buttons */}
        <motion.div
          className="flex flex-col items-stretch gap-4 sm:flex-row sm:items-center"
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.9, ease: [0.22, 1, 0.36, 1] }}
        >
          <Link
            href="/signup"
            className="inline-flex items-center justify-center rounded-full bg-k-primary px-8 py-3.5 text-sm font-medium tracking-wide text-k-white no-underline
                       shadow-[0_4px_20px_rgba(59,10,42,0.25)] transition-all duration-200
                       hover:bg-k-primary-light hover:-translate-y-0.5 hover:shadow-[0_8px_32px_rgba(59,10,42,0.3)]"
          >
            Start for free
          </Link>
          <a
            href="#how"
            className="inline-flex items-center justify-center gap-2 text-sm font-normal tracking-wide text-k-black no-underline transition-[gap] duration-200 hover:gap-3.5 sm:justify-start"
          >
            See how it works <span className="text-base">→</span>
          </a>
        </motion.div>

        {/* Stats */}
        <motion.div
          className="mt-12 grid grid-cols-3 gap-4 border-t border-k-gray-200 pt-8 sm:mt-16 sm:gap-6 sm:pt-10 md:gap-10"
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 1.1, ease: [0.22, 1, 0.36, 1] }}
        >
          {[
            { num: "4+", label: "User Roles" },
            { num: "100%", label: "Verified Records" },
            { num: "1×", label: "Platform" },
          ].map(({ num, label }) => (
            <div key={label}>
              <span className="block font-serif text-[1.9rem] leading-none tracking-tight3 text-k-black sm:text-[2.2rem]">
                {num}
              </span>
              <span className="mt-1 block text-[0.65rem] font-normal uppercase tracking-[0.08em] text-k-gray-400 sm:text-xs">
                {label}
              </span>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
