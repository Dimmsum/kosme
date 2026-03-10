"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const links = [
  { href: "#how", label: "How it works" },
  { href: "#roles", label: "For who" },
  { href: "#features", label: "Features" },
  { href: "#proof", label: "Portfolio" },
];

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-12 py-5 transition-all duration-400 bg-k-white ${
        scrolled ? "border-b border-k-gray-200" : ""
      }`}
    >
      <Link
        href="/"
        className="font-serif text-2xl font-semibold tracking-tight2 text-k-black"
      >
        Kosm<span className="text-k-accent">è</span>
      </Link>

      <ul className="hidden md:flex items-center gap-9 list-none">
        {links.map(({ href, label }) => (
          <li key={href}>
            <a
              href={href}
              className="relative text-sm font-normal text-k-gray-600 tracking-wide no-underline
                         transition-colors duration-200 hover:text-k-black
                         after:content-[''] after:absolute after:bottom-[-2px] after:left-0 after:right-0
                         after:h-px after:bg-k-accent after:scale-x-0 after:transition-transform after:duration-300
                         hover:after:scale-x-100"
            >
              {label}
            </a>
          </li>
        ))}
      </ul>

      <a
        href="#cta"
        className="bg-k-primary text-k-white text-sm font-medium px-6 py-2.5 rounded-full tracking-wide
                   transition-all duration-200 hover:bg-k-primary-light hover:-translate-y-px no-underline"
      >
        Get started
      </a>
    </nav>
  );
}
