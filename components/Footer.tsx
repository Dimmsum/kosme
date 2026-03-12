import { Twitter, Linkedin, Instagram } from "lucide-react";
import { type ReactNode } from "react";
import Image from "next/image";

const socialLinks: { icon: ReactNode; label: string }[] = [
  { icon: <Twitter size={16} />, label: "Twitter" },
  { icon: <Linkedin size={16} />, label: "LinkedIn" },
  { icon: <Instagram size={16} />, label: "Instagram" },
];

const footerLinks = {
  Platform: ["For Students", "For Educators", "For Employers", "For Clients"],
  Product: ["How it works", "Portfolio Builder", "Verification", "Pricing"],
  Company: ["About", "Blog", "Careers", "Contact"],
};

export default function Footer() {
  return (
    <footer className="bg-k-primary text-k-white px-12 pt-16 pb-10">
      <div className="max-w-[1400px] mx-auto">
        {/* Top */}
        <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_1fr] gap-16 pb-12 border-b border-white/10 mb-9">
          {/* Brand */}
          <div>
            <Image
              src="/Logo Text Only.png"
              alt="proKosmé"
              width={140}
              height={36}
              className="h-8 w-auto mb-4 brightness-0 invert"
            />
            <p className="text-sm text-white/50 leading-[1.65] max-w-[260px] font-light">
              Transforming cosmetology student practice into verified evidence
              and professional portfolios.
            </p>
          </div>

          {/* Link columns */}
          {Object.entries(footerLinks).map(([heading, links]) => (
            <div key={heading}>
              <h4 className="font-serif text-sm font-medium text-white/80 mb-5 tracking-wide">
                {heading}
              </h4>
              <ul className="flex flex-col gap-2.5 list-none">
                {links.map((link) => (
                  <li key={link}>
                    <a
                      href="#"
                      className="text-sm text-white/45 no-underline transition-colors duration-200 hover:text-k-accent"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-white/30">
            © 2025 Kosmè. All rights reserved.
          </p>
          <div className="flex gap-5">
            {socialLinks.map(({ icon, label }) => (
              <a
                key={label}
                href="#"
                aria-label={label}
                className="w-9 h-9 rounded-full border border-white/20 flex items-center justify-center
                           text-white/50 no-underline transition-all duration-200
                           hover:border-k-accent hover:text-k-accent"
              >
                {icon}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
