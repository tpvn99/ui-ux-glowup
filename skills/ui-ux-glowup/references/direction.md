# Direction first: plan, check, build, critique

A page looks designed when its choices come from **this** subject, not from a kit. Principles adapted from Anthropic's public `frontend-design` skill. The user's own words always win over any rule here, including when they ask for a "tell".

## 1. Ground it in the subject
Write three lines before anything else: **who** it is for, **what** the page must make them do, and the **vocabulary of the field** (materials, objects, jargon, rituals). A resale tracker speaks price tags, drops, margin and sold stamps; a joiner speaks grain, joints and shop floor. Distinctive choices come from there.

## 2. Open with the most characteristic thing
The first screen shows the subject's own thing: the live product, a real photo of the work, a tool people can try, the number only this business has. "Big number + small label + gradient accent" is the default; use it only if it truly is the best opener.

## 3. Plan in tokens (compact, written down)
- **Color**: 4–6 named hex values (base, surface, text, muted, one accent, one signal). Brand colors are kept; *how* they are used is the design.
- **Type**: one family or two clearly different. Pick on purpose (optical sizes, widths, weights), set a scale of 6–9 sizes, tracking tighter on large sizes. Measure under 80 characters (serif slightly longer, with more line-height).
- **Layout**: one sentence plus an ASCII wireframe per section; say what is centered and what is left-aligned.
- **Principles**: 2–3 lines on what makes this page unlike the others.

## 4. Check the plan against the defaults
AI-made pages cluster on: cream + serif + terracotta; near-black + one acid accent; newspaper rules with zero radius; **the SaaS-card kit** (identical rounded cards, one radius and one soft shadow everywhere, gradient washes); **template chrome** (tracked ALL-CAPS label above every heading, "A · B · C" meta strings, labels with a spaced em dash, tinted near-black, mono for every small label, "→" on every button). Work the plan through as if for another brand: if you land in the same place, change that part and say what and why.

## 5. Spend boldness in one place
One memorable element (the product shot, one type treatment, one colored section); everything around it quiet. Structural devices carry information or go: numbering only for real sequences, labels only if they say something, dividers only if they separate.

## 6. Build, then critique
- Mind CSS specificity (section classes vs element classes cancelling padding and margins).
- Floor: responsive to 390px, visible focus, reduced motion respected, AA contrast.
- Screenshot, look, then **remove one accessory** (the decoration nobody would miss).
- Keep a 3-line note of what was tried (palette, type, layout) in the recap's "Directions taken".

## Copy is design
Active voice, plain verbs, sentence case. A button says what happens ("Save changes", not "Submit") and keeps its name through the flow. Errors say what went wrong and how to fix it. Specific beats clever.
