# Avoiding the "AI-generated" Look

People now recognize template AI sites in seconds, and trust them less. The audit flags the measurable tells (rules in brackets); the rest is on you.

## Visual tells → what to do instead
| Tell | Instead |
|---|---|
| Purple → blue / pink gradients on big surfaces [`ai-gradient`] | Brand color flat, or a same-hue subtle gradient (semi-flat) |
| Glassmorphism cards everywhere [`ai-glass`] | Solid surfaces + hairline borders; blur only on sticky bars/overlays |
| `rounded-3xl` on every box [`ai-radius`] | 8–12px cards, 6–8px controls; big radii on 1–2 hero elements |
| 3 identical icon + title + text cards [`ai-identical-cards`] | Bento with varied sizes, numbered list, real visuals per feature |
| Everything centered [`ai-centered`] | Left-aligned editorial layout; center only short hero/CTA blocks |
| Floating abstract 3D blobs, random spheres | Meaningful 3D objects from one consistent set, or real product UI/photos |
| Stock photos of people pointing at laptops | Real photos of the work/team/place; or no photo |
| Neon glows, drop shadows on everything | One elevation system: border + soft layered shadow |
| Same Lucide icons as every other site | Search wider with `scripts/find-icons.mjs` (Phosphor duotone, Solar, Tabler…) |
| Default Inter + default Tailwind grays, nothing else | A deliberate type pairing (e.g. editorial serif for headings) or tuned tracking/weights |

## Layout tells
- Hero: centered title "Transform your X" + 2 buttons + floating mockup. → Left-aligned, specific headline, proof next to the CTA, real product shot that bleeds.
- Every section the same height and structure. → Vary rhythm: split, bento, list, full-width quote, stats row.
- Logo cloud of fake brands, "Trusted by 10,000+ companies". → Real clients or none; precise numbers.
- Pricing with 3 identical cards and "Most popular" ribbon on a scaled card. → Emphasize with border + badge, not scale; comparison table.

## Copy tells [`ai-cliche`, `ai-emoji`]
"Transform your…", "Unlock…", "Elevate…", "Seamless", "Revolutionize", "Supercharge", "Next-level", "Innovative solutions", "In today's fast-paced world", "Boostez / Révolutionnez / Solution tout-en-un", emojis in headings and buttons.
→ Say what it does, for whom, with a number or a detail only this business has: "Boilers repaired the same day in Leeds — 1,200 callouts in 2025".

## Motion tells
Everything fades up on scroll, parallax on every image, typewriter headlines. → Motion only where it explains (a chart drawing, a toggle switching), 150–600ms, once, off for reduced-motion.

## When a "tell" is fine
Gradients, 3D and glass aren't banned — **generic** use is. A same-hue gradient on a CTA, a consistent 3D set in a SaaS hero, or blur on a sticky header are all fine when they're deliberate and consistent with the brand.
