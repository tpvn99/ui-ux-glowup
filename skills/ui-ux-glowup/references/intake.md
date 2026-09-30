# Intake Questionnaire

Use it in **Standard** and **Full** mode (skip it in Quick mode). Standard: ask only the 3–5 questions whose answers you can't infer — usually 2, 3, 4 and 7. Full: all of them. Ask **once, in a single message**, with multiple-choice answers the user can reply to in a few words ("1b, 2a, 3: keep the booking form"). Pre-fill what you already know (from the files, the URL, earlier messages) and only ask the rest. If the user skips a question, use the default and say so in the brief.

If the environment has a structured question tool (multiple-choice UI), use it for questions 1–6 and ask the rest as text.

## The questions

**1. Starting point**
- a) New site/app from zero
- b) Redesign of an existing site/app (send the URL, code or screenshots)
- c) Improve one page or one component

**2. What is it?** (sets the style family — see the table below)
- a) SaaS / tech startup / app
- b) Portfolio / agency / creative studio
- c) Business showcase site (trades, services, B2B, health, local business)
- d) E-commerce / product
- e) Dashboard / back-office / internal tool
- f) Other: …

**3. Main goal of the page** — a) get contacted / quotes · b) sell · c) sign-ups / trials · d) inform / reassure · e) get work done (app)

**4. Modernity level** — how far to push the look
- 1) **Classic** — sober, trustworthy, timeless (notaries, clinics, industry)
- 2) **Modern** *(default)* — current product-site standards, a touch of motion and depth
- 3) **Bold** — expressive type, bento, 3D, strong motion (tech, creative, youth brands)

**5. Visual assets**
- Brand: logo / colors / fonts? (never changed — only their usage)
- Imagery: a) real photos available · b) need stock placeholders · c) product UI to show · d) illustrations (3D / semi-flat) · e) none
- Icons: a) outline (Lucide/Tabler) · b) duotone/bold (Phosphor/Solar) · c) illustrated (Flaticon) · d) your choice

**6. Modes & data**
- Dark mode: a) no · b) automatic (follows the device) + toggle · c) dark only
- Charts / KPIs to show? a) no · b) a few KPIs · c) full analytics

**7. Must keep** — elements that can't disappear (booking form, phone in header, legal links, trackers, specific sections…). For a redesign, `scripts/inventory.mjs` lists everything on the current page; confirm what stays.

**8. Audience & SEO** — who visits (and on what device, mostly phone?), the city/area or niche to rank for, and 1–3 search phrases people actually type. Text is optimized for **readers first**; keywords only go where they fit naturally.

**9. Likes and dislikes** — 1–3 sites you like (and what about them), anything you don't want.

**10. Constraints** — stack (WordPress, React, Webflow…), deadline, pages needed.

## Style families (question 2) → starting direction

| Family | Direction | Typical references | Visuals | Charts |
|---|---|---|---|---|
| SaaS / tech | Bento grids, product UI shots, dark-friendly, crisp motion | Linear, Vercel, Stripe, Raycast | Clean 3D or rebuilt product UI | Dark, animated SVG, sparklines |
| Portfolio / agency | Minimal, giant editorial type, big work images, fluid transitions | Awwwards/Godly winners, Pentagram | Work itself, full-bleed | Rare; minimal |
| Business showcase | Clean, professional, trust and clarity: proof near CTAs, clear services | Aesop, Mercury, Stripe (process) | Real photos of the work/team | Simple KPIs (years, ratings) |
| E-commerce | Product first, sticky buy box, consistent photography | Aesop, Allbirds, Apple | Product photography (WebP) | Rare |
| Dashboard / app | Dense, calm, one primary action, fast scanning | Linear app, Stripe Dashboard, Vercel | Icons, data | KPI cards, donut, bars, sparklines |

Modernity level adjusts intensity inside the family: **Classic** drops 3D and most motion; **Bold** adds larger type, bento, micro-animations and depth. See `references/visuals.md`.

## Turn answers into a brief

Before designing, write the brief back in 6–8 lines and continue unless the user objects:

> **Brief** — Redesign · business showcase (plumber, Leeds) · goal: calls & quotes · modernity 2 (modern) · brand green #1f4d3a kept · real photos · outline icons (Tabler) · auto dark mode: no · keep: phone in header, quote form, Google reviews · SEO: "plumber Leeds", "emergency plumber Leeds" · references: Mercury (sobriety), Stripe (process steps).
