"use client";

import {
  Paintbrush,
  Scissors,
  Sparkles,
  GraduationCap,
  ClipboardList,
} from "lucide-react";
import Image from "next/image";
import Reveal from "./Reveal";
import SectionTag from "./SectionTag";

const services = [
  {
    id: "colour",
    title: "Hair Colour & Highlights",
    desc: "Full-spectrum colour work tracked and verified",
    gradient: "from-[#ee038422] to-k-primary",
    large: true,
  },
  {
    id: "cuts",
    title: "Cuts & Styling",
    desc: "Precision cuts and creative styles on real clients",
    gradient: "from-k-primary-light to-k-primary",
    large: false,
  },
  {
    id: "scalp",
    title: "Scalp & Hair Treatments",
    desc: "Restorative care documented from prep to aftercare",
    gradient: "from-[#ee038433] to-[#7A2058]",
    large: false,
  },
  {
    id: "verify",
    title: "Educator Verification",
    desc: "In-platform sign-off that creates genuine credentials",
    gradient: "from-k-primary to-k-primary-light",
    large: false,
  },
  {
    id: "portfolio",
    title: "Portfolio Builder",
    desc: "Auto-assembled from sessions, employer-shareable",
    gradient: "from-[#7A2058] to-[#ee038444]",
    large: false,
  },
];

export default function ServicesSection() {
  return (
    <section
      id="features"
      className="bg-k-gray-100 px-4 py-20 sm:px-6 sm:py-24 md:px-12 md:py-[120px]"
    >
      <div className="max-w-[1400px] mx-auto">
        {/* Header */}
        <Reveal className="mb-12 flex flex-col gap-6 md:mb-14 md:flex-row md:items-end md:justify-between md:gap-8">
          <div>
            <SectionTag>Platform Features</SectionTag>
            <h2 className="font-serif text-[clamp(2.3rem,10vw,3.5rem)] font-light leading-[1.05] tracking-tight3">
              Everything hair,
              <br />
              <em className="italic text-k-primary">all in one place</em>
            </h2>
          </div>

        </Reveal>

        {/* Grid */}
        <div
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
          style={{ gridTemplateRows: "auto" }}
        >
          {services.map(({ id, title, desc, gradient, large }, i) => (
            <Reveal
              key={id}
              delay={i * 0.08}
              className={large ? "lg:row-span-2" : ""}
            >
              <div
                className="group relative bg-k-white rounded-2xl overflow-hidden
                           transition-transform duration-300 hover:scale-[1.02] h-full"
              >
                {/* Image area */}
                <div
                  className={`relative overflow-hidden bg-gradient-to-br ${gradient} ${
                    large ? "aspect-[3/4]" : "aspect-[16/9]"
                  } flex items-center justify-center`}
                >
                  <span className="opacity-15 select-none">
                    {id === "colour" ? (
                      <Paintbrush size={64} />
                    ) : id === "cuts" ? (
                      <Scissors size={64} />
                    ) : id === "scalp" ? (
                      <Sparkles size={64} />
                    ) : id === "verify" ? (
                      <GraduationCap size={64} />
                    ) : (
                      <ClipboardList size={64} />
                    )}
                  </span>

                  {/* Service image */}
                  <Image
                    src={`/service-${id}.jpg`}
                    alt={title}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover object-center opacity-60 group-hover:opacity-80 transition-opacity duration-300"
                  />
                </div>

                {/* Body */}
                <div className="relative px-5 py-5 sm:px-6">
                  <h3 className="font-serif text-lg font-medium mb-1.5">
                    {title}
                  </h3>
                  <p className="text-xs text-k-gray-600 font-light">{desc}</p>
                </div>

                {/* Arrow button — appears on hover */}
                <div
                  className="absolute bottom-5 right-5 flex h-9 w-9 items-center justify-center rounded-full bg-k-primary
                             text-k-white opacity-100 transition-all duration-300 sm:translate-y-1 sm:opacity-0 sm:group-hover:translate-y-0 sm:group-hover:opacity-100"
                >
                  →
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
