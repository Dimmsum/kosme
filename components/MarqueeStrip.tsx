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
    <div className="overflow-hidden border-t border-b border-k-gray-200 py-[18px] bg-k-white">
      <div className="flex gap-16 w-max animate-marquee">
        {doubled.map((item, i) => (
          <div
            key={i}
            className="flex items-center gap-4 whitespace-nowrap font-serif text-lg font-light text-k-gray-400 tracking-wide"
          >
            {item}
            <span className="text-k-accent text-2xl leading-none">✦</span>
          </div>
        ))}
      </div>
    </div>
  );
}
