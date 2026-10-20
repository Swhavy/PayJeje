---
name: Obsidian Ember & Emerald
colors:
  surface: '#111317'
  surface-dim: '#111317'
  surface-bright: '#37393e'
  surface-container-lowest: '#0c0e12'
  surface-container-low: '#1a1c20'
  surface-container: '#1e2024'
  surface-container-high: '#282a2e'
  surface-container-highest: '#333539'
  on-surface: '#e2e2e8'
  on-surface-variant: '#e2bfb0'
  inverse-surface: '#e2e2e8'
  inverse-on-surface: '#2f3035'
  outline: '#a98a7d'
  outline-variant: '#5a4136'
  surface-tint: '#ffb693'
  primary: '#ffb693'
  on-primary: '#561f00'
  primary-container: '#ff6b00'
  on-primary-container: '#572000'
  inverse-primary: '#a04100'
  secondary: '#44e092'
  on-secondary: '#00391f'
  secondary-container: '#03c177'
  on-secondary-container: '#004729'
  tertiary: '#ffb77a'
  on-tertiary: '#4c2700'
  tertiary-container: '#dd8328'
  on-tertiary-container: '#4d2700'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffdbcc'
  primary-fixed-dim: '#ffb693'
  on-primary-fixed: '#351000'
  on-primary-fixed-variant: '#7a3000'
  secondary-fixed: '#66fdac'
  secondary-fixed-dim: '#44e092'
  on-secondary-fixed: '#002110'
  on-secondary-fixed-variant: '#00522f'
  tertiary-fixed: '#ffdcc2'
  tertiary-fixed-dim: '#ffb77a'
  on-tertiary-fixed: '#2e1500'
  on-tertiary-fixed-variant: '#6d3a00'
  background: '#111317'
  on-background: '#e2e2e8'
  surface-variant: '#333539'
typography:
  display-hero:
    fontFamily: Plus Jakarta Sans
    fontSize: 40px
    fontWeight: '800'
    lineHeight: 48px
    letterSpacing: -0.03em
  display-hero-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '800'
    lineHeight: 34px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 38px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 30px
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '700'
    lineHeight: 26px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  title-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 22px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  label-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 18px
    letterSpacing: 0.01em
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 14px
    letterSpacing: 0.04em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-desktop: 1.5rem
  margin: 1rem
  margin-tablet: 1.5rem
  margin-desktop: 2.5rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

## Brand & Style

This design system defines a high-energy, dark-first culinary rewards and fintech coupon ecosystem. It bridges financial utility with immediate gastronomic gratification, targeting tech-savvy urban consumers, remote professionals, and campus earners who redeem everyday transaction points for dining and food delivery.

The visual style unites **High-Contrast Dark Minimalism** and **Tactile Glassmorphism**:
- Deep, velvety midnight surfaces anchor the interface to instill financial trust and reduce ocular fatigue.
- Fiery solar amber and vivid electric orange communicate appetite, immediacy, and high-value rewards.
- Precision emerald green grounds transactions, balances, and successful redemptions in absolute security.
- Crisp hairline boundaries, luminous pill tags, and soft atmospheric backdrops give the UI a tactile, modern app feel across both native mobile touchscreens and desktop web dashboards.

## Colors

The palette leverages a dark hierarchy paired with targeted culinary and transactional accents:

- **Primary (`#FF6B00`) — Electric Orange / Food Ember:** Dominates interactive meal items, coupon claims, primary conversion buttons, and limited-time offer badges. An appetizing, high-potency tone that commands focus.
- **Secondary (`#00C076`) — Trust Emerald:** Represents wallet balances, accrued points, authenticated security indicators, and verified vendor confirmations.
- **Tertiary (`#FF9F43`) — Fiery Amber Glow:** Applied to secondary highlights, streak meters, nutrition tags, and warm inner radial glows.
- **Neutral Palette:**
  - `Canvas / Background Base`: `#0F1115` (Deepest Charcoal Obsidian)
  - `Card / Surface Container`: `#14171F`
  - `Elevated Surface / Bottom Sheet`: `#1C202B`
  - `Ghost Border / Hairline Stroke`: `rgba(255, 255, 255, 0.08)`
  - `Glass Overlay Fill`: `rgba(255, 255, 255, 0.04)`
  - `Text Primary`: `#F8FAFC`
  - `Text Secondary / Subtitles`: `#94A3B8`
  - `Text Disabled / Muted`: `#64748B`

## Typography

The type scale relies entirely on **Plus Jakarta Sans**, utilizing its geometric yet approachable letterforms to balance numeric clarity with friendly warmth.

- Numerical figures for rewards, discounts, and points balances use tabular weights (`700` and `800`) with tight negative tracking (`-0.02em` to `-0.03em`) to optimize glanceability.
- Section tags, food tags, and merchant statuses use `label-sm` or `label-md` with positive tracking (`0.02em` - `0.04em`) to ensure legibility when uppercase.
- Responsive scaling is built into the system: hero totals shift down smoothly from desktop (40px) to mobile touch displays (28px) without breaking container balance.

## Layout & Spacing

This design system uses an adaptable 8pt layout grid engineered for high-density listing pages, reward carousels, and single-handed mobile navigation:

- **Mobile (< 768px):** Single-column stream with `1rem` outer canvas padding, edge-to-edge coupon cards, sticky bottom action bars, and snap-to-edge horizontally scrolling vendor pills.
- **Tablet (768px - 1024px):** 6-column fluid structure with `1.5rem` gutters and margins, facilitating side-by-side merchant catalogs and coupon detail drawers.
- **Desktop (> 1024px):** 12-column fixed-max layout (1280px shell) with an integrated left navigation rail, fixed point status cards, and multi-card restaurant grids.
- Internal component rhythm follows multiples of `4px` and `8px`, utilizing `space-xs` (4px) for inline badge icons, `space-sm` (8px) for input padding clusters, and `space-md` (16px) for module separation.

## Elevation & Depth

Depth is established without harsh drop shadows. Instead, it relies on layered dark surfaces, crisp inner hairline strokes, and colored radiant glows:

- **Level 0 (Canvas):** Pure `#0F1115`.
- **Level 1 (Cards & Modules):** `#14171F` background with a subtle border: `1px solid rgba(255, 255, 255, 0.06)`.
- **Level 2 (Active Cards & Floating Menus):** `#1C202B` background with a translucent glass blur (`backdrop-filter: blur(12px)`) and a subtle border: `1px solid rgba(255, 255, 255, 0.12)`.
- **Hero & Accent Elevation (Volumetric Glow):**
  - Orange CTA Glow: `box-shadow: 0px 8px 24px rgba(255, 107, 0, 0.28)`.
  - Emerald Balance Glow: `box-shadow: 0px 8px 24px rgba(0, 192, 118, 0.20)`.
- **Modals & Bottom Sheets:** Deep dark glass surface (`background: rgba(20, 23, 31, 0.94); backdrop-filter: blur(20px)`) with top border highlight `rgba(255, 255, 255, 0.15)`.

## Shapes

The shape hierarchy combines comfortable squircle containers with organic pill-shaped elements:

- **Large Surfaces & Coupon Cards:** Employ an expansive `16px` to `24px` radius (`rounded-lg` / `rounded-xl`), creating soft containment for photography and discount vouchers.
- **Pills, Chips, and Action Controls:** Strict `9999px` fully rounded geometry (`rounded-full`) for all buttons, search chips, category badges, and quantity selectors.
- **Form Fields & Small Elements:** Uniform `12px` to `16px` curvature providing modern tactile ergonomics.

## Components

### Buttons
- **Primary Food Action:** Vivid solid orange (`#FF6B00`) fill, white bold label, pill geometry (`9999px`), with orange ambient glow. On hover/press, transitions to `#FF7A1A` with a scale down to `0.98`.
- **Secondary Fintech Action:** Subtle emerald-tinted surface (`rgba(0, 192, 118, 0.12)`) or solid `#00C076` for financial top-ups, wallet balance triggers, and checkouts.
- **Ghost / Outlined:** Transparent background, `1px solid rgba(255, 255, 255, 0.16)`, white text, pill shape.

### Category Chips & Badges
- **Category Filter Chips:** Capsule pills with `rgba(255, 255, 255, 0.05)` fill and `1px solid rgba(255, 255, 255, 0.08)`. Selected state shifts to `#FF6B00` background with pure white typography.
- **Reward / Value Badges:** Small glowing pills (`label-sm`), featuring high-contrast orange text on `rgba(255, 107, 0, 0.15)` fill with a hairline orange border.

### Cards & Coupon Containers
- **Meal & Restaurant Cards:** Surface `#14171F` wrapped in a delicate border (`rgba(255, 255, 255, 0.06)`), 20px border radius, containing edge-to-edge food imagery with a dark gradient fade to ensure bottom text read-outs.
- **Points Balance Banner:** Rich horizontal hero card utilizing an intense energetic gradient from `#FF6B00` to `#FF3E00` with translucent fork-and-knife watermark motifs.

### Input Fields & Controls
- **Search & Text Inputs:** Recessed dark background (`#1C202B`), `1px solid rgba(255, 255, 255, 0.08)`, 12px corner radius, placeholder color `#64748B`, shifting to an active border glow of `#FF6B00` on focus.
- **Toggles & Switches:** Rounded pill track with active fill in `#FF6B00` or `#00C076`, containing an elevated white circular knob.

### Bottom Sheets & Overlays
- **Tactile Drawer:** Slides from the mobile viewport base with a centered `36px x 4px` dragging pill handle in `#64748B`. Backing surface is frosted `#14171F` with 24px top rounded corners.