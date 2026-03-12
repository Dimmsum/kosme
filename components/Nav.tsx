"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu, X } from "lucide-react";

const links = [
  { href: "#how", label: "How it works" },
  { href: "#roles", label: "For who" },
  { href: "#features", label: "Features" },
  { href: "#proof", label: "Portfolio" },
];

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setMobileOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 bg-k-white transition-all duration-400 ${
        scrolled || mobileOpen ? "border-b border-k-gray-200" : ""
      }`}
    >
      <div className="mx-auto flex w-full max-w-[1400px] items-center justify-between px-4 py-4 sm:px-6 md:px-12 md:py-5">
        <Link href="/" className="block">
          <Image
            src="/Logo Text Only.png"
            alt="proKosmé"
            width={140}
            height={36}
            className="h-7 w-auto sm:h-8"
            priority
          />
        </Link>

        <ul className="hidden list-none items-center gap-9 md:flex">
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

        <div className="hidden md:block">
          <a
            href="#cta"
            className="bg-k-primary text-k-white text-sm font-medium px-6 py-2.5 rounded-full tracking-wide
                       transition-all duration-200 hover:bg-k-primary-light hover:-translate-y-px no-underline"
          >
            Get started
          </a>
        </div>

        <button
          type="button"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((open) => !open)}
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-k-gray-200 text-k-black transition-colors duration-200 hover:border-k-primary hover:text-k-primary md:hidden"
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {mobileOpen ? (
        <div className="border-t border-k-gray-200 px-4 pb-5 pt-3 sm:px-6 md:hidden">
          <div className="mx-auto flex max-w-[1400px] flex-col gap-2">
            {links.map(({ href, label }) => (
              <a
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                className="rounded-2xl px-4 py-3 text-sm font-medium text-k-gray-600 no-underline transition-colors duration-200 hover:bg-k-gray-100 hover:text-k-black"
              >
                {label}
              </a>
            ))}
            <a
              href="#cta"
              onClick={() => setMobileOpen(false)}
              className="mt-2 inline-flex items-center justify-center rounded-full bg-k-primary px-6 py-3 text-sm font-medium tracking-wide text-k-white no-underline transition-all duration-200 hover:bg-k-primary-light"
            >
              Get started
            </a>
          </div>
        </div>
      ) : null}
    </nav>
  );
}
