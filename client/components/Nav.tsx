"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu, X, ChevronDown } from "lucide-react";

const roleLinks = [
  { href: "/students", label: "For Students" },
  { href: "/educators", label: "For Educators" },
  { href: "/clients", label: "For Volunteer Clients" },
  { href: "/employers", label: "For Employers" },
];

const mainLinks = [
  { href: "/#how", label: "How it works" },
  { href: "/#features", label: "Features" },
  { href: "/#proof", label: "Portfolio" },
];

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const [mobileRoleOpen, setMobileRoleOpen] = useState(false);
  const dropdownRef = useRef<HTMLLIElement>(null);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) setMobileOpen(false);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setRoleDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
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
          {mainLinks.map(({ href, label }) => (
            <li key={href}>
              <Link
                href={href}
                className="relative text-sm font-normal text-k-gray-600 tracking-wide no-underline
                           transition-colors duration-200 hover:text-k-black
                           after:content-[''] after:absolute after:bottom-[-2px] after:left-0 after:right-0
                           after:h-px after:bg-k-accent after:scale-x-0 after:transition-transform after:duration-300
                           hover:after:scale-x-100"
              >
                {label}
              </Link>
            </li>
          ))}

          {/* "For who" dropdown */}
          <li ref={dropdownRef} className="relative">
            <button
              type="button"
              onClick={() => setRoleDropdownOpen((o) => !o)}
              className="flex items-center gap-1 text-sm font-normal text-k-gray-600 tracking-wide
                         transition-colors duration-200 hover:text-k-black"
            >
              For who
              <ChevronDown
                size={14}
                className={`transition-transform duration-200 ${roleDropdownOpen ? "rotate-180" : ""}`}
              />
            </button>

            {roleDropdownOpen && (
              <div className="absolute left-1/2 top-full mt-3 w-52 -translate-x-1/2 rounded-2xl border border-k-gray-200 bg-k-white py-2 shadow-[0_8px_40px_rgba(0,0,0,0.10)]">
                {roleLinks.map(({ href, label }) => (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setRoleDropdownOpen(false)}
                    className="block px-5 py-2.5 text-sm text-k-gray-600 no-underline transition-colors duration-150
                               hover:bg-k-gray-100 hover:text-k-black"
                  >
                    {label}
                  </Link>
                ))}
              </div>
            )}
          </li>
        </ul>

        <div className="hidden items-center gap-4 md:flex">
          <Link
            href="/login"
            className="text-sm font-normal text-k-gray-600 tracking-wide no-underline transition-colors duration-200 hover:text-k-black"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="bg-k-primary text-k-white text-sm font-medium px-6 py-2.5 rounded-full tracking-wide
                       transition-all duration-200 hover:bg-k-primary-light hover:-translate-y-px no-underline"
          >
            Get started
          </Link>
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
          <div className="mx-auto flex max-w-[1400px] flex-col gap-1">
            {mainLinks.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                className="rounded-2xl px-4 py-3 text-sm font-medium text-k-gray-600 no-underline transition-colors duration-200 hover:bg-k-gray-100 hover:text-k-black"
              >
                {label}
              </Link>
            ))}

            <button
              type="button"
              onClick={() => setMobileRoleOpen((o) => !o)}
              className="flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-medium text-k-gray-600 transition-colors duration-200 hover:bg-k-gray-100 hover:text-k-black"
            >
              For who
              <ChevronDown
                size={14}
                className={`transition-transform duration-200 ${mobileRoleOpen ? "rotate-180" : ""}`}
              />
            </button>
            {mobileRoleOpen && (
              <div className="ml-4 flex flex-col gap-0.5 border-l border-k-gray-200 pl-3">
                {roleLinks.map(({ href, label }) => (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => { setMobileOpen(false); setMobileRoleOpen(false); }}
                    className="rounded-xl px-3 py-2.5 text-sm text-k-gray-600 no-underline transition-colors duration-200 hover:bg-k-gray-100 hover:text-k-black"
                  >
                    {label}
                  </Link>
                ))}
              </div>
            )}

            <div className="mt-2 flex flex-col gap-2 border-t border-k-gray-200 pt-3">
              <Link
                href="/login"
                onClick={() => setMobileOpen(false)}
                className="inline-flex items-center justify-center rounded-full border border-k-gray-200 px-6 py-3 text-sm font-medium text-k-black no-underline transition-all duration-200 hover:border-k-primary hover:text-k-primary"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                onClick={() => setMobileOpen(false)}
                className="inline-flex items-center justify-center rounded-full bg-k-primary px-6 py-3 text-sm font-medium tracking-wide text-k-white no-underline transition-all duration-200 hover:bg-k-primary-light"
              >
                Get started
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </nav>
  );
}
