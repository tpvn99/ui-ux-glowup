# Microcopy: errors, confirmations, empty states, 404

Small texts decide whether someone finishes the task. Check these four on every page that has a form, a list or a link.

## Form errors [`vague-error-message`]
- Say **what to correct and how**, next to the field, in text (not color alone): "Enter an email like name@company.com", "Saisissez dix chiffres, par exemple 03 83 00 00 00".
- Never only "Invalid field", "Error", "Something went wrong", "Champ invalide".
- Keep what the person typed. Link the message to the field with `aria-describedby`; `role="alert"` for errors that appear after submit.
- A server failure says what happened, that nothing was lost, and what to do: "We could not send your message. Your text is still here — try again, or call 01 23 45 67 89."

## Confirmations after sending
- Say what was received and **what happens next, with a delay**: "Request received. We reply within one working day at lea@example.com."
- Show it where the form was, keep the page; offer one next step (back to the service, add to calendar).
- A destructive action names the thing: "Delete invoice INV-0042?", then "Invoice deleted · Undo".

## Empty states
- One sentence on what will appear here, one action to make it appear: "No quotes yet. Create your first quote."
- A filter with no result says so and offers to clear it; it is not the same message as a new account.
- No illustration needed; never a blank area.

## 404 page
- Say the page was not found, in the site's voice, without blaming the visitor.
- Offer the search (if any), the 3–5 most used pages and the home page; keep the normal header and footer.
- Return a real 404 status, and do not index it.

## Checklist
- [ ] Every error says what to correct
- [ ] Every form has a confirmation that says what happens next
- [ ] Every list, table and search has an empty state with an action
- [ ] The 404 page exists and leads somewhere
