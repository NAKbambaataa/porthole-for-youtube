# Chrome Web Store listing: copy and paste into the Developer Dashboard

## Store listing tab

**Name** (from manifest): Porthole for YouTube

**Summary** (from manifest `description`, max 132 chars):
> Pop YouTube videos out into a floating, always-on-top window with its own controls.

**Category:** Productivity (alt: Entertainment)
**Language:** English

**Detailed description:**

```
Keep watching while you work. Porthole pops any YouTube video out of its tab into a small floating window that stays on top of your other apps.

HOW IT WORKS
• Click the Porthole button in the player's control bar, or press Alt+P (Option+P on Mac).
• The video moves to a floating window. Same video, same position, no reload, no re-buffering.
• Drag it anywhere, resize it, put it on a second monitor.
• Close the window or press the shortcut again and the video snaps back into the tab.

FULL CONTROLS IN THE WINDOW
• Play/pause, seek bar, volume, playback speed
• Next and previous video in playlists
• Captions mirrored into the window
• Controls fade out while you watch
• Keyboard shortcuts: Space/K, ←/→ or J/L to skip, ↑/↓ volume, M mute, < > speed, Shift+N / Shift+P next/previous

YOURS TO CONFIGURE
• Change the keyboard shortcut
• Choose the starting window width and skip length
• Hide the player button if you only want the shortcut
• Optional: pop out automatically when you switch tabs (uses Chrome's auto picture-in-picture)

PRIVATE BY DESIGN
• No accounts, no analytics, no tracking, no ads
• Collects no data. Settings stay in Chrome's own storage.
• Runs only on youtube.com
• Needs just two things: access to youtube.com and storage for your settings

REQUIREMENTS
Chrome or Edge 116+ (or another Chromium browser with Document Picture-in-Picture). Works on regular YouTube watch pages.

Porthole is an independent project and is not affiliated with, endorsed by, or sponsored by YouTube or Google. YouTube is a trademark of Google LLC.
```

**Graphics (all in `store/assets/`):**
| Slot | File |
|---|---|
| Store icon 128×128 | `store-icon-128.png` |
| Small promo tile 440×280 | `promo-small-440x280.png` |
| Marquee promo 1400×560 (optional) | `promo-marquee-1400x560.png` |
| Screenshots 1280×800 (1 to 5) | see `store/screenshots/README.md` (you must capture these) |

**Official URL / homepage:** your GitHub repo URL
**Support URL:** your GitHub issues URL

## Privacy tab

**Single purpose description:**
> Move the YouTube video you're watching into a floating, always-on-top window (and back), with playback controls in that window.

**Permission justifications**

| Permission | Justification |
|---|---|
| `storage` | Saves the user's preferences (keyboard shortcut, starting window width, skip length, caption and control-hiding toggles). No other data is stored. |
| Host access: `https://www.youtube.com/*` (via content scripts) | Required to add the pop-out button to the YouTube player and to move the page's video element into the floating window, which is the extension's single purpose. YouTube is a single-page app, so the scripts load on all youtube.com pages and activate only on `/watch`. |

No other permissions are requested (no `tabs`, `activeTab`, `scripting`, `webRequest`, `cookies`, or `<all_urls>`).

**Remote code:** No, I am not using remote code.

**Data usage:** tick **none** of the collection categories (no personally identifiable info, health, financial, authentication, personal communications, location, web history, user activity, or website content collected or transmitted off-device).

Then tick all three certifications:
- I do not sell or transfer user data to third parties outside of the approved use cases
- I do not use or transfer user data for purposes unrelated to my item's single purpose
- I do not use or transfer user data to determine creditworthiness or for lending purposes

**Privacy policy URL:** the hosted `docs/privacy.html` (GitHub Pages: `https://<user>.github.io/<repo>/privacy.html`)

## Distribution tab
- Visibility: Public
- Regions: All regions
- Pricing: Free

## Notes for reviewers (Test instructions field)

```
No login or special account is needed.
1. Open any video, e.g. https://www.youtube.com/watch?v=dQw4w9WgXcQ
2. Click the Porthole button in the player's control bar (left of the fullscreen button), or press Alt+P (Option+P on Mac).
3. A floating window opens containing the video. Use its controls, or close it / click "Return video to tab" to put the video back.
The extension has no background network activity, no analytics, and loads no remote code. Settings are on the extension's options page (click the toolbar icon).
```
