# References by sector

`sites.md` leans toward SaaS and developer tools. Most clients are not that. Pick the sector first, then borrow from sites that solve **the same visitor problem**. Sites change: check them live when you can, and borrow mechanics, never copy, logos, illustrations or text.

## Variety check (before you pick references)

- Is the product a developer tool or SaaS? Only then is the dark, hairline, bento "Linear / Vercel" look a candidate. Otherwise it is probably the wrong register.
- Name the visitor's anxiety (will I be understood, is it safe, is it worth the price, can I book now?) and pick the references that calm *that*.
- Take at least one reference from outside tech, and one that is **sober and functional** rather than expressive.
- If two projects you did this month look alike, change one decision on purpose: type pairing, density, or the color of the page itself.

## Style spectrum

| Register | Looks like | Fits |
|---|---|---|
| **Sober, functional** | Plain type, generous contrast, one accent, content first, few images | Public services, health information, legal, finance tools, back-offices |
| **Warm, reassuring** | Light tinted page, rounded shapes, real people, friendly serif or humanist sans | Clinics, education, local services, small-business software |
| **Editorial** | Serif headlines, big photography, strong grid, long reading | Media, culture, fashion, hospitality, research |
| **Expressive, playful** | Saturated color, illustration, mascots, big motion | Consumer apps, learning, food, events |
| **Technical, dense** | Dark or neutral, monospace details, product UI as hero | Developer tools, analytics, infrastructure |

## Sectors

**Health, clinics, care**: the visitor is worried and needs to act (book, call). Calm, accessible, plain words.
- *Zocdoc*: search by specialty and place, availability visible before you commit.
- *One Medical*: reassurance first, one clear "book" path, real staff.
- *NHS (nhs.uk)*: plain content pages, symptom-first navigation, strong accessibility; the model for health *information*.
- Borrow: phone and booking always reachable, opening hours and location above the fold, named practitioners. Avoid: stock smiles, medical claims without a source, tiny grey text.
- Example: `local-business.html`, `clinic.html`.

**Public sector, associations, non-profits**: the visitor has a task or a cause.
- *GOV.UK*: one question per page, plain language, task-first links, no decoration.
- *charity: water*: one story, one donate action, photography that shows outcomes.
- Borrow: the task as the heading ("Renew your passport"), clear next step, honest numbers with sources. Avoid: hero sliders, vague mission statements, five competing buttons.

**Banking, insurance, consumer finance**: the visitor fears hidden cost and mistakes.
- *Wise*: the calculator is the hero, fees stated up front.
- *Monzo*: friendly voice, one strong brand color, plain explanations of money features.
- *Lemonade*: conversational quote flow, progress shown.
- Borrow: price and rules visible before sign-up, step-by-step flows, security stated once and specifically. Avoid: invented ratings, vague "bank-grade security", dark patterns around cancellation. Combine with the *Fintech* section of `sites.md` for B2B.

**Real estate**: the visitor compares and filters.
- *Zillow*, *Redfin*: map and list side by side, filters that stay visible, price and key facts on every card.
- *Sotheby's International Realty*: large photography, restrained type, for high-end listings.
- Borrow: one card format (photo, price, 3 facts), saved search, "contact the agent" always visible. Avoid: slow carousels, stock skyline photos instead of the real properties.

**Travel, hospitality, tourism**: the visitor is imagining a place and dates.
- *Airbnb*: the search bar is the hero, photos carry the page.
- *Aman*: slow, photo-led luxury, almost no UI.
- *Lonely Planet*: editorial guides, practical info beside the inspiration.
- Borrow: dates and guests first, total price shown, honest photography, practical info (access, hours) next to the dream. Avoid: fake urgency ("2 people looking"), cluttered price tables.

**Education, learning**: the visitor wants to know where this leads and how hard it is.
- *Duolingo*: playful, progress and streaks, a mascot with a purpose.
- *Khan Academy*: clear paths by level and subject, calm.
- *Coursera*: catalog with strong filters, outcomes and duration on each card.
- *MasterClass*: cinematic video-led hero for aspirational learning.
- Borrow: duration, level and outcome on every course card, visible progress, a sample lesson before sign-up. Avoid: invented enrollment numbers and testimonials.

**Fashion, beauty, retail**: the visitor wants to see the product and trust the brand.
- *SSENSE*: stark editorial grid, product-led.
- *Glossier*: minimal, soft palette, product and real people.
- *Everlane*: transparency about materials and price.
- *Aesop* (also in `sites.md`): quiet, text-led, generous space.
- Borrow: consistent product photography, size and delivery info near the buy button, one filter bar. Avoid: popups on arrival, autoplay video with sound.

**Media, publishing, blogs**: the visitor came to read.
- *The Guardian*, *NYT*: clear hierarchy of importance in a dense front page.
- *The Pudding*: one story with visuals built into the text.
- *Medium*: reading comfort (measure, size, contrast) above everything.
- Borrow: serif body at 60–70 characters, a front page that shows importance by size, clear sections, readable dates. Example: `article.html`. Avoid: ads or newsletters that cover the text, infinite scroll without landmarks.

**Professional services (legal, consulting, accounting, architecture)**: the visitor looks for competence and a person to call.
- Borrow: named people with roles, a short list of what they do and for whom, case outcomes without confidential detail, a contact path that names who answers and when. Sober register, serif or neutral sans, one accent. Avoid: stock handshakes, "leading provider" claims with no proof.

**Food, restaurants, local retail**: the visitor wants hours, menu, and to order or reserve.
- *Sweetgreen*: food photography, ordering flow that starts on the home page.
- Borrow: opening hours, address and phone in the header on mobile, the menu as text (not a PDF image), one primary action (order or reserve). Example: `local-business.html`.

**Events, culture, museums**: the visitor needs date, place, price, tickets.
- Borrow: a dated list or calendar as the home content, a ticket button on every event, access and accessibility information, photography of the actual venue.

**SaaS, developer tools, dashboards**: see `sites.md` (Linear, Stripe, Vercel, Raycast…) and the dashboard examples.

## Matching an example

| Sector | Start from |
|---|---|
| SaaS, apps | `hero-linear.html`, `features-stripe.html`, `pricing.html` |
| Small business software, B2B services | `smb-light.html` |
| Trades, local services, health | `local-business.html`, `clinic.html` |
| Back-office, lists and tables | `dashboard-shell.html`, `data-table.html` |
| E-commerce | `product-page.html` |
| Media, blogs, documentation | `article.html` |
| Account, admin | `settings.html`, `auth.html` |
