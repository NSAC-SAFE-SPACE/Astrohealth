---
name: Astrohealth Clean Clinical
colors:
  surface: '#f8f9ff'
  surface-dim: '#cfdbec'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eef4ff'
  surface-container: '#e4efff'
  surface-container-high: '#dee9fb'
  surface-container-highest: '#d8e3f5'
  on-surface: '#111c29'
  on-surface-variant: '#424750'
  inverse-surface: '#26313f'
  inverse-on-surface: '#e9f1ff'
  outline: '#727781'
  outline-variant: '#c2c7d1'
  surface-tint: '#27609c'
  primary: '#003866'
  on-primary: '#ffffff'
  primary-container: '#0b4f8a'
  on-primary-container: '#94c2ff'
  inverse-primary: '#a2c9ff'
  secondary: '#006a60'
  on-secondary: '#ffffff'
  secondary-container: '#8cf5e4'
  on-secondary-container: '#007166'
  tertiary: '#592a00'
  on-tertiary: '#ffffff'
  tertiary-container: '#7b3c00'
  on-tertiary-container: '#ffab6f'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d3e4ff'
  primary-fixed-dim: '#a2c9ff'
  on-primary-fixed: '#001c38'
  on-primary-fixed-variant: '#004881'
  secondary-fixed: '#8cf5e4'
  secondary-fixed-dim: '#6fd8c8'
  on-secondary-fixed: '#00201c'
  on-secondary-fixed-variant: '#005048'
  tertiary-fixed: '#ffdcc6'
  tertiary-fixed-dim: '#ffb785'
  on-tertiary-fixed: '#301400'
  on-tertiary-fixed-variant: '#713700'
  background: '#f8f9ff'
  on-background: '#111c29'
  surface-variant: '#d8e3f5'
  surface-base: '#FFFFFF'
  surface-subtle: '#F5F8FB'
  border-subtle: '#E3E9EF'
  text-muted: '#5B6B7B'
  status-normal: '#2E9E6B'
  status-surveillance: '#D9A400'
  status-action: '#E07B00'
  status-contact-chirurgien: '#C93C3C'
typography:
  headline-xl:
    fontFamily: Source Serif 4
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
  headline-xl-mobile:
    fontFamily: Source Serif 4
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
  headline-lg:
    fontFamily: Source Serif 4
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
  headline-md:
    fontFamily: Source Serif 4
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 30px
  body-lg:
    fontFamily: Source Sans 3
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28.8px
  body-lg-bold:
    fontFamily: Source Sans 3
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 28.8px
  body-base:
    fontFamily: Source Sans 3
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 25.6px
  body-base-semibold:
    fontFamily: Source Sans 3
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 25.6px
  label-md:
    fontFamily: Source Sans 3
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.02em
  caption:
    fontFamily: Source Sans 3
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-mobile: 1rem
  margin: 2rem
  margin-mobile: 1.25rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style

This design system is tailored for mission-critical clinical diagnostics, continuous biometrics, and post-procedural astronaut monitoring. Designed specifically for fatigued operators and clinicians under stress, it embodies clinical sobriety, supreme legibility, and architectural calm. It rejects high-contrast sci-fi tropes, harsh neon glow, and decorative digital noise in favor of a clinical aesthetic grounded in precision medicine.

The design movement combines **Minimalism** with subtle **Tonal Layering**:
- **Generous Whitespace:** Spacious margins prevent cognitive overload and create immediate visual order.
- **Human Warmth & Clinical Authority:** The juxtaposition of an authoritative serif editorial structure with razor-sharp clinical sans typography humanizes technical telemetry data while retaining institutional credibility.
- **Restful Clarity:** An 80/15/5 distribution rule ensures screens are predominantly pristine and neutral, allowing alerts and clinical directives to surface instantly without visual contention.

## Colors

The palette operates on a strict functional hierarchy designed to prevent cognitive fatigue and ensure instant triage comprehension:

- **Neutrals (80%):** `#FFFFFF` serves as the primary canvas for maximum optical contrast and clinical purity. `#F5F8FB` defines soft card surfaces and grouped telemetry panels. `#E3E9EF` provides whisper-light structural bounding. Body text sits in high-contrast charcoal slate (`#1F2A37`), avoiding harsh absolute black, with secondary metadata in `#5B6B7B`.
- **Primary Clinical Navy (`#0B4F8A` - 15%):** Used for structural navigation, primary clinical action buttons, section anchors, and dominant metric titles.
- **Teal Accent (`#2A9D8F` - 5%):** Reserved for subtle data points, secondary active states, key data icons, and verified medical validation markers.
- **Clinical Status Badges:** Status indicators never use loud, saturated flood fills. Badges feature subdued 10–12% tint backgrounds with precise 2px status dots and high-contrast text:
  - **Normal (`#2E9E6B`):** Stable biomarkers and routine physiological baseline.
  - **Surveillance (`#D9A400`):** Requires scheduled periodic re-check; no active intervention.
  - **Action (`#E07B00`):** Immediate procedural or medication protocol required.
  - **Contact Chirurgien (`#C93C3C`):** Urgent surgical or medical officer escalation.

## Typography

Typography establishes an atmosphere of calm authority, exceptional legibility, and effortless scanning:

- **Headings (Source Serif 4):** Chosen for its humanizing quality and clinical pedigree. Headings command respect without sounding aggressive or cold.
- **Body, Telemetry & Controls (Source Sans 3):** Engineered for direct clarity across tabular displays, medication dosages, and operational body copy.
- **Line Length & Ergonomics:** All prose, clinical assessments, and patient directives are strictly limited to `max-width: 65ch` to reduce saccadic eye fatigue during long monitoring shifts.
- **Floor Threshold:** Base running body text must never dip below 16px (`1rem`). Body line heights are held at a minimum of 1.6 (`~26px` to `~29px`) to maintain comfortable horizontal flow.

## Layout & Spacing

The layout philosophy is built around a structured fluid grid with fixed outer breathing rooms:

- **Canvas Margins:** Minimum 32px (`2rem`) on desktop and tablet workspaces to isolate clinical tools from screen bezels; 20px (`1.25rem`) on mobile interfaces.
- **Vertical Rhythm:** Section blocks are spaced between 24px and 48px apart, enforcing distinct perceptual clusters for vitals, medication logs, and clinical history.
- **Interactive Sizing:** Touch targets throughout touchscreens and telemetry dashboards must measure at least 48px × 48px to accommodate microgravity float and reduced motor precision under fatigue.
- **Reflow Rules:** Desktop views use 12 columns for multi-panel telemetry cards. Breakdowns collapse into 8 columns at 1024px, and a unified single-column flow with persistent pinned action docks below 768px.

## Elevation & Depth

To avoid optical fatigue and keep screens looking clean, depth is conveyed through **tonal layer shifts** and **low-contrast boundaries** rather than dramatic shadows:

- **Surfaces:** The root page background is pure white (`#FFFFFF`). Secondary clinical panels, patient summary sidebars, and telemetry modules rest on `#F5F8FB`.
- **Borders:** Containers are bounded by an ultra-clean 1px hairline border (`#E3E9EF`), ensuring crisp structural separation in clinical lighting environments without harsh dark lines.
- **Shadows:** Floating elements (such as quick-action menus, surgical dropdowns, and modal dialogs) employ an ultra-subtle ambient shadow: `box-shadow: 0 1px 3px 0 rgba(11, 79, 138, 0.04), 0 4px 12px -2px rgba(31, 42, 55, 0.06)`. High-blur black drop shadows and glow effects are explicitly prohibited.

## Shapes

The design system implements a **Soft** shape language (`roundedness: 1`), conveying modern medical technology balanced with precision:

- **Standard Elements (0.25rem / 4px):** Form inputs, table cells, metric callouts, and secondary tool buttons use precise, minimal 4px corners to communicate diagnostic rigour.
- **Cards & Diagnostic Modules (0.5rem / 8px):** Primary cards, clinical panels, and patient summary tiles utilize 8px corners (`rounded-lg`) to soften layout boundaries.
- **Modals & Flyouts (0.75rem / 12px):** Overlays, prescription sheets, and dialog surfaces use 12px corners (`rounded-xl`).
- **Pill Elements:** Fully rounded borders (`border-radius: 9999px`) are restricted exclusively to status indicators, operational tags, and contextual telemetry badge pills.

## Components

### Buttons
- **Primary:** Background `#0B4F8A`, text `#FFFFFF`, font Source Sans 3 (Weight 600, 16px). Minimum height 48px, horizontal padding 24px, corner radius 4px. Hover state shifts to `#093F6E`.
- **Secondary:** Surface `#FFFFFF`, border 1px solid `#0B4F8A`, text `#0B4F8A`. Hover brings a gentle `#F5F8FB` background shift.
- **Subtle / Ghost:** Pure transparent background, text `#5B6B7B`, hover text `#0B4F8A` with a background fill of `#F5F8FB`.

### Status Badges & Pills
- **Geometry:** Height 28px, corner radius 9999px (pill-shaped), horizontal padding 10px.
- **Treatment:** Never use fully saturated background fills. Combine a subtle 10% opacity tint of the status color with high-contrast text (`#1F2A37`) and a 6px circular dot indicator in the leading position.
- **Variants:**
  - *Normal:* Dot `#2E9E6B`, background `rgba(46, 158, 107, 0.12)`.
  - *Surveillance:* Dot `#D9A400`, background `rgba(217, 164, 0, 0.12)`.
  - *Action:* Dot `#E07B00`, background `rgba(224, 123, 0, 0.12)`.
  - *Contact Chirurgien:* Dot `#C93C3C`, background `rgba(201, 60, 60, 0.12)`.

### Cards & Telemetry Containers
- Background `#F5F8FB` on `#FFFFFF` page canvas, 1px border `#E3E9EF`, corner radius 8px (`rounded-lg`), padding 24px (`space-lg`).
- Header includes a 20px Source Serif 4 title paired with a right-aligned telemetry timestamp in 14px Source Sans 3 `#5B6B7B`.

### Form Fields & Inputs
- Height 48px, background `#FFFFFF`, border 1px solid `#E3E9EF`, corner radius 4px, padding 0 16px. Text 16px `#1F2A37`.
- Focus state: Border transitions to `#0B4F8A` with a 2px offset ring of `rgba(11, 79, 138, 0.15)`. No loud transitions.

### Lists & Clinical Logs
- Alternating subtle rows or single-pixel `#E3E9EF` divider lines. Row height minimum 52px for touch ergonomics.
- Data columns align numerically right, text descriptions align left, with 14px uppercase category labels (`#5B6B7B`).

### Checkboxes & Radio Buttons
- 20px × 20px touch boundary embedded within a minimum 48px touch container.
- Selected state uses `#0B4F8A` fill with white check/radio glyph; default state uses 1.5px border `#E3E9EF` over white background.