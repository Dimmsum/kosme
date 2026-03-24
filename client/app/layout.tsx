import type { Metadata } from "next";
import {
  Cormorant_Garamond,
  DM_Sans,
  DM_Serif_Display,
} from "next/font/google";
import { AuthProvider } from "@/lib/auth-context";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-dm-sans",
});

const dmSerif = DM_Serif_Display({
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
  variable: "--font-dm-serif",
});

export const metadata: Metadata = {
  title: "Kosmè — Verified Beauty Education",
  description:
    "Kosmè transforms student practice into verified evidence and professional portfolios through structured workflows involving students, educators, volunteer clients, and employers.",
  keywords: ["cosmetology", "hair education", "student portfolio", "beauty school"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${cormorant.variable} ${dmSans.variable} ${dmSerif.variable}`}>
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
