import { CheckCircle, Camera, Star, Link } from "lucide-react";
import Image from "next/image";
import Reveal from "./Reveal";
import SectionTag from "./SectionTag";
import { type ReactNode } from "react";

const features: { icon: ReactNode; text: string }[] = [
  {
    icon: <CheckCircle size={18} />,
    text: "Every session verified by a qualified educator",
  },
  {
    icon: <Camera size={18} />,
    text: "Before & after documentation for every treatment",
  },
  { icon: <Star size={18} />, text: "Authentic client ratings and feedback" },
  {
    icon: <Link size={18} />,
    text: "Shareable link for job applications and interviews",
  },
];

export default function ProofSection() {
  return (
    <section
      id="proof"
      className="px-4 py-20 sm:px-6 sm:py-24 md:px-12 md:py-[120px]"
    >
      <div className="mx-auto grid max-w-[1400px] grid-cols-1 items-center gap-12 md:grid-cols-2 md:gap-20">
        {/* Left */}
        <Reveal direction="left">
          <SectionTag>Evidence &amp; Trust</SectionTag>
          <h2 className="mb-6 font-serif text-[clamp(2.1rem,9vw,3.2rem)] font-light leading-[1.05] tracking-tight3">
            A portfolio employers
            <br />
            can <em className="italic text-k-primary">actually trust</em>
          </h2>
          <p className="mb-8 max-w-[480px] text-sm font-light leading-[1.8] text-k-gray-600 sm:mb-10 sm:text-base">
            Unlike a personal Instagram page or a printed certificate, a Kosmè
            portfolio is built on a chain of verified interactions — each
            session logged, educator-approved, and client-rated. It&apos;s the
            professional standard cosmetology education has been waiting for.
          </p>

          <div className="flex flex-col gap-4">
            {features.map(({ icon, text }) => (
              <div
                key={text}
                className="flex items-center gap-3.5 text-sm text-k-gray-600 font-light"
              >
                <div className="w-9 h-9 min-w-[36px] rounded-lg bg-k-primary flex items-center justify-center text-k-white">
                  {icon}
                </div>
                {text}
              </div>
            ))}
          </div>
        </Reveal>

        {/* Right */}
        <Reveal direction="right" className="relative">
          <div className="relative aspect-square overflow-hidden rounded-[24px] bg-gradient-to-br from-k-primary to-[#200818] sm:rounded-[32px]">
            <Image
              src="/proof-person.jpg"
              alt="Student portfolio example"
              fill
              className="object-cover object-top"
            />
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 md:hidden">
            <div className="rounded-2xl bg-k-white px-5 py-4 shadow-[0_20px_60px_rgba(0,0,0,0.08)]">
              <p className="mb-2 text-[0.7rem] uppercase tracking-[0.1em] text-k-gray-400">
                Sessions Verified
              </p>
              <p className="font-serif text-3xl font-medium text-k-black">
                24<span className="text-k-accent">+</span>
              </p>
            </div>
            <div className="rounded-2xl bg-k-accent px-5 py-4 shadow-[0_20px_60px_rgba(238,3,132,0.24)]">
              <p className="mb-2 text-[0.7rem] uppercase tracking-[0.1em] text-black/50">
                Portfolio Grade
              </p>
              <p className="font-serif text-2xl font-medium text-k-black">
                Distinction
              </p>
            </div>
          </div>

          {/* Overlay card — top right */}
          <div className="absolute top-8 -right-6 hidden min-w-[180px] rounded-2xl bg-k-white px-6 py-5 shadow-[0_20px_60px_rgba(0,0,0,0.12)] md:block">
            <p className="text-[0.7rem] uppercase tracking-[0.1em] text-k-gray-400 mb-2">
              Sessions Verified
            </p>
            <p className="font-serif text-3xl font-medium text-k-black">
              24<span className="text-k-accent">+</span>
            </p>
          </div>

          {/* Overlay card — bottom left */}
          <div className="absolute bottom-8 -left-6 hidden rounded-2xl bg-k-accent px-6 py-5 shadow-[0_20px_60px_rgba(238,3,132,0.35)] md:block">
            <p className="text-[0.7rem] uppercase tracking-[0.1em] text-black/50 mb-2">
              Portfolio Grade
            </p>
            <p className="font-serif text-2xl font-medium text-k-black">
              Distinction
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
