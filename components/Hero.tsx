"use client";

import { useRef } from "react";
import { motion } from "framer-motion";
import Image from "next/image";

export default function Hero() {
  const heroImageRef = useRef<HTMLDivElement>(null);

  return (
    <section className="min-h-screen grid grid-cols-1 md:grid-cols-2 overflow-hidden">
      {/* ── LEFT ── */}
      <div className="flex flex-col justify-center px-12 pt-36 pb-20 relative z-10">
        {/* Tag */}

        {/* Headline */}
        <motion.h1
          className="font-serif text-[clamp(3.5rem,6vw,5.5rem)] font-light leading-[1.0] tracking-tight3 text-k-black mb-7"
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
          className="text-base leading-7 text-k-gray-600 max-w-[420px] mb-12 font-light"
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
          className="flex items-center gap-4"
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.9, ease: [0.22, 1, 0.36, 1] }}
        >
          <a
            href="#cta"
            className="bg-k-primary text-k-white text-sm font-medium px-8 py-3.5 rounded-full tracking-wide no-underline
                       shadow-[0_4px_20px_rgba(29,58,47,0.25)] transition-all duration-200
                       hover:bg-k-primary-light hover:-translate-y-0.5 hover:shadow-[0_8px_32px_rgba(29,58,47,0.3)]"
          >
            Start for free
          </a>
          <a
            href="#how"
            className="text-k-black text-sm font-normal tracking-wide no-underline inline-flex items-center gap-2 transition-[gap] duration-200 hover:gap-3.5"
          >
            See how it works <span className="text-base">→</span>
          </a>
        </motion.div>

        {/* Stats */}
        <motion.div
          className="flex gap-10 mt-16 pt-10 border-t border-k-gray-200"
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
              <span className="font-serif text-[2.2rem] font-medium text-k-black tracking-tight3 leading-none block">
                {num}
              </span>
              <span className="text-xs text-k-gray-400 uppercase tracking-[0.04em] font-normal mt-1 block">
                {label}
              </span>
            </div>
          ))}
        </motion.div>
      </div>

      {/* ── RIGHT ── */}
      <div className="relative overflow-hidden bg-k-gray-100 hidden md:block">
        {/* Gradient bg */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-br from-k-primary via-k-primary-light to-[#3D6B55]"
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
            className="object-cover"
            priority
          />
        </motion.div>
      </div>
    </section>
  );
}
