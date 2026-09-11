# Design Specification: Core Engine Robustness, Self-Recovery & Strict Zero-Dependency Test Suite

**Date:** 2026-09-11  
**Project:** YTSpoofingStream  
**Target:** Chrome Extension Manifest V3  
**Status:** Approved by User  

---

## 1. Executive Summary
This specification defines the architectural enhancements for the **YTSpoofingStream** Chrome Extension, specifically upgrading the core playback engine (`StudioEngine774`) with a Phase-Locked Loop (PLL) micro-rate synchronization controller, background tab resilience via Page Lifecycle APIs, track transition teardown for YouTube SPA/Shorts/Playlists, and introducing a comprehensive zero-dependency strict test suite using Node.js native `node:test` and `node:assert/strict`.

---

## 2. Goals & Constraints

### 2.1. Goals
- **Lip-Sync Precision via PLL Micro-Rate Sync**: Eliminate perceived lip-sync drift (50ms – 1400ms) without audible pitch distortion and without jarring buffer-dump hard seeks.
- **Background Tab & Page Lifecycle Resilience**: Automatically detect and eliminate desync upon tab unfreezing or switching back from background tabs (`visibilitychange`, `resume`, `pageshow`).
- **Seamless Playlist & Shorts Navigation**: Instantly halt old audio streams, teardown dangling timers, and reset playback states on `yt-navigate-start` to avoid double-audio playback or memory leaks.
- **Multi-Tier Watchdog & Network Stall Recovery**: Gracefully handle network hiccups using exponential backoff (3 attempts: 500ms, 1000ms, 2000ms), coordinated frame-holding, and automatic failover (`YTM_HARVESTER` <-> `TVHTML5` -> native 251 fallback).
- **Strict Zero-Dependency Test Suite**: Provide 100% automated test coverage for core math, protobuf SABR rewriting, stream URL cleaning, DNR rules, failover state machine, and lifecycle resilience using built-in `node:test` and `node:assert/strict`.

### 2.2. Constraints
- **Zero External Dependencies**: Must NOT require `node_modules` or npm installations to run tests or load the extension. Tests must execute directly via `node --test` on native Node.js (v18+).
- **Chrome MV3 Compatibility**: Preserve direct unpacked loading via `chrome://extensions` with `manifest.json` at root.
- **Vanilla ES6+ Compliance**: Keep all extension code compatible with native browser runtime without transpilers, bundlers, or polyfills.

---

## 3. Architecture & Core Engine Upgrades

### 3.1. Phase-Locked Loop (PLL) Micro-Rate Drift Controller
In `src/content/inject.js`, replace the coarse hard-seek threshold (`absDiff > 1.5s`) with a 3-tier PLL controller:

1. **Deadband Range ($\le 35\text{ms}$)**:
   - When $|t_{\text{audio}} - t_{\text{video}}| \le 0.035\text{s}$, the audio is locked in phase.
   - Set `audio.playbackRate = video.playbackRate`.
   - Clear any active slew state.

2. **Micro-Slew Slew Range ($35\text{ms} < \text{drift} \le 350\text{ms}$)**:
   - When audio leads video ($\text{drift} > +0.035\text{s}$):
     $$\text{audio.playbackRate} = \text{video.playbackRate} \times (1 - 0.015)$$
   - When audio lags behind video ($\text{drift} < -0.035\text{s}$):
     $$\text{audio.playbackRate} = \text{video.playbackRate} \times (1 + 0.015)$$
   - **Hysteresis**: Include a $10\text{ms}$ deadband cushion before toggling slew direction to prevent rate oscillation between ticks.

3. **Hard-Seek Realignment Range ($> 350\text{ms}$ or user seek)**:
   - When $|t_{\text{audio}} - t_{\text{video}}| > 0.35\text{s}$ or `video.seeking === true`:
     $$\text{audio.currentTime} = \text{video.currentTime}$$
     $$\text{audio.playbackRate} = \text{video.playbackRate}$$

---

### 3.2. Background Tab & Page Lifecycle API Resilience
- Add event listeners in `StudioEngine774`:
  - `document.addEventListener('visibilitychange')`
  - `window.addEventListener('pageshow')`
  - `document.addEventListener('resume')` (Page Lifecycle API)
- On un-hidden / resume:
  1. Calculate immediate phase delta $\Delta t = |t_{\text{audio}} - t_{\text{video}}|$. If $\Delta t > 150\text{ms}$, immediately snap `audio.currentTime = video.currentTime`.
  2. If video is playing (`!video.paused`) and audio is paused (`audio.paused`), trigger `audio.play()`.
  3. Re-verify native video element silence (`muted = true`, `volume = 0`) to prevent dual-source echo.

---

### 3.3. Playlist & Shorts Track Transition Teardown
- Listen to YouTube SPA navigation events: `yt-navigate-start`, `yt-navigate-finish`, and video element `loadstart`.
- Implement `StudioEngine774.resetForNewTrack(newVideoId)`:
  - Immediately stop media: `this.audio.pause()`, `this.audio.removeAttribute('src')`, `this.audio.src = ''`.
  - Clear all timers (`_waiterTimer`, `_watchdogTimer`).
  - Reset state flags (`_isAudioBuffering`, `_isInternalVideoSync`, `_reconnectAttempts`, `_hasDispatchedEnded`).
- YouTube Shorts loop handling:
  - If `video.currentTime < 0.2` while the previous position was near video end, detect loop and immediately reset `this.audio.currentTime = 0`.

---

### 3.4. Multi-Tier Watchdog & Exponential Backoff
- Monitoring interval: 200ms cadence while video is active.
- **Tier 1 (Stall detection at 1.5s)**: If video advances but audio clock is stagnant, pause video temporarily to allow audio buffer replenishment.
- **Tier 2 (Stall recovery at 3s - 5s)**: Trigger `audio.play()`.
- **Tier 3 (Network error recovery at > 8s or MediaError)**:
  - Retry up to 3 times with exponential backoff: $500\text{ms} \times 2^{\text{attempt}}$ (500ms, 1000ms, 2000ms).
  - If retries are exhausted, trigger automatic runtime failover (`YTM_HARVESTER` <-> `TVHTML5`) or cleanly fallback to native YouTube stream 251 with clear telemetry status.

---

## 4. Strict Zero-Dependency Test Suite Architecture

### 4.1. Directory Structure
```
test/
├── mocks/
│   ├── chrome.mock.js            # Mock Chrome MV3 API (storage, runtime, DNR, tabs, alarms)
│   └── dom.mock.js               # Mock HTMLMediaElement (video/audio, play, pause, currentTime, rate, events)
├── helpers/
│   └── test-utils.js             # Environment setup, test isolation, event dispatchers
├── unit/
│   ├── pll-sync.test.js          # Unit tests: PLL math, slew rates, deadband, hysteresis, hard-seek
│   ├── protobuf-sabr.test.js     # Unit tests: Protobuf varint, tags, messages, SABR itag 774 rewrite
│   ├── stream-cleaner.test.js    # Unit tests: URL stream parameter stripper
│   └── auth-crypto.test.js       # Unit tests: SHA-1 SAPISID hash generation and prefixing
├── integration/
│   ├── failover-engine.test.js   # Integration tests: HYBRID_HQ smart failover state machine
│   ├── lifecycle-resilience.test.js # Integration tests: Visibilitychange, tab unfreezing, teardown
│   └── dnr-rules.test.js         # Integration tests: DNR rule generation for all spoofed clients
└── run.js                        # Test runner script (supports node test/run.js)
```

### 4.2. Test Specifications & Assertions

#### 1. `test/unit/pll-sync.test.js`
- Assert in-sync deadband ($\le 35\text{ms}$) maintains `audio.playbackRate === video.playbackRate`.
- Assert leading audio ($+150\text{ms}$) slows audio to `0.985 * video.playbackRate`.
- Assert lagging audio ($-150\text{ms}$) accelerates audio to `1.015 * video.playbackRate`.
- Assert hard drift ($> 350\text{ms}$) triggers `audio.currentTime = video.currentTime`.
- Assert hysteresis prevents rapid oscillation between ticks.

#### 2. `test/unit/protobuf-sabr.test.js`
- Assert `pbReadVarint` and `pbEncodeVarint` encode/decode multi-byte integers correctly.
- Assert `pbReadTag` properly parses wire types (0: varint, 2: length-delimited).
- Assert `sabrRewritePreferredAudio` replaces ITAG 251 with 774 while preserving binary length-delimited payloads and message structure.
- Assert truncated or corrupted buffers return gracefully without crashing.

#### 3. `test/unit/stream-cleaner.test.js`
- Assert query parameters `range`, `rn`, `rbuf`, `ump`, `sabr`, `alr`, `sq` are cleanly removed.
- Assert security and streaming parameters `expire`, `ei`, `ip`, `signature`, `sig` are preserved.

#### 4. `test/unit/auth-crypto.test.js`
- Assert `sha1Hex` produces standard 40-character hex output.
- Assert `getSapisidHash` formats SAPISID, 1PAPISID, and 3PAPISID headers correctly with corresponding prefixes (`SAPISIDHASH`, `SAPISID1PHASH`, `SAPISID3PHASH`).

#### 5. `test/integration/failover-engine.test.js`
- Assert `HYBRID_HQ` attempts primary source (`YTM_HARVESTER`).
- Assert when primary returns error or unplayable track, it automatically attempts alternate source (`TVHTML5`).
- Assert when both fail or neither has 774, it returns `NO_774_STREAM` and falls back to original native audio without throwing.

#### 6. `test/integration/lifecycle-resilience.test.js`
- Assert `visibilitychange` (`hidden` -> `visible`) triggers immediate phase check and resync.
- Assert `yt-navigate-start` executes track teardown (`audio.src = ''`, halts pending timers).
- Assert `stalled` event pauses master video to hold frame.

#### 7. `test/integration/dnr-rules.test.js`
- Assert ruleset generation assigns unique integer IDs to all 5 clients.
- Assert rules contain correct User-Agent, Referer, and Origin headers.

---

## 5. Verification & Execution Plan
1. **Automated Unit & Integration Tests**:
   - Command: `node --test test/**/*.test.js`
   - All tests must pass with 0 failures and 0 warnings.
2. **Syntax Validation**:
   - Command: `node -c src/**/*.js`
3. **Packaging & Script Integration**:
   - Add lightweight `package.json` with `"scripts": { "test": "node --test test/**/*.test.js" }` so `npm test` works out of the box with zero dependencies.
