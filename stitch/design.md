# Design System Specification: Premium Calm

## 1. Overview & Creative North Star
The core objective of this design system is to combat procrastination not through urgency, but through **"The Focused Sanctuary."** 

Standard productivity apps often rely on bright, jarring colors and high-density lists that increase cognitive load. This system takes a "Premium Calm" approach, using an editorial-inspired layout that prioritizes breathing room and high-end aesthetics. We move beyond the "generic SaaS" look by utilizing intentional asymmetry—placing key metrics off-center to draw the eye—and deep tonal layering. The experience should feel like a high-end physical timepiece: precise, quiet, and valuable.

### The Creative North Star: "The Digital Curator"
Every screen is treated as a curated gallery of the user's time. We use expansive white space (black space, in this context) to frame a few high-impact elements, ensuring that "Focus" isn't just a feature, but the fundamental visual state of the application.

---

## 2. Colors & Surface Philosophy

The palette is rooted in the deep void of `#0F0F10`, accented by the warmth of a setting sun. This contrast represents the transition from the "void" of procrastination to the "glow" of active work.
The primary brand color is `#FF823C`. The secondary color is `#413f9a`, and an additional accent color for highlights is also `#413f9a`.

### The "No-Line" Rule
Traditional 1px borders create visual noise. In this system, **sectioning is achieved strictly through tonal shifts.** To separate a sidebar from a main feed, use `surface-container-low` against the `background`. If an element needs to feel distinct, use a subtle background change, never a stroke.

### Surface Hierarchy & Nesting
We treat the interface as a series of physical layers. Use the following hierarchy to define depth:
- **Base Level:** `surface` (`#131314`) — The infinite canvas.
- **Section Level:** `surface-container-low` (`#1c1b1c`) — Primary content areas.
- **Interactive Level:** `surface-container-highest` (`#353436`) — High-level cards or focused blocks.

### The Glass & Gradient Rule
For elements that need to feel "ethereal" (like active timers or meditation modals), apply **Glassmorphism**:
- **Background:** `surface_variant` at 40% opacity.
- **Effect:** `backdrop-blur: 24px`.
- **Primary CTA Texture:** Do not use flat orange. Apply a linear gradient from `primary` (`#ffb692`) to `primary_container` (`#ff823c`) at a 135-degree angle. This mimics the "glowing amber" effect found in high-end automotive displays.

---

## 3. Typography
We utilize **Inter** for its mathematical precision and neutral character, allowing the content to lead.

- **Display Scales (`display-lg` to `display-sm`):** Reserved for moments of achievement or deep focus (e.g., "00:25:00"). Use `letter-spacing: -0.02em` for a premium, tucked-in editorial feel.
- **Headline Scales:** Used for page headers. Pair these with intentional asymmetry—left-aligned with a large right margin to create a "breathing" layout.
- **Body & Labels:** Set in `on_surface_variant` (`#dec0b3`) to reduce contrast-induced eye strain. Only use `on_surface` (`#e5e2e3`) for active, focused text.

The hierarchy is built on **Weight and Scale**, not just color. A `headline-lg` in a thin weight is more authoritative than a small, bold label.

---

## 4. Elevation & Depth

### The Layering Principle
Forget shadows for standard cards. Achieve lift by placing a `surface-container-lowest` card on top of a `surface-container` background. This creates a "recessed" or "carved" look that feels integrated into the UI.

### Ambient Shadows
When an element must float (e.g., a "Start Task" FAB), use a "Sunset Glow":
- **Shadow:** `0px 20px 40px rgba(255, 182, 146, 0.08)`. 
- **Color:** Use a tinted shadow based on the `primary` color rather than black. This simulates light reflecting off the surface.

### The "Ghost Border" Fallback
If accessibility requires a container edge, use a "Ghost Border": `outline-variant` (`#574238`) at **15% opacity**. It should be felt, not seen.

---

## 5. Components

### Buttons
- **Primary:** Gradient fill (`primary` to `primary_container`). `xl` rounded corners (`1.5rem`). No border. Use `on_primary_fixed` (`#341100`) for text to ensure high-contrast readability against the glow.
- **Secondary (Meditation/Calm):** Fill with `secondary_container` (`#3630bf`). Use for "Wind Down" or "Deep Breath" actions.
- **Tertiary:** Text-only with `primary` color. No container.

### Focus Cards
**Strictly forbid divider lines.** 
Separate task items using a 16px vertical gap. Each task sits on a `surface-container-low` base. The "active" task uses a subtle `outline` (`#a68b7f`) at 10% opacity to highlight current priority without breaking the "No-Line" rule.

### Input Fields
- **State:** `surface-container-lowest` background.
- **Focus State:** No border change. Instead, transition the background to `surface-container-high` and change the label color to `primary`.

### Navigation (The "Orb")
Inspired by the reference image, use a floating, circular navigation element in the corner. It should utilize the **Glassmorphism** rule with a `primary` glow behind it to indicate it is the "source" of user energy.

---

## 6. Do's and Don'ts

### Do:
- **Use Intentional Asymmetry:** Align your titles to the left and your primary actions to the far right with significant "dead space" between them.
- **Embrace the Dark:** Let `surface` (`#131314`) occupy at least 60% of every screen to reduce cognitive load.
- **Use Soft Indigo for Logic:** Reserve `secondary` (`#c2c1ff`) for non-urgent information like "Total Hours Worked" or "Meditation Minutes."

### Don't:
- **Never use 1px solid borders:** It breaks the "Premium Calm" immersion and makes the app look like a generic dashboard.
- **Avoid Pure White:** Never use `#ffffff`. Use `on_surface` (`#e5e2e3`) for text to maintain the "Sunset" atmosphere.
- **No Sharp Corners:** Every component must use at least the `DEFAULT` (`0.5rem`) roundedness scale. Sharp corners represent tension; rounded corners represent calm.