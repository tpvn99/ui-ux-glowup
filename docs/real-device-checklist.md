# Real device checklist

`--device "iPhone 15"` and `cross-browser.mjs` reproduce a phone's screen size, pixel ratio, touch and engine. They are **not** phones. These are the things only a real iPhone, Android phone and a real screen reader show. Allow 15 minutes per device for the main journey.

## On a real iPhone (Safari)

- [ ] The page fits with no sideways scroll; text is readable without zooming.
- [ ] Tapping a field does not zoom the page (inputs at 16px or more).
- [ ] The fixed header and bottom bars do not cover content when the address bar shows and hides; `100vh` / `dvh` layouts are not cut off.
- [ ] The keyboard opening does not hide the field being typed in or the submit button.
- [ ] Autofill works for email, address and password (and one-time codes).
- [ ] Scroll is smooth; nothing jumps when images load.
- [ ] Add to Home Screen / share sheet show the right title and icon.
- [ ] Rotate to landscape: nothing is lost behind the notch or bars.

## On a real Android phone (Chrome)

- [ ] The same list, on a low-end device if you have one (the performance numbers here are simulated).
- [ ] The system Back button does what a person expects (closes the menu or dialog first).
- [ ] Font size set to Large in system settings: nothing overlaps or is cut off.
- [ ] Dark mode on: contrast holds.

## With a screen reader

- [ ] **iPhone VoiceOver** (Settings → Accessibility): swipe through the main journey; every control has a name, order makes sense, errors are announced.
- [ ] **Android TalkBack**: the same.
- [ ] **Desktop** (VoiceOver on macOS, NVDA on Windows): headings list, landmarks, form errors and status messages (`role="status"`) are announced.
- [ ] Zoom the browser to 200% and 400%: nothing is clipped; the page still works.

## On a slow connection

- [ ] Throttle to 3G in the browser's developer tools, or use a phone in a bad coverage area: the main content appears, and the page still works when an image or script fails to load.

## Roles and permissions

- [ ] Sign in as each role with a real test account: each sees what it should and nothing else.
- [ ] As a role that must not delete or edit, call the endpoint directly: the **server** refuses. A hidden button is not protection (`roles.mjs` only checks the interface).

Write down the device, the OS and browser versions, and what failed. The automatic reports say what was not tested; this list is how those gaps get covered.
