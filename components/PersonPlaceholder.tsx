/**
 * PersonPlaceholder
 *
 * A transparent-background silhouette SVG used wherever a real photo will go.
 * Replace the parent <div> with a Next.js <Image> component when you have photos.
 *
 * Usage:
 *   <PersonPlaceholder size="lg" label="Replace with hero photo" />
 */

interface PersonPlaceholderProps {
  size?: "sm" | "md" | "lg";
  label?: string;
  className?: string;
}

const dims = { sm: 160, md: 240, lg: 360 };

export default function PersonPlaceholder({
  size = "md",
  label = "IMAGE PLACEHOLDER",
  className = "",
}: PersonPlaceholderProps) {
  const d = dims[size];
  const cx = d / 2;
  const headR = d * 0.18;
  const bodyY = cx + headR * 0.8;

  return (
    <svg
      viewBox={`0 0 ${d} ${d * 1.35}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label={label}
    >
      {/* Head */}
      <ellipse
        cx={cx}
        cy={cx * 0.52}
        rx={headR}
        ry={headR * 1.15}
        fill="rgba(200,169,110,0.22)"
        stroke="rgba(200,169,110,0.5)"
        strokeWidth="1.5"
      />
      {/* Hair */}
      <path
        d={`M${cx - headR * 1.0} ${cx * 0.52 - headR * 0.7}
            C${cx - headR * 1.1} ${cx * 0.52 - headR * 1.6}
             ${cx - headR * 0.2} ${cx * 0.52 - headR * 2.0}
             ${cx} ${cx * 0.52 - headR * 2.05}
            C${cx + headR * 0.2} ${cx * 0.52 - headR * 2.0}
             ${cx + headR * 1.1} ${cx * 0.52 - headR * 1.6}
             ${cx + headR * 1.0} ${cx * 0.52 - headR * 0.7}`}
        stroke="rgba(200,169,110,0.55)"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />
      {/* Body */}
      <path
        d={`M${cx - d * 0.36} ${d * 1.3}
            C${cx - d * 0.36} ${bodyY + d * 0.28}
             ${cx + d * 0.36} ${bodyY + d * 0.28}
             ${cx + d * 0.36} ${d * 1.3}`}
        fill="rgba(200,169,110,0.16)"
        stroke="rgba(200,169,110,0.38)"
        strokeWidth="1.5"
      />
      {/* Label */}
      <text
        x={cx}
        y={d * 1.22}
        textAnchor="middle"
        fill="rgba(200,169,110,0.35)"
        fontSize={d * 0.033}
        fontFamily="DM Sans, sans-serif"
        letterSpacing="2"
      >
        {label}
      </text>
    </svg>
  );
}
