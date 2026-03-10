"use client";

import { useState } from "react";
import { Paintbrush, Scissors, Sparkles, GraduationCap, ClipboardList } from "lucide-react";
import Reveal from "./Reveal";
import SectionTag from "./SectionTag";
import PersonPlaceholder from "./PersonPlaceholder";

const tabs = ["Students", "Educators", "Employers"];

const services = [
  { id: "colour",    title: "Hair Colour & Highlights", desc: "Full-spectrum colour work tracked and verified",   gradient: "from-[#C8A96E22] to-k-primary",        large: true },
  { id: "cuts",      title: "Cuts & Styling",           desc: "Precision cuts and creative styles on real clients", gradient: "from-k-primary-light to-k-primary",    large: false },
  { id: "scalp",     title: "Scalp & Hair Treatments",  desc: "Restorative care documented from prep to aftercare", gradient: "from-[#C8A96E33] to-[#3D6B55]",       large: false },
  { id: "verify",    title: "Educator Verification",    desc: "In-platform sign-off that creates genuine credentials", gradient: "from-k-primary to-k-primary-light", large: false },
  { id: "portfolio", title: "Portfolio Builder",        desc: "Auto-assembled from sessions, employer-shareable", gradient: "from-[#3D6B55] to-[#C8A96E44]",         large: false },
];

const personServices = new Set(["colour", "cuts", "scalp"]);

export default function ServicesSection() {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <section id="features" className="py-[120px] px-12 bg-k-gray-100">
      <div className="max-w-[1400px] mx-auto">
        {/* Header */}
        <Reveal className="flex flex-col md:flex-row md:items-end md:justify-between gap-8 mb-14">
          <div>
            <SectionTag>Platform Features</SectionTag>
            <h2 className="font-serif text-[clamp(2.5rem,4vw,3.5rem)] font-light tracking-tight3 leading-[1.1]">
              Everything hair,<br />
              <em className="italic text-k-primary">all in one place</em>
            </h2>
          </div>

          {/* Tab toggle */}
          <div className="flex gap-1 bg-k-white rounded-full p-1 self-start md:self-auto">
            {tabs.map((tab, i) => (
              <button
                key={tab}
                onClick={() => setActiveTab(i)}
                className={`px-5 py-2 rounded-full text-sm font-normal transition-all duration-200 ${
                  activeTab === i
                    ? "bg-k-primary text-k-white"
                    : "text-k-gray-400 hover:text-k-black"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </Reveal>

        {/* Grid */}
        <div className="grid grid-cols-3 gap-4" style={{ gridTemplateRows: "auto" }}>
          {services.map(({ id, title, desc, gradient, large }, i) => (
            <Reveal
              key={id}
              delay={i * 0.08}
              className={large ? "row-span-2" : ""}
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
                    {id === "colour" ? <Paintbrush size={64} /> : id === "cuts" ? <Scissors size={64} /> : id === "scalp" ? <Sparkles size={64} /> : id === "verify" ? <GraduationCap size={64} /> : <ClipboardList size={64} />}
                  </span>

                  {/* Person placeholder for service cards */}
                  {personServices.has(id) && (
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[55%] max-w-[200px] opacity-70">
                      {/* Replace with: <Image src={`/service-${id}.jpg`} fill alt={title} className="object-cover" /> */}
                      <PersonPlaceholder size="sm" label="" />
                    </div>
                  )}
                </div>

                {/* Body */}
                <div className="px-6 py-5 relative">
                  <h3 className="font-serif text-lg font-medium mb-1.5">{title}</h3>
                  <p className="text-xs text-k-gray-600 font-light">{desc}</p>
                </div>

                {/* Arrow button — appears on hover */}
                <div
                  className="absolute bottom-5 right-5 w-9 h-9 rounded-full bg-k-primary flex items-center justify-center
                             text-k-white opacity-0 translate-y-1 transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0"
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
