# Porthole for YouTube

<img src="assets/logo-512.png" alt="Porthole logo" width="96" align="right">

Pop YouTube videos out into a floating, always-on-top window with its own controls. Chrome / Chromium 116+, Manifest V3.

> Not affiliated with, endorsed by, or sponsored by YouTube or Google.

## Develop

```sh
npm install
npm run dev        # rebuild on change into dist/
npm run build      # one-off build into dist/
npm run typecheck
npm test
```

Load it: `chrome://extensions` → enable **Developer mode** → **Load unpacked** → pick `dist/`. After rebuilding, click the reload icon on the extension card, then reload any open YouTube tabs.

## Layout

| Path | What |
|---|---|
| `src/content/main.ts` | Runs in the **page world**. Player button, hotkey, Document Picture-in-Picture lifecycle. |
| `src/content/pip-ui.ts` | Controls and styles rendered inside the floating window. |
| `src/content/isolated.ts` | Runs in the **extension world**. Relays `chrome.storage` settings to `main.ts` via CustomEvents. |
| `src/background/background.ts` | Toolbar icon opens the options page. Nothing else. |
| `src/options/` | Settings page. |
| `src/shared/` | Settings schema/validation, DOM helpers (no `innerHTML`: YouTube enforces Trusted Types). |
| `assets/` | `icon.svg` source + generated PNG icons. `npm run assets` regenerates icons and store art. |
| `store/` | Chrome Web Store listing copy, permission justifications, promo art. |
| `docs/privacy.html`, `PRIVACY.md` | Privacy policy (host `docs/` with GitHub Pages). |

## How it works

`window.documentPictureInPicture.requestWindow()` opens an always-on-top window. Porthole moves YouTube's real `<video>` element into it (no reload, no re-buffering), covers the empty player with a "Playing in Porthole" card, and moves the video back when the window closes. Captions are DOM elements rather than part of the video, so they're mirrored across with a `MutationObserver`.

## Release

1. Bump `version` in `package.json`.
2. `npm run package` runs typecheck, tests and build, then writes `release/porthole-for-youtube-vX.Y.Z.zip`.
3. Upload the zip in the Chrome Web Store Developer Dashboard. Listing copy is in `store/listing.md`.

## License

MIT
