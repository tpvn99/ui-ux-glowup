# Scenario templates and working journeys

A scenario states a **goal** and checks it was reached, not just that the buttons exist. Run it with `scenario.mjs`; add `--profile keyboard` to do the same journey with no mouse (every click and field is reached with Tab, radio groups with the arrow keys), and read how many Tab presses it took.

| File | Use |
|---|---|
| `pricing-understand-offer.json`, `settings-change.json`, `product-choose-size.json` | Working journeys against `pricing.html`, `settings.html` and `product-page.html` (the tests run them, with and without a mouse) |
| `*.template.json` | Starting points for a real project: find a product, reach payment, change a setting, administer an account, understand an offer. Every `REPLACE:` must be filled with your own selectors; never put real credentials or real customers in a file (use `login.mjs` and `--storage-state`, and stop before paying or saving) |

Fields: `goal` (a sentence; the last step must be an `expect`, or nothing proves it was reached), `maxActions` (a budget: the journey fails if it takes more), `profile` (`mouse` or `keyboard`).

An automatic journey tells you whether the goal can be reached and how much effort it takes. It does not tell you whether people understand the page, and it does not replace sessions with real users.
