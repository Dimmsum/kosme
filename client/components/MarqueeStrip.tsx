const items = [
  "Student Portfolios",
  "Verified Evidence",
  "Educator Tools",
  "Employer Access",
  "Hair Cosmetology",
  "Structured Workflows",
  "Client Connections",
  "Professional Growth",
];

export default function MarqueeStrip() {
  // Duplicate for seamless infinite loop
  const doubled = [...items, ...items];

  return (
    <div className="overflow-hidden border-b border-t border-k-gray-200 bg-k-white py-4 sm:py-[18px]">
      <div className="flex w-max gap-10 animate-marquee sm:gap-16">
        {doubled.map((item, i) => (
          <div
            key={i}
            className="flex items-center gap-3 whitespace-nowrap font-serif text-base font-light tracking-wide text-k-gray-400 sm:gap-4 sm:text-lg"
          >
            {item}
            <span className="text-xl leading-none text-k-accent sm:text-2xl">
              ✦
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
