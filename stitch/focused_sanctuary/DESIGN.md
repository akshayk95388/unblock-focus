# Design System: The Focused Sanctuary

## 1. Overview & Creative North Star
The "Focused Sanctuary" is a high-end digital environment designed to facilitate deep work by eliminating visual noise and replacing it with atmospheric depth. Unlike standard productivity tools that rely on rigid grids and clinical borders, this system treats the interface as a physical space illuminated by a distant horizon.

**Creative North Star: The Celestial Observatory**
The UI should feel like a high-end, darkened room where only the essential information is illuminated. We break the "template" look through:
*   **Intentional Asymmetry:** Using generous, uneven whitespace to guide the eye, rather than centered, predictable layouts.
*   **Atmospheric Depth:** Using the "Deep Void" background as an infinite canvas where elements float in a specific light-driven hierarchy.
*   **Editorial Scaling:** Dramatically large display type paired with microscopic, high-precision labels to create an authoritative, premium feel.

---

## 2. Colors & The "No-Line" Rule
This system rejects the 1px border. In the "Focused Sanctuary," boundaries are felt, not seen.

### The Palette
*   **Deep Void (`#131314`):** Our foundational canvas. It is not "black," but a textured dark grey that allows for subtle shadow depth.
*   **Sunset Glow (`#FF823C`):** Used exclusively for high-impact focus points, primary CTAs, and active progress indicators.
*   **Indigo Calm (`#413f9a`):** Used for background depth, secondary containers, and states of rest or "flow."

### Tonal Hierarchy & Nesting
Instead of lines, use the **Surface Tiering** to define structure:
*   **Base Layer:** `surface` (#131314)
*   **Secondary Sections:** `surface_container_low` (#1c1b1c)
*   **Interactive Cards:** `surface_container` (#201f20)
*   **Floating Elements:** `surface_container_highest` (#353436)

**The Rule of Three:** Never nest more than three levels of tonal shifts. If you need more separation, use a `primary_container` (#ff823c) glow or a `secondary_container` (#3f3d98) wash.

### Glass & Texture
*   **Glassmorphism:** For overlays, modals, and navigation bars, use `surface_variant` at 40% opacity with a `24px` backdrop blur. This allows the "Sunset Glow" shadows from underlying elements to bleed through, maintaining a sense of place.
*   **Signature Gradients:** Use a linear gradient (45°) from `primary` to `primary_container` for hero actions to simulate a "glowing ember" effect.

---

## 3. Typography
We use **Inter** not as a standard sans-serif, but as a precision instrument.

*   **Display (Editorial Impact):** Use `display-lg` (3.5rem) with negative letter-spacing (-0.04em) for deep work headers. These should often be left-aligned with a significant "asymmetric gutter" (e.g., 20% width) to the left.
*   **Headlines & Titles:** `headline-md` (1.75rem) provides the structure. Keep these in `on_surface` (high contrast).
*   **The Utility Duo:** Pair `body-md` (0.875rem) for descriptions with `label-sm` (0.6875rem, uppercase, tracked out +10%) for metadata. The contrast in size creates a "Swiss-designed" architectural feel.
*   **Precision Asymmetry:** Avoid centering text in large containers. Anchor text to the top-left or bottom-right to create a dynamic, modern energy.

---

## 4. Elevation & Depth
Depth is achieved through light and layering, not structural scaffolding.

*   **The Layering Principle:** To lift a card, move from `surface_container_low` to `surface_container`. The change in hex value provides the "lift."
*   **Ambient Sunset Shadows:** For floating elements (modals/popovers), use a dual-shadow approach:
    1.  A tight, dark shadow for definition (`#000000` @ 20% alpha, 4px blur).
    2.  A wide, atmospheric "Sunset Glow" shadow using `primary` at 8% opacity with a 40px–60px blur. This creates the "glow" of a high-end lamp.
*   **The Ghost Border Fallback:** If a container sits on a background of the same color, use `outline_variant` at 15% opacity. Never use a solid 100% opaque border.
*   **Roundedness:** All containers must use the `md` (1.5rem) or `lg` (2rem) scale. Smaller radiuses are prohibited as they feel too "utilitarian."

---

## 5. Components

### Buttons
*   **Primary:** `primary_container` background with `on_primary_container` text. Corner radius: `full`. No border.
*   **Secondary:** `surface_container_highest` background. Subtle `primary` ambient shadow on hover.
*   **Tertiary:** Text-only in `primary`. Underline only on hover using a 2px offset.

### Cards & Lists
*   **The No-Divider Rule:** Vertical lists must use 16px–24px of vertical whitespace or alternating tonal backgrounds (`surface_container_low` vs `surface_container_lowest`). Never use a 1px line to separate items.
*   **Focus Cards:** When a task is "Active," give the card a `secondary_container` background and a `primary` glow shadow.

### Input Fields
*   **Styling:** Use `surface_container_low` with an extra-large `md` (1.5rem) corner radius.
*   **Active State:** The field should not get a border; instead, the background shifts to `surface_container_high` and the label moves to `primary` (Sunset Glow).

### Deep Work Timer (Signature Component)
*   A large, circular stroke using a gradient of `secondary` to `tertiary`. 
*   Center-aligned `display-lg` typography. 
*   The background of the timer should use `Glassmorphism` to feel like a floating lens over the "Deep Void."

---

## 6. Do’s and Don’ts

### Do:
*   **Do** use extreme whitespace. If you think there is enough space, add 20% more.
*   **Do** use "Optical Alignment." Because of the large rounded corners (1.5rem), text may need to be inset further (2rem) to feel centered.
*   **Do** use the `tertiary` (#4cd6fd) color sparingly for "Success" states or calm completion moments.

### Don't:
*   **Don't** use pure black (#000000) or pure white (#FFFFFF). Stick to the `surface` and `on_surface` tokens.
*   **Don't** use standard 4px or 8px corners. It breaks the "Sanctuary" aesthetic.
*   **Don't** use "Drop Shadows" that are grey. Shadows must be ambient, wide, and tinted with the `primary` or `secondary` hue.
*   **Don't** center-align long-form text. Keep it editorial—left-aligned and structured.