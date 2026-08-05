# Kosmè — Next.js Landing Page

A production-ready Next.js 14 landing page for the Kosmè cosmetology education platform.

## Stack

- **Next.js 14** — App Router
- **TypeScript**
- **Tailwind CSS** — with custom brand tokens
- **Framer Motion** — scroll reveals, hero animations, parallax
- **Google Fonts (next/font)** — Cormorant Garamond, DM Sans, DM Serif Display

## Quick Start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
kosmee/
├── app/
│   ├── layout.tsx        # Root layout, font setup, metadata
│   ├── page.tsx          # Composes all section components
│   └── globals.css       # Brand tokens, Tailwind base, keyframes
├── components/
│   ├── Cursor.tsx         # Custom cursor (client component)
│   ├── Reveal.tsx         # Reusable scroll-reveal wrapper (Framer Motion)
│   ├── SectionTag.tsx     # Small uppercase label above headings
│   ├── PersonPlaceholder.tsx  # SVG silhouette — replace with next/image
│   ├── Nav.tsx
│   ├── Hero.tsx
│   ├── MarqueeStrip.tsx
│   ├── WhySection.tsx
│   ├── RolesSection.tsx
│   ├── HowItWorks.tsx
│   ├── ServicesSection.tsx
│   ├── ProofSection.tsx
│   ├── Testimonials.tsx
│   ├── CtaSection.tsx
│   └── Footer.tsx
├── hooks/
│   └── useReveal.ts       # Thin hook around Framer's useInView
└── public/               # Drop real images here
```

## Adding Real Photos

Every `<PersonPlaceholder />` includes a comment showing the exact `<Image>` replacement:

```tsx
// Replace this:
<PersonPlaceholder size="lg" label="Replace with photo" />

// With this (after adding the image to /public):
import Image from "next/image";
<Image src="/hero-person.png" fill alt="..." className="object-cover object-top" />
```

The parent container already has `position: relative` and `overflow: hidden` set.

## Brand Tokens

Defined in `tailwind.config.ts` and available as Tailwind classes:

| Token             | Value     | Class              |
|-------------------|-----------|--------------------|
| White             | `#FAFAF8` | `bg-k-white`       |
| Black             | `#111010` | `text-k-black`     |
| Primary           | `#1D3A2F` | `bg-k-primary`     |
| Primary Light     | `#2D5442` | `bg-k-primary-light` |
| Accent (gold)     | `#C8A96E` | `text-k-accent`    |
| Accent Light      | `#E5CFA0` | `bg-k-accent-light`|

## Customisation

- **Copy** — All text is hardcoded in each component for easy editing
- **Navigation links** — Edit the `links` array in `Nav.tsx`
- **Stats** — Edit the array in `Hero.tsx`
- **Role cards** — Edit the `roles` array in `RolesSection.tsx`
- **Testimonials** — Edit the `testimonials` array in `Testimonials.tsx`
# kosme

## Demo login

Anyone can browse the platform without an account via **/demo** — pick
Student, Educator, Volunteer Client, or Employer and you're dropped straight
into a live dashboard as a seeded demo account. There is no demo super admin;
demo accounts are ordinary roles only.

How it works:
- `POST /api/demo/login` issues a short-lived Clerk sign-in token for the
  seeded demo account of the requested role (`server/src/routes/demo.ts`).
  The client exchanges it via `signIn.create({ strategy: "ticket", ticket })`
  — no shared password is ever exposed.
- Demo data is isolated from real data with a `user_profiles.is_demo` /
  `services.is_demo` flag: demo accounts only ever see demo-flagged records
  (and real accounts never see demo ones), enforced in the relevant list
  endpoints (dashboard, verifications, portfolio browse/feed, service client
  picker).
- A persistent banner appears on every dashboard while signed in as a demo
  account, with one-click "switch role" and "exit demo" actions.

One-time setup (after running `supabase/migrations/0013_demo_accounts.sql`):

```bash
cd server
npm run seed:demo
```

This creates one real Clerk user per demo role (`demo-student@kosme.app`,
`demo-educator@kosme.app`, `demo-client@kosme.app`, `demo-employer@kosme.app`),
marks their `user_profiles` row `is_demo = true`, and records the mapping in
`public.demo_accounts`. Safe to re-run — it upserts rather than duplicating.

## Super Admin

The Super Admin dashboard lives at **/admin** (redirects to `/admin/dashboard`)
and is gated by the `super_admin` role — it is never reachable via the demo
login or self-service `/signup`. It's the only role that can eventually
manage institutions, programmes, cohorts, and platform-wide settings (Phase 2
of `docs/ROADMAP.md`); for now it shows live headline stats plus stub pages
for the modules still to be built.

One-time setup (after running `supabase/migrations/0014_admin_role.sql`):

```bash
cd server
SUPER_ADMIN_EMAIL=you@kosme.app SUPER_ADMIN_PASSWORD='a-strong-password-12+chars' \
SUPER_ADMIN_NAME="Your Name" npm run seed:super-admin
```

Then log in normally at `/login` with that email/password. Safe to re-run —
it upserts the role rather than duplicating the account, though it won't
change an existing account's password.
