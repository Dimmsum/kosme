interface SectionTagProps {
  children: string;
  light?: boolean;
  center?: boolean;
}

export default function SectionTag({ children, light, center }: SectionTagProps) {
  return (
    <div
      className={`flex items-center gap-2.5 text-xs font-medium tracking-[0.14em] uppercase mb-5 ${
        light ? "text-k-accent" : "text-k-accent"
      } ${center ? "justify-center" : ""}`}
    >
      <span className="block w-7 h-px bg-k-accent" />
      {children}
    </div>
  );
}
