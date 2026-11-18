# Screen reader walk-through (VoiceOver, TalkBack, NVDA)

No script here drives a real screen reader: it can only check what a screen reader would be given (names, roles, states, focus order). This is the short walk-through to do by hand on the main journey of a page. Allow 20 minutes the first time. Use a real device if you can.

## Start and stop

- **iPhone VoiceOver**: Settings → Accessibility → VoiceOver. Triple-click the side button to switch it on and off. Swipe right/left to move, double-tap to activate, three-finger swipe to scroll.
- **Android TalkBack**: Settings → Accessibility → TalkBack. Swipe right/left to move, double-tap to activate.
- **macOS VoiceOver**: Cmd+F5. **Windows NVDA** (free): install it, then Insert+Down arrow reads on; Tab and arrows move; Insert+Space toggles forms mode.

## The walk-through

1. **Page title and language.** On opening, is the page announced with a meaningful title, in the right language?
2. **Landmarks and headings.** Open the rotor / elements list (VoiceOver rotor, TalkBack reading controls, NVDA Insert+F7). Is there a main area, a navigation, a heading structure that tells the story of the page?
3. **Skip to the content.** Is the first thing a "skip to content" link? Does it work?
4. **Walk the main journey** with swipes or Tab only. For every control, write down what is announced: its **name**, its **role** (button, link, checkbox…) and its **state** (expanded, selected, checked, invalid).
5. **Images and icons.** Does every meaningful image have a useful description? Are decorative ones skipped?
6. **Forms.** Is every field announced with its label? Press submit empty: is the error announced, and does focus go to it or to the first invalid field? Does the message say how to fix it?
7. **Dynamic changes.** Add an item, filter a list, save a setting: is the result announced (a status message) without moving focus?
8. **Dialogs and menus.** Open one: does focus move inside, and is it announced as a dialog with a name? Escape closes it: does focus return where it was?
9. **Zoom and text size.** Set the text to the largest size: can the same journey still be done?

## Write down

| Step | What was announced | Problem? |
|---|---|---|
| 1 | | |
| … | | |

Anything marked as a problem is a finding the automatic checks cannot make; send it back with the screen reader, version and browser used, and it can become a new check or a new benchmark defect.
