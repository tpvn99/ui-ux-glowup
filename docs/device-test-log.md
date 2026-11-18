# Real device test log

Copy this page (or paste it into an issue), fill one block per device, and send it back. It turns the [real device checklist](real-device-checklist.md) into something that can be compared between runs. Fifteen minutes per device. Write what you saw, not what you expected.

**Page or app tested:** 
**Version of the skill (`doctor.mjs`):** 
**Date and who tested:** 

## Device block (one per device)

| Field | Answer |
|---|---|
| Device and model | e.g. iPhone 13, Pixel 7 |
| OS and browser versions | e.g. iOS 18.1 Safari, Android 15 Chrome 131 |
| Network | wifi / 4G / throttled |
| Assistive technology on | none / VoiceOver / TalkBack / larger text / dark mode |

| Check | Pass | Fail | What happened |
|---|---|---|---|
| Fits the width, no sideways scroll | | | |
| Text readable without zooming | | | |
| Tapping a field does not zoom the page | | | |
| Fixed bars do not hide content; address bar showing and hiding is fine | | | |
| Keyboard opening does not hide the field or the submit button | | | |
| Autofill works (email, address, password, code) | | | |
| Main journey completed, start to end | | | |
| Landscape works | | | |
| Back button does what a person expects | | | |
| Larger system text: nothing overlaps | | | |
| Dark mode: contrast holds | | | |

**Main journey tested** (one sentence, e.g. "find the price and start a free trial"): 
**Number of taps it took:** 
**Where I hesitated or got lost:** 

## What the automatic report said about the same page

Paste the `verify.mjs report` verdict and the "what was not tested" list. Then mark each automatic finding **confirmed** (you saw it on the device), **not reproduced** or **not seen**, and write down anything you found by hand that the report missed: that list is the most useful one.

| Automatic finding | Confirmed / not reproduced |
|---|---|
| | |

| Found by hand, missed by the report | Device |
|---|---|
| | |
