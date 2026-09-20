---
target: src/routes/index.tsx
total_score: 23
max_score: 32
na_heuristics: 7,10
p0_count: 0
p1_count: 3
target_identity: "file:/home/sean/.codex/worktrees/5bb3/court-finder/src/routes/index.tsx"
target_fingerprint: "sha256:32fa814d59981bdbab5c16ad0f729abd2103242bcb75cc78503837780884f1eb"
target_path: /home/sean/.codex/worktrees/5bb3/court-finder/src/routes/index.tsx
timestamp: 2026-09-20T21-10-32Z
slug: src-routes-index-tsx
---
## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3/4 | The page communicates the scan/evidence concept, but “imagery loaded” is a static-looking status and there is no direct search or location state on the landing page. |
| 2 | Match System / Real World | 4/4 | “Choose an area → inspect possible facilities → check the evidence” is a strong mental model for how someone actually evaluates an unfamiliar place. |
| 3 | User Control and Freedom | 3/4 | The map CTA, anchor link, footer links, and expandable trust note are clear, but the page makes people leave the landing page before they can search or orient themselves. |
| 4 | Consistency and Standards | 2/4 | The implementation drifts from DESIGN.md through Space Grotesk, multiple gradients/backdrop blurs, oversized shadows, and several off-ramp font sizes. |
| 5 | Error Prevention | 3/4 | The copy repeatedly says “possible” and asks users to verify access, but the first headline and confidence treatment arrive before the strongest caveat. |
| 6 | Recognition Rather Than Recall | 3/4 | Facility categories, satellite context, and the three-step explanation are easy to recognize; the basketball/volleyball and track/route icon choices weaken semantic clarity. |
| 7 | Flexibility and Efficiency | n/a | This is a persuasion/landing surface rather than the operating map workflow. |
| 8 | Aesthetic and Minimalist Design | 3/4 | Strong hierarchy and a coherent image-led story, but the long page repeats the same satellite/proof idea and adds decorative treatment that does not improve the decision. |
| 9 | Error Recovery | 2/4 | There are no visible failure, unavailable-imagery, or empty-result states on the entry surface, and the static “imagery loaded” cue can set the wrong expectation. |
| 10 | Help and Documentation | n/a | Help belongs in the map and terms/privacy surfaces; this page only needs a concise expectation-setting note. |
| **Total** | | **23/32** | **Solid foundation with trust, mobile-priority, and focus issues to resolve.** |

## Design Specificity Verdict

### LLM assessment

This is recognizably Court Finder rather than a completely interchangeable SaaS page. The satellite imagery, possible-facility language, model confidence, community feedback, and access warning give the page a real product point of view. The strongest design idea is the evidence relationship: a detection is shown as something to inspect, not a directory listing to blindly trust.

The composition is still structurally familiar: oversized hero, screenshot card, feature taxonomy, three-step explanation, proof section, and repeated CTA. That structure could ship for many AI, mapping, or discovery products with the copy swapped. The page would feel more authored if the map/search task arrived earlier and if the visual system followed the “field guide” direction more strictly: fewer decorative rings and glassy overlays, more precise evidence framing, and a tighter relationship to the actual map workflow.

### Deterministic scan

The detector reported 5 advisory `design-system-font-size` findings in `/home/sean/.codex/worktrees/5bb3/court-finder/src/routes/index.tsx`, at lines 108, 111, 117, 136, and 305. Each uses a `10px` label where DESIGN.md documents a `12px` label step. These are not false positives: they are intentional metadata labels, but the smaller size makes the evidence harder to read and creates system drift. No blocking detector findings were reported.

## Overall Impression

This is a polished and unusually responsible landing page for a detection product. It makes uncertainty part of the story instead of hiding it. The biggest opportunity is to make the landing page behave more like the product it introduces: get a visitor to a location and plausible result quickly, while putting the permission and uncertainty boundary beside the first action instead of at the end of a long narrative.

## What's Working

- The copy distinguishes model evidence from reality in several places: “possible,” “model confidence,” “not an accuracy guarantee,” and “verify access.” That is exactly the right trust posture for this product.
- The satellite preview is a strong proof device. The bounding boxes, facility label, and confidence label show what the user will actually inspect on the map rather than relying on abstract feature claims.
- The page has a solid structural rhythm across desktop and mobile: clear heading hierarchy, generous touch-sized CTA/button targets, useful image alt text, semantic section headings, an ordered process list, and a real button for the trust disclosure.

## Priority Issues

### [P1] The opening promise is stronger than the product guarantee

**Why it matters:** “Find the places maps miss” and “Your next game may be one pin away” are memorable, but “places” and “game” can imply a playable, available destination. The product only establishes a possible visible facility from satellite imagery. The caveat is present, but it arrives after the first impression and is collapsed at the bottom.

**Fix:** Keep the sharp positioning, but bind it to evidence in the first viewport: “Find possible courts and fields beyond ordinary listings” or “Explore possible facilities maps may miss.” Add a one-line note directly under the hero CTA or image: “Satellite detections are leads—verify access, hours, and conditions before visiting.” Keep the longer disclosure expandable.

**Suggested command:** `$impeccable clarify`

### [P1] The mobile app shell competes with the landing-page action

**Why it matters:** The root layout renders `BottomNav` on every mobile route, so `/` gets a fixed Home / Map / Login bar as well as the sticky header and the hero CTA. It consumes 64px plus bottom padding, duplicates the “Map” destination, and makes the page feel like an already-entered app instead of a focused invitation into the map. This is especially costly on smaller screens where the first proof image is already below the copy.

**Fix:** Hide the mobile bottom navigation on the marketing home route, or reserve it for map/account/feedback workflows. Keep one prominent map CTA on the home page; let the map screen use the persistent app navigation.

**Suggested command:** `$impeccable adapt`

### [P1] The confidence/evidence caveat is visually delayed

**Why it matters:** The first image presents “86% model confidence” with a loaded-status treatment before the page explains what confidence means. A visitor can easily read the number as accuracy or validation, especially when the page is asking them to plan a trip.

**Fix:** Pair the first confidence label with “model confidence—not accuracy” or move the number into a small evidence legend beside the CTA. Replace the animated “imagery loaded” status with a clearly static label such as “Example satellite review” unless it reflects an actual loading state.

**Suggested command:** `$impeccable clarify`

### [P2] The page spends too long proving the same idea

**Why it matters:** The hero preview, five-type strip, three-step list, second satellite image, evidence checklist, final CTA, and trust accordion all explain variations of “we detect facilities from imagery.” The story is coherent, but the visitor who already understands the concept must scroll through repeated proof before reaching the map.

**Fix:** Compress the surface into three decisions: what Court Finder finds, how to inspect one detection, and where to start. Keep one satellite proof image, collapse the facility taxonomy into the map CTA or a compact legend, and move detailed community-feedback/favorites explanation into the map experience.

**Suggested command:** `$impeccable distill`

### [P2] The visual language drifts from the committed field-guide system

**Why it matters:** DESIGN.md calls for a neutral, direct field instrument and explicitly cautions against gradients, glass blur, and decorative shadows. The route uses a large orbit motif, gradient image washes, multiple `backdrop-blur-md` overlays, heavy shadows, and Space Grotesk from `src/index.css` instead of the documented Inter direction. The result is attractive, but more like a generic premium AI landing page than the precise map/evidence tool described in the design system.

**Fix:** Remove the orbit decoration and reduce each image to one readable overlay. Use borders/tonal surfaces instead of blur where possible, align display/body typography with DESIGN.md (or update DESIGN.md intentionally), and keep the orange accent reserved for action and detection state. Raise the five `10px` detector labels to the documented `12px` evidence size.

**Suggested command:** `$impeccable document` followed by `$impeccable typeset`

## Persona Red Flags

**Jordan (first-time visitor):** On mobile, Jordan sees a large marketing image and persistent Home/Map/Login chrome but cannot enter a location on the page. They must click through to the map before doing the task. The “86% model confidence” number appears before its non-accuracy meaning is explained.

**Alex (returning player):** Alex already knows Court Finder and wants the map immediately. The duplicated mobile navigation and long page insert friction before the one action that matters. The page does not surface a recent area, saved place, or “continue exploring” state; every visit starts with the same full narrative.

**Riley (permission-conscious local):** Riley needs to know whether a detection is safe and permitted to visit. The strongest warning is hidden in the bottom accordion, while “one pin away” and “places to play” appear earlier. The page should put “verify access” next to the first CTA and distinguish model confidence from real-world availability there.

## Minor Observations

- The Basketball category uses the `Volleyball` icon and Track and field uses `Route`; semantically neutral geometry would be less misleading than the wrong sport or a route metaphor.
- `truncate` on the facility names can hide “Soccer / football” or “Track and field” in narrow grid cells. Let labels wrap, or shorten them deliberately to “Soccer” and “Track & field.”
- The animated dot and “imagery loaded” label read like live system status even though the image is a static example. Either make it real or label it as an example.
- The home route inherits generic root metadata (`title: court-finder`, `description: court-finder is a web application`) rather than the product promise shown in the page. This weakens search previews and share cards even though the on-page copy is much stronger.
- The trust disclosure has `aria-expanded`, but adding `aria-controls` and a stable panel id would make the relationship more explicit to assistive technology.

## Questions to Consider

- What if the first CTA opened directly into a location-ready map state, with the landing page serving as the map’s orientation layer rather than a separate sales page?
- Which single sentence must a visitor remember about model confidence after seeing the hero image?
- If the satellite proof image disappeared, would the remaining layout still feel like Court Finder, or would it become a generic AI discovery page?
