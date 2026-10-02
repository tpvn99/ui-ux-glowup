# Avoiding the "AI-generated" Look

People now recognize template AI sites in seconds, and trust them less. The audit flags the measurable tells (rules in brackets); the rest is on you.

## The five tells people spot first (never ship these by default)
| Tell | Rule | Instead |
|---|---|---|
| **Pill / badge / "New" announcement above the H1**, often with a green dot ("Now live", "Available for work") [`ai-hero-pill`] | The page opens on the headline. No label, chip or announcement above it | Put the news in the headline or first paragraph; a real announcement goes in a slim top bar or the nav, not the hero |
| **Green or pulsing status dot** next to a label [`ai-status-dot`] | A dot means a real, live status in a product UI (Synced, Delivered). Never decoration | Nothing, or plain text |
| **Colored line on one side of a block** (left bar on cards, quotes, callouts; thick colored top rule on steps) [`ai-accent-border`] | No single-side accent borders | Hairline border all around, a background tint, a bigger number or heading — or nothing |
| **Icon in a tinted rounded square** repeated on every card [`ai-icon-tile`] | Not 3+ times in a row | Bare icon, larger and in ink color; or a real visual / product crop |
| **Gradient text** and **colored glows** [`ai-gradient-text`, `ai-glow`] | Text is solid ink; shadows are neutral | Emphasis by weight, size or a serif italic; one border + soft neutral shadow |

### Template chrome (measured by `ai-arrow-cta`, `ai-caps-label`, `ai-numbered-markers`, `ai-accent-word`, `ai-middot-meta`)
| Tell | Instead |
|---|---|
| "→" at the end of most buttons and links | Say what happens; an arrow only where direction matters (next, external) |
| Small tracked ALL-CAPS label above each heading | None, or a sentence-case label that carries information (category, date) |
| 01 / 02 / 03 on content that is not a sequence | Number steps and timelines only |
| One word of a headline in italic, color or another weight | One treatment for the whole headline |
| "A · B · C" meta strings everywhere | A short sentence, or a list |

Also drop: eyebrow labels above every section heading (keep one at most, only if it carries information such as a category or a date), "Trusted by" strips of unknown logos, scroll-triggered fade-up on everything.

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

Calibration: also avoid the defaults listed in `direction.md` §4 (cream + serif + terracotta, near-black + one acid accent, identical rounded cards with one radius and one shadow).

## When a "tell" is fine
Gradients, 3D and glass aren't banned — **generic** use is. A same-hue gradient on a CTA, a consistent 3D set in a SaaS hero, or blur on a sticky header are all fine when they're deliberate and consistent with the brand.
