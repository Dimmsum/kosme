# Kosmè Frontend Design Rules

Derived from the current codebase (`client/`). This is a description of the system
that already exists — follow it when adding or editing UI so new work is
indistinguishable from old work. If a rule here and the live code disagree,
the live code wins; update this file in the same PR.

Stack: Next.js 14 (App Router) + Tailwind CSS 3 + `lucide-react` icons +
`framer-motion`. No component library, no `cva`/`clsx`. Plain conditional
template strings are the existing convention — don't introduce a class-variance
library for one component.

---

## 1. Color

Only use the palette defined in `client/tailwind.config.ts`. Never use raw hex
values or arbitrary Tailwind grays/blacks (`gray-500`, `#111`, etc.) in new UI.

| Token | Hex | Use |
|---|---|---|
| `k-white` | `#FAFAF8` | Page/app background, card background |
| `k-black` | `#111010` | Primary text, headings |
| `k-primary` | `#3B0A2A` | Primary buttons, active states, brand accents |
| `k-primary-light` | `#551840` | Hover state for `k-primary` |
| `k-accent` | `#ee0384` | Small highlight accent (tags, underlines, links, "new/active" cues) — used sparingly, never as a large fill |
| `k-accent-light` | `#fc92ec` | Rare, decorative only |
| `k-gray-100` | `#F2F0EC` | Subtle section backgrounds, hover fill on neutral rows |
| `k-gray-200` | `#E4E1DA` | Borders, dividers |
| `k-gray-400` | `#9B9690` | Secondary/muted text, placeholder text, icon-on-empty-state |
| `k-gray-600` | `#5A5750` | Body copy on light backgrounds, nav link default state |

Rules:
- `k-primary` is the only color used for primary CTAs and active/selected UI. `k-accent` (hot pink) is a small-dose highlight, not a button-fill color.
- Tinted surfaces use the color at low opacity on `k-white`, e.g. `bg-k-accent/5`, `bg-k-accent/10`, `bg-k-primary/10`, `text-k-primary` on top — this is the pattern for icon chips and small badges (see `student/dashboard`).
- Status colors (verified / pending / warning / error) are the **one exception** to the k-palette rule: use standard Tailwind semantic colors at the `-50/100` (bg) and `-600/700` (text) steps — `emerald` (success/verified), `blue` (in progress), `amber` (awaiting/warning), `red` (rejected/error). Keep a single `STATUS_CONFIG`-style map per feature rather than inlining these ad hoc (see `app/student/dashboard/page.tsx`).
- Borders are always `border-k-gray-200`, never `border-gray-*` or black.

## 2. Typography

Three font families, loaded via `next/font/google` in `app/layout.tsx`:

- `font-serif` → Cormorant Garamond — used for large display headlines (hero H1, section headlines).
- `font-display` → DM Serif Display — heavier display serif; used more sparingly (defined but not the workhorse — prefer `font-serif` unless matching existing usage).
- Default `font-sans` (no class needed) → DM Sans — body copy, UI chrome, labels, nav, buttons, form fields.

Conventions actually in use:
- Headings (`h1`/`h2` section titles, dashboard card titles) are `font-serif font-light`, **not bold**. Weight comes from size and letter-spacing, not `font-bold`. Use `tracking-tight3` (`-0.03em`) or `tracking-tight4` on large serif headlines for the tightened editorial look.
- Big marketing headlines size with `clamp()`, e.g. `text-[clamp(2.75rem,13vw,5.5rem)]`, not fixed Tailwind steps — this is intentional for fluid hero type. In-app (dashboard/admin) headings use fixed steps instead: `text-3xl` (page title), `text-2xl`/`text-lg` (card/section title).
- Body/UI text sits in the `text-sm` (14px) range as the default for dashboards, forms, nav, and buttons. `text-xs` is for labels, meta text, badges, and eyebrow tags. Marketing copy paragraphs use `text-sm`–`text-base` with generous `leading-7`.
- Uppercase + wide tracking (`uppercase tracking-[0.08em]`–`tracking-[0.14em]`, `text-xs`/`text-[0.65rem]` font-medium) is the pattern for eyebrows, stat labels, and section tags (`SectionTag.tsx`) — never uppercase a full sentence or a button unless it's this micro-label style.
- Italic serif (`<em className="italic text-k-primary">`) is used to emphasize one phrase inside a headline, paired with the `after:` underline-accent trick for a single word (see `Hero.tsx`). This is a signature move — reuse it for headline emphasis rather than bold or color-only emphasis.

## 3. Spacing & Layout

- Tailwind's default spacing scale only — no custom spacing tokens exist, don't invent arbitrary pixel paddings unless matching an existing `clamp()`/fluid-type case.
- Marketing page container: `mx-auto w-full max-w-[1400px] px-4 sm:px-6 md:px-12`. Reuse this exact pattern for any new top-level marketing section.
- In-app (dashboard/admin) page padding: `px-4 py-6 sm:px-6 md:px-8 md:py-8`.
- Card/panel padding: `p-6 sm:p-8` for standalone cards, `px-6 py-4` for modal header/footer strips, `px-4 py-3.5` for compact list rows.
- Mobile-first breakpoints in order: base → `sm:` → `md:` → `lg:`. `md` (768px) is the primary mobile/desktop split for nav and hero layout; `lg` is used more narrowly (e.g. 4-column stat grids).
- Vertical rhythm between stacked sections/cards is `gap-3`–`gap-4` for tight lists, `mb-8` between major dashboard blocks.

## 4. Radius, Border & Shadow

Radius communicates hierarchy — bigger surface, bigger radius:

- `rounded-full` — buttons (all of them, primary and secondary), pills, badges, avatar/icon circles.
- `rounded-3xl` — top-level cards/panels and modals (the biggest content containers).
- `rounded-2xl` — nested content: list rows, dropdown menus, icon-chip containers, mobile nav items.
- `rounded-xl` — form inputs, small nested elements inside a `2xl`/`3xl` container.

Never use `rounded-md`, `rounded-lg`, or bare `rounded` — they don't appear anywhere in the system and will look inconsistent.

Borders: `border border-k-gray-200` is the default container border everywhere (cards, inputs, modals, dropdowns). Dashed variant (`border-dashed border-k-gray-200`) marks empty states specifically.

Shadows are soft, colored, and reserved for elevation on interactive/floating elements — never a plain gray box-shadow:
- Primary button elevation: `shadow-[0_4px_20px_rgba(59,10,42,0.25)]` (uses `k-primary` at low opacity), intensifying on hover.
- Dropdowns/modals: `shadow-[0_8px_40px_rgba(0,0,0,0.10–0.12)]`.
- Hovered cards: a subtle `shadow-[0_2px_12px_rgba(59,10,42,0.06)]` paired with a border-color shift to `border-k-primary/20`.
Flat cards at rest have **no shadow** — only borders. Add shadow on hover/elevation, not by default.

## 5. Buttons & Interactive States

- Primary button: `rounded-full bg-k-primary text-k-white`, `hover:bg-k-primary-light`, plus a small lift (`hover:-translate-y-0.5` or `-translate-y-px`) and shadow intensification. Text is `text-sm font-medium tracking-wide`.
- Secondary/outline button: `rounded-full border border-k-gray-200 bg-k-white text-k-gray-600` (or `text-k-black`), `hover:bg-k-gray-100` or `hover:border-k-primary hover:text-k-primary`.
- Text/link-style action: no border/fill, `text-k-black` or `text-k-primary`, underline or `gap` animation on hover (e.g. arrow that slides via `hover:gap-3.5`), never a plain browser-default underline at rest.
- Disabled state: `disabled:opacity-50`, no color change.
- All interactive elements get `transition-colors` / `transition-all duration-200` — state changes are always animated, never instant.
- Icons come exclusively from `lucide-react`, default `size={14–20}` depending on context (14–16 inline with text, 18–20 standalone/buttons). Don't mix in another icon set or inline SVGs for standard UI icons.

## 6. Motion

`framer-motion` is used for all non-trivial animation; CSS `@keyframes` in `globals.css` are reserved for continuous/ambient effects (marquee, float, pulse-ring), not one-shot entrances.

- Standard easing curve: `[0.22, 1, 0.36, 1]` (also stored as `--ease-out` in CSS). Use this cubic-bezier for every custom entrance/transition — don't default to `ease-in-out`.
- Standard entrance: fade + rise, `{ opacity: 0, y: 32–40 } → { opacity: 1, y: 0 }`, duration `0.75–1s`.
- Scroll-triggered reveals go through the shared `<Reveal>` component (`whileInView`, `viewport={{ once: true, margin: "-60px" }}`) — use it instead of hand-rolling `whileInView` props on new sections.
- Staggering hero/above-the-fold elements uses explicit incremental `delay` (0.2, 0.5, 0.7, 0.9, 1.1s) rather than `staggerChildren`, matching `Hero.tsx`.

## 7. Component Reuse

Before writing new markup, check these existing shared components/patterns and reuse them rather than re-implementing:

- `components/admin/FormControls.tsx` — `Field`, `TextInput`, `TextArea`, `Select`, `FormActions` for any admin form/modal.
- `components/admin/Modal.tsx` — centered dialog, closes on backdrop click / Escape.
- `components/admin/DataStates.tsx` — `LoadingCard`, `EmptyCard`, `ErrorBanner` for list/table loading, empty, and error states.
- `components/admin/AdminHeader.tsx` — page title/subtitle/action row for every admin module page.
- `components/admin/ConfirmDialog.tsx` — destructive-action confirmation.
- `components/SectionTag.tsx` — the small dash + uppercase eyebrow label above marketing section headings.
- `components/Reveal.tsx` — scroll-in animation wrapper.

If a new page needs one of these patterns (a form, a loading state, a page header), extend the shared component instead of copy-pasting its Tailwind classes inline.

## 8. Marketing vs. In-App Surfaces

Treat these as two related but distinct registers:

- **Marketing/public pages** (`/`, `/students`, `/educators`, `/clients`, `/employers`, `/login`, `/signup`): fluid `clamp()` type, heavy `framer-motion` entrance choreography, editorial serif headlines with italic emphasis, generous whitespace, max-width `1400px` shell.
- **In-app pages** (`/student/*`, `/educator/*`, `/employer/*`, `/volunteer/*`, `/admin/*`): denser, fixed type scale, `font-serif font-light` for card/page titles only (not every heading), minimal motion (state transitions, not scroll choreography), card-grid layouts with `k-white` panels on `k-gray-100`/`k-white` background.

Don't carry hero-style fluid type or heavy scroll animation into dashboard/admin screens, and don't carry dense admin table patterns into marketing pages.

## 9. Accessibility Baseline

- Every icon-only button has `aria-label` (see `Nav.tsx` mobile menu toggle, `Modal.tsx` close button).
- Interactive elements needing open/closed state expose `aria-expanded`.
- Maintain the existing focus style on inputs (`outline-none` paired with a visible `focus:border-k-primary` color change) — never remove focus indication without replacing it.
- Don't drop below `k-gray-400` on `k-white`/`k-gray-100` backgrounds for text that needs to be read, not just decorative.

## 10. What Not to Do

- Don't introduce a new color outside the palette in §1 (status colors excepted).
- Don't use `rounded-md`/`rounded-lg`/bare `rounded`.
- Don't use `font-bold` on headings — weight/emphasis comes from size, tracking, and the serif/sans pairing, not bold.
- Don't add plain gray/black box-shadows — shadows are soft and color-tinted.
- Don't hand-roll a new modal, form field set, or empty/loading state when one already exists in `components/admin/`.
- Don't mix icon libraries — `lucide-react` only.
- Don't use `ease-in-out`/linear easing for entrance animation — use the shared cubic-bezier.
