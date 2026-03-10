import Reveal from "./Reveal";
import SectionTag from "./SectionTag";
import PersonPlaceholder from "./PersonPlaceholder";

const features = [
  { icon: "✓",  text: "Every session verified by a qualified educator"   },
  { icon: "📸", text: "Before & after documentation for every treatment"  },
  { icon: "⭐", text: "Authentic client ratings and feedback"             },
  { icon: "🔗", text: "Shareable link for job applications and interviews" },
];

export default function ProofSection() {
  return (
    <section id="proof" className="py-[120px] px-12">
      <div className="max-w-[1400px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-20 items-center">

        {/* Left */}
        <Reveal direction="left">
          <SectionTag>Evidence &amp; Trust</SectionTag>
          <h2 className="font-serif text-[clamp(2.2rem,3.5vw,3.2rem)] font-light leading-[1.1] tracking-tight3 mb-6">
            A portfolio employers<br />
            can <em className="italic text-k-primary">actually trust</em>
          </h2>
          <p className="text-base text-k-gray-600 leading-[1.75] font-light mb-10 max-w-[480px]">
            Unlike a personal Instagram page or a printed certificate, a Kosmè portfolio is built
            on a chain of verified interactions — each session logged, educator-approved, and
            client-rated. It&apos;s the professional standard cosmetology education has been waiting for.
          </p>

          <div className="flex flex-col gap-4">
            {features.map(({ icon, text }) => (
              <div key={text} className="flex items-center gap-3.5 text-sm text-k-gray-600 font-light">
                <div className="w-9 h-9 min-w-[36px] rounded-lg bg-k-primary flex items-center justify-center text-base">
                  {icon}
                </div>
                {text}
              </div>
            ))}
          </div>
        </Reveal>

        {/* Right */}
        <Reveal direction="right" className="relative">
          <div className="aspect-square rounded-[32px] overflow-hidden bg-gradient-to-br from-k-primary to-[#0D2318] flex items-end justify-center">
            {/*
              Replace PersonPlaceholder with:
              <Image src="/proof-person.jpg" fill alt="Student portfolio example" className="object-cover object-top" />
            */}
            <div className="w-[65%] opacity-75">
              <PersonPlaceholder size="lg" label="Replace with photo" />
            </div>
          </div>

          {/* Overlay card — top right */}
          <div className="absolute top-8 -right-6 bg-k-white rounded-2xl px-6 py-5 shadow-[0_20px_60px_rgba(0,0,0,0.12)] min-w-[180px]">
            <p className="text-[0.7rem] uppercase tracking-[0.1em] text-k-gray-400 mb-2">Sessions Verified</p>
            <p className="font-serif text-3xl font-medium text-k-black">
              24<span className="text-k-accent">+</span>
            </p>
          </div>

          {/* Overlay card — bottom left */}
          <div className="absolute bottom-8 -left-6 bg-k-accent rounded-2xl px-6 py-5 shadow-[0_20px_60px_rgba(200,169,110,0.35)]">
            <p className="text-[0.7rem] uppercase tracking-[0.1em] text-black/50 mb-2">Portfolio Grade</p>
            <p className="font-serif text-2xl font-medium text-k-black">Distinction</p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
