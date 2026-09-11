# Design Specification: Project Restructure & Hidden Scrollbar

**Date:** 2026-09-11  
**Project:** YTSpoofingStream  
**Target:** Chrome Extension Manifest V3  

## 1. Overview
This specification outlines the architectural restructuring of the YTSpoofingStream Chrome Extension to adhere to standard Chrome Extension folder structure best practices and implements custom CSS rules to cleanly hide scrollbars across the extension popup while preserving 100% of scrolling functionality (mouse wheel, touch, touchpad gestures, and keyboard navigation).

## 2. Goals & Constraints
- **Zero External Dependencies:** Remain 100% vanilla ES6+ JavaScript, with no bundlers, webpack, or npm dependencies.
- **Direct Unpacked Loading:** `manifest.json` stays at the repository root so developers and users can continue to load the extension directly via `chrome://extensions` ("Load unpacked").
- **Functional Integrity:** Ensure all communication channels (Service Worker <-> Isolated World Content Script <-> MAIN World Injected Script <-> Harvester Offscreen Document) remain intact with all updated relative path references.
- **Cross-browser Hidden Scrollbar:** Scrollbar is visually completely hidden in popup and inner scroll areas (`.log`, etc.), while preserving mousewheel, trackpad, and keyboard scrolling.

## 3. Directory Layout

### Before:
```
YTSpoofingStream/
├── manifest.json
├── background.js
├── inject.js
├── bridge.js
├── ytm_harvester_cs.js
├── harvester.html
├── harvester.js
├── popup.html
├── popup.js
├── icon16.png, icon48.png, icon128.png, logo.svg
└── docs & meta
```

### After:
```
YTSpoofingStream/
├── manifest.json              # Extension manifest (MV3)
├── assets/
│   └── icons/                 # Extension icons and graphics
│       ├── icon16.png
│       ├── icon48.png
│       ├── icon128.png
│       └── logo.svg
├── src/
│   ├── background/
│   │   └── background.js      # Service worker: InnerTube resolver & DNR ruleset
│   ├── content/
│   │   ├── bridge.js          # ISOLATED world bridge
│   │   ├── inject.js          # MAIN world player engine & clock sync
│   │   └── ytm_harvester_cs.js# MAIN world harvester frame script
│   ├── offscreen/
│   │   ├── harvester.html     # Offscreen document container
│   │   └── harvester.js       # Offscreen harvester logic
│   └── popup/
│       ├── popup.html         # Clean HTML popup structure
│       ├── popup.css          # Extracted styles with hidden scrollbar rules
│       └── popup.js           # Popup settings & telemetry UI logic
├── README.md & README-vi.md   # Updated documentation
└── CONTRIBUTING.md            # Updated architectural map
```

## 4. Technical Details

### 4.1. Hidden Scrollbar Styling
In `src/popup/popup.css`:
```css
/* Universal scrollbar hiding while preserving scrolling interaction */
html, body, * {
  -ms-overflow-style: none;  /* IE and Edge */
  scrollbar-width: none;     /* Firefox */
}

*::-webkit-scrollbar,
html::-webkit-scrollbar,
body::-webkit-scrollbar {
  display: none;             /* Chrome, Safari, Opera */
  width: 0;
  height: 0;
}
```
All elements with `overflow-y: auto` (e.g. `body`, `.log`) remain naturally scrollable without taking any screen estate with scrollbars.

### 4.2. Path Reference Updates
1. `manifest.json`:
   - `icons`: `"assets/icons/icon*.png"`
   - `action.default_icon`: `"assets/icons/icon*.png"`
   - `action.default_popup`: `"src/popup/popup.html"`
   - `background.service_worker`: `"src/background/background.js"`
   - `content_scripts`:
     - `inject.js` -> `"src/content/inject.js"`
     - `bridge.js` -> `"src/content/bridge.js"`
     - `ytm_harvester_cs.js` -> `"src/content/ytm_harvester_cs.js"`
2. `src/background/background.js`:
   - Offscreen document creation path: `url: 'src/offscreen/harvester.html'`
3. `src/popup/popup.html`:
   - Link stylesheet `<link rel="stylesheet" href="popup.css">`
   - Include script `<script src="popup.js"></script>`
4. `src/offscreen/harvester.html`:
   - Reference `<script src="harvester.js"></script>` (relative to `src/offscreen/`)

## 5. Verification Plan
- Syntax check all relocated JS scripts (`node -c <file>`).
- JSON parse verification for `manifest.json`.
- HTML structure check for `popup.html` and `harvester.html`.
- Verification of scrollbar rules in `popup.css`.
