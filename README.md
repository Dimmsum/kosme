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
