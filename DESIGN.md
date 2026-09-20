---
name: Court Finder
description: A direct, map-first field guide to possible sports facilities.
colors:
  carbon: "#0B0B0B"
  paper: "#FFFFFF"
  fog: "#F3F3F3"
  utility-gray: "#6B6B6B"
  line: "#E0E0E0"
  signal-orange: "#F26B3A"
  signal-orange-strong: "#D95528"
  route-blue: "#2F6FED"
  verified-green: "#2F8F5B"
  caution-yellow: "#D6A12C"
  alert-red: "#C63F3F"
  basketball-orange: "#E87A30"
  tennis-green: "#58A96A"
  soccer-red: "#D75A4C"
  baseball-yellow: "#D7A63C"
  track-blue: "#5572C7"
typography:
  display:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(2.25rem, 8vw, 4rem)"
    fontWeight: 750
    lineHeight: 0.98
    letterSpacing: "-0.04em"
  headline:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 650
    lineHeight: 1.2
  body:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "JetBrains Mono, ui-monospace, SFMono-Regular, monospace"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "0.06em"
rounded:
  sm: "4px"
  md: "8px"
  lg: "12px"
  xl: "16px"
  full: "9999px"
spacing:
  xxs: "4px"
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  2xl: "48px"
components:
  button-primary:
    backgroundColor: "{colors.signal-orange}"
    textColor: "{colors.carbon}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "14px 18px"
    height: "48px"
  button-primary-hover:
    backgroundColor: "{colors.signal-orange-strong}"
    textColor: "{colors.carbon}"
    rounded: "{rounded.md}"
    padding: "14px 18px"
    height: "48px"
  button-secondary:
    backgroundColor: "{colors.carbon}"
    textColor: "{colors.paper}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "14px 18px"
    height: "48px"
  input-search:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.carbon}"
    rounded: "{rounded.lg}"
    padding: "14px 16px"
    height: "52px"
  filter-chip-selected:
    backgroundColor: "{colors.carbon}"
    textColor: "{colors.paper}"
    rounded: "{rounded.full}"
    padding: "10px 14px"
    height: "40px"
  map-control:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.carbon}"
    rounded: "{rounded.md}"
    size: "48px"
  detection-sheet:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.carbon}"
    rounded: "{rounded.xl}"
    padding: "20px 16px"
  bottom-navigation:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.carbon}"
    rounded: "0"
    padding: "8px 12px"
    height: "64px"
---

# Design System: Court Finder

## Overview

**Creative North Star: "The Field Guide"**

This is the target replacement language for the next implementation pass.

Court Finder should feel like a dependable field instrument for someone standing somewhere unfamiliar. The interface is calm at rest, immediate when action is needed, and specific about what the system actually knows. It borrows the directness of mature mobility apps—destination-first search, a map that stays available beneath the task, and focused sheets that keep the next decision close—without copying another company's branding, assets, typography, or iconography.

The visual world is mostly neutral: carbon, paper, fog, and utility gray give the map and satellite imagery room to speak. Bold accents are reserved for actions, facility types, route-like movement, and explicit state. A possible facility is treated like a field note: useful evidence to inspect, never a promise of access, availability, safety, or accuracy.

The intended target is a mobile-first operating experience. Controls are direct and tactile, with generous touch targets, short labels, strong contrast, and bottom sheets that bring detail into reach. Depth is hybrid: the map and content stay visually quiet, while search, controls, result sheets, and primary actions lift clearly above the surface.

**Key Characteristics:**
- Neutral carbon-and-paper foundation with deliberate signal color.
- Map-first composition with task-focused overlays.
- Direct, tactile controls sized for thumbs before pointers.
- Confidence and verification treated as evidence, not decoration.
- Light and dark themes share the same hierarchy and semantic roles.

## Colors

The palette is neutral by default and decisive by exception. Carbon and paper carry most of the interface; color tells people what to do, what changed, or what kind of facility they are seeing.

### Primary
- **Signal Orange** (`{colors.signal-orange}`): The primary action, active scan state, and high-attention affordance. Use it as a signal, not a page wash.

### Secondary
- **Route Blue** (`{colors.route-blue}`): Search, location, navigation, and other movement-oriented actions.

### Tertiary
- **Verified Green** (`{colors.verified-green}`): Confirmed community status and positive completion states only.
- **Basketball Orange** (`{colors.basketball-orange}`): Basketball facility identity on the map and in filters.
- **Tennis Green** (`{colors.tennis-green}`): Tennis facility identity on the map and in filters.
- **Soccer Red** (`{colors.soccer-red}`): Soccer or football facility identity on the map and in filters.
- **Baseball Yellow** (`{colors.baseball-yellow}`): Baseball facility identity on the map and in filters.
- **Track Blue** (`{colors.track-blue}`): Track-and-field facility identity on the map and in filters.

### Neutral
- **Carbon** (`{colors.carbon}`): Primary text, high-emphasis controls, dark theme canvas, and the strongest selected state.
- **Paper** (`{colors.paper}`): Primary light theme surface, sheets, fields, and readable overlay content.
- **Fog** (`{colors.fog}`): Quiet grouped surfaces, inactive filter backgrounds, and low-emphasis containers.
- **Utility Gray** (`{colors.utility-gray}`): Supporting text, metadata, helper copy, and inactive controls.
- **Line** (`{colors.line}`): Dividers and field boundaries. Use sparingly and never as the main source of hierarchy.
- **Caution Yellow** (`{colors.caution-yellow}`): Warnings that require attention but do not indicate failure.
- **Alert Red** (`{colors.alert-red}`): Destructive actions, errors, and explicit rejection states.

### Named Rules
**The Neutral Canvas Rule.** Keep the majority of every screen carbon, paper, fog, or utility gray. Color earns its place by signaling an action, category, or state.

**The Evidence Color Rule.** A bright marker identifies a facility type or interaction state; it never implies that a detection is accurate, public, open, safe, or available.

## Typography

**Display Font:** Inter (with `ui-sans-serif`, `system-ui`, and `sans-serif` fallbacks)

**Body Font:** Inter (with `ui-sans-serif`, `system-ui`, and `sans-serif` fallbacks)

**Label/Mono Font:** JetBrains Mono (with `ui-monospace` and `monospace` fallbacks)

**Character:** The type system is plainspoken, compact, and highly legible at a glance. Inter provides a neutral utility voice; JetBrains Mono marks coordinates, confidence values, model metadata, and other evidence without turning the whole interface into a technical display.

### Hierarchy
- **Display** (750, `clamp(2.25rem, 8vw, 4rem)`, `0.98` line-height): Landing, empty, and orientation moments only; do not let oversized type compete with map tasks.
- **Headline** (700, `1.75rem`, `1.1` line-height): Screen titles, bottom-sheet titles, and major task framing.
- **Title** (650, `1.25rem`, `1.2` line-height): Result names, section headings, and primary content labels.
- **Body** (400, `1rem`, `1.5` line-height): Explanations and task copy, ideally kept within 60–70 characters per line on wider surfaces.
- **Label** (600, `0.75rem`, `1.2` line-height, `0.06em` tracking): Confidence values, coordinates, compact metadata, and short control labels. Use sentence case for actions; reserve uppercase for evidence-like metadata.

### Named Rules
**The One-Decision Rule.** A heading, sheet, or action group should make its next decision obvious before secondary explanation appears.

## Layout

This is a mobile-first operating system for a map. The map is the base plane; search, filters, controls, and detection details sit above it in predictable touch zones. Use 16px mobile gutters, 24px tablet gutters, and 32px desktop gutters. The base spacing unit is 4px, with most component spacing landing on 8px, 12px, 16px, or 24px.

Search belongs near the top edge and remains easy to reach. Filter chips may scroll horizontally rather than wrap into a dense block. Map controls group vertically near a thumb-friendly edge. On mobile, result details and settings use bottom sheets that can expand to roughly 75–85% of the viewport; on wider screens, the same content becomes a fixed side panel or anchored card without changing its hierarchy.

Interactive controls use a minimum 48px touch target. Keep the bottom navigation visually stable and account for device safe areas. Desktop layouts may add a persistent control rail, but they should preserve the same search-first path and the same map-to-evidence relationship.

## Elevation & Depth

The system is hybrid. The map, page background, and grouped content are mostly flat and tonal. Search fields, floating controls, result sheets, dialogs, and primary actions receive a soft lift so their interaction boundary is unmistakable. Shadows are ambient rather than ornamental; use borders when a surface needs a crisp boundary, and avoid layering multiple competing effects.

### Shadow Vocabulary
- **Control lift** (`0 2px 8px rgba(0, 0, 0, 0.12)`): Floating map controls, search fields, and compact interactive surfaces.
- **Sheet lift** (`0 4px 16px rgba(0, 0, 0, 0.16)`): Bottom sheets and anchored result panels.
- **Overlay lift** (`0 10px 30px rgba(0, 0, 0, 0.18)`): Dialogs or panels that must clearly separate from a busy map.

### Named Rules
**The Lift-on-Task Rule.** Elevation belongs to something the person can act on. Do not add shadow merely to make a passive container look finished.

## Shapes

The form language is compact and touch-friendly. Use 8px corners for buttons and controls, 12px for fields and cards, 16px for sheets, and full rounding only for chips, status dots, avatars, and circular map markers. Major actions should not become pills; their rectangular silhouette makes them read as deliberate controls.

Use a single 1px line only when it clarifies a boundary in a quiet surface. Avoid ornamental rules, heavy outlines, and decorative geometry. Satellite imagery and map geometry provide enough visual texture; interface shapes should stay simple around them.

## Components

Components should feel direct and tactile: clear labels, obvious press states, generous targets, and a visible relationship between an action and the evidence it changes.

### Buttons
- **Shape:** Compact rectangular controls with gently rounded corners (`8px`) and a minimum height of `48px`.
- **Primary:** Signal Orange with Carbon text; use for the main action in a region, such as opening the map, reviewing evidence, or starting a scan.
- **Hover / Focus:** Deepen to Signal Orange Strong on hover; use a visible 3px focus ring based on Route Blue; press states may scale down subtly or reduce lift.
- **Secondary / Ghost / Tertiary:** Carbon-filled buttons are reserved for high-contrast secondary actions. Quiet actions use Paper or Fog with a low-contrast line; ghost actions should not compete with the primary.

### Chips
- **Style:** Full-round (`9999px`), compact, and horizontally scrollable on mobile. Inactive chips use Fog with Utility Gray text; selected chips use Carbon with Paper text or the facility's semantic color when the category itself is the focus.
- **State:** Keep selected, unselected, disabled, and loading states visually distinct. A selected chip filters the map; it does not imply verification.

### Cards / Containers
- **Corner Style:** Cards use `12px`; bottom sheets use `16px` on the leading edge.
- **Background:** Paper in light mode and a raised Carbon-adjacent surface in dark mode; use Fog for grouped secondary content.
- **Shadow Strategy:** Reference Elevation & Depth. Cards at rest should remain quiet; sheets and floating controls may lift.
- **Border:** Prefer no border on lifted surfaces. Use Line only where the surface would otherwise merge into its background.
- **Internal Padding:** `16px` for compact cards, `20px` for detection sheets, and `24px` for full-width settings sections.

### Inputs / Fields
- **Style:** Paper or raised dark surface, `12px` radius, subtle Line border, `52px` height for search, and an icon or location affordance at the leading edge.
- **Focus:** Route Blue border or ring with no layout shift. Preserve the input's readable contrast while suggestions are open.
- **Error / Disabled:** Alert Red is reserved for actual errors. Disabled fields lower contrast and opacity without changing their geometry.

### Navigation
- **Style:** Mobile navigation is a stable bottom bar with 64px of content height plus safe-area padding. Keep labels short and pair them with familiar icons.
- **States:** The active destination uses Carbon text and a small Signal Orange indicator in light mode; dark mode inverts the surface while preserving the same emphasis order. Do not use a full-color tab strip.
- **Desktop:** Replace the bottom bar with a compact header or side rail, but keep Map as the primary destination and retain the same search-first flow.

### Detection Sheet

The detection sheet is the signature component: a possible facility becomes a focused field note. Lead with facility type and location, show the satellite context, confidence, and verification status together, then offer one clear next action such as directions, feedback, or saving. The sheet must keep the distinction between model evidence and real-world access visible.

## Do's and Don'ts

### Do:
- **Do** keep most of the screen neutral and let one signal color define the next action.
- **Do** make primary controls at least `48px` tall and easy to operate with a thumb.
- **Do** keep the map visible or one gesture away while people search, filter, and inspect.
- **Do** use facility colors consistently across markers, chips, legends, and detail views.
- **Do** show satellite context, confidence, and verification status as separate pieces of evidence.
- **Do** use direct language such as “possible facility,” “model confidence,” and “verify access.”

### Don't:
- **Don't** introduce borrowed brand assets, proprietary fonts, or branded component patterns; the system should feel native to Court Finder.
- **Don't** flood a screen with orange, blue, or facility colors; saturation is a signal with a job.
- **Don't** make every control a pill or every surface a floating card.
- **Don't** use gradients, glass blur, or decorative shadows when a neutral surface and clear hierarchy are enough.
- **Don't** describe a detection or confidence score as proof of accuracy, public access, availability, safety, or permission to enter.
- **Don't** let a marketing treatment obscure the operating task: search, inspect, verify, decide.
