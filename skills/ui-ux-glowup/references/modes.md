# Modes and levels

Ask for the mode first when it is not obvious; it decides whether any code changes.

## Mode: what happens to the code

| Mode | The user says | The agent does | Changes code? |
|---|---|---|---|
| **Audit only** | "audit", "what's wrong", "tell me what to improve" | `verify.mjs report <page> --out report.md` (or `.html`), then walks through *Fix first* | No |
| **Recommend** | "propose", "what would you change", "let me choose" | Audit, then a numbered list: each item = problem, proposed fix, files, risk. Waits for the user to pick numbers (or "all") | Only what was picked |
| **Apply** *(default for "improve", "redesign", "fix")* | "do it" | Backup, change, check, recap | Yes |

Audit only and Recommend never run `safeguard.mjs restore`, never edit, and say so in the recap. `verify.mjs report` is read-only on the product.

## Select what to improve

When the user names an area ("only the mobile menu", "just accessibility", "the pricing section"), write the scope in the brief as a list and touch nothing outside it. Anything found outside the scope goes under **Seen, not touched**. Areas map to categories of the report: Functionality, UX, Accessibility, Performance, Visual quality, Responsive, SEO.

## Level of intervention

These are the effort levels of `SKILL.md`, in plainer words:

| Level | Same as | Scope | Typical result |
|---|---|---|---|
| **Light** | Quick | One component, one bug, tokens or one global fix. No layout restructuring, no copy rewrite | A small diff, one targeted re-check |
| **Intermediate** | Standard | One page or section at a time: structure kept, hierarchy, spacing, components, states and mobile redone | A reviewable page-level diff |
| **Complete** | Full | Whole site or a new one: intake, inventory, references, rebuild, every check | New pages and shared components, with a full report |

The **modernity level** (Classic, Modern, Bold) is a separate choice: how far the visual language moves. A light intervention can still be Bold on one component.

## Always, whatever the mode

- Say which mode and level in one line at the start.
- Finish with **Directions taken**, including in audit-only mode (it then lists findings, not changes).
- After any change: `verify.mjs check <page> --dir <snapshot-dir>` and give the verdict, the categories at *error*, and **what was not tested**.
