"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ClipboardList,
  Briefcase,
  Users,
  User,
  LogOut,
} from "lucide-react";
import { ROLE_DASHBOARD, useAuth } from "@/lib/auth-context";

const navItems = [
  { href: "/student/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/student/services", label: "Services", icon: ClipboardList },
  { href: "/student/portfolio", label: "Portfolio", icon: Briefcase },
  { href: "/student/volunteers", label: "Volunteers", icon: Users },
  { href: "/student/profile", label: "Profile", icon: User },
];

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, role, loading, signOut } = useAuth();
  const rolePending = !!user && role === null;
  const roleMismatch = !!user && !!role && role !== "student";

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
      return;
    }

    if (!loading && roleMismatch) {
      router.replace(ROLE_DASHBOARD[role]);
    }
  }, [user, role, roleMismatch, loading, router]);

  if (loading || !user || rolePending || roleMismatch) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-k-white">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-k-primary border-t-transparent" />
      </div>
    );
  }

  const initials = (user.user_metadata?.full_name as string | undefined)
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() ?? "ST";

  const displayName = (user.user_metadata?.full_name as string | undefined) ?? user.email ?? "Student";

  return (
    <div className="flex min-h-screen bg-k-gray-100">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-[240px] md:flex-col md:fixed md:inset-y-0 bg-k-white border-r border-k-gray-200">
        <div className="flex h-16 items-center px-6 border-b border-k-gray-200">
          <Link href="/" className="block">
            <Image
              src="/Logo Text Only.png"
              alt="Kosmè"
              width={120}
              height={32}
              className="h-7 w-auto"
              priority
            />
          </Link>
        </div>

        <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href !== "/student/dashboard" && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium no-underline transition-colors duration-150 ${
                  active
                    ? "bg-k-primary/10 text-k-primary"
                    : "text-k-gray-600 hover:bg-k-gray-100 hover:text-k-black"
                }`}
              >
                <Icon size={18} />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-k-gray-200 px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-k-primary/10 flex items-center justify-center">
              <span className="text-sm font-semibold text-k-primary">{initials}</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-k-black leading-tight">{displayName}</p>
              <p className="text-xs text-k-gray-400">Student</p>
            </div>
            <button
              onClick={signOut}
              aria-label="Sign out"
              className="shrink-0 text-k-gray-400 transition-colors duration-150 hover:text-k-primary"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 md:ml-[240px] pb-20 md:pb-0">
        {children}
      </main>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t border-k-gray-200 bg-k-white px-2 py-2 md:hidden">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== "/student/dashboard" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-0.5 rounded-xl px-3 py-1.5 no-underline transition-colors duration-150 ${
                active ? "text-k-primary" : "text-k-gray-400"
              }`}
            >
              <Icon size={20} />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
