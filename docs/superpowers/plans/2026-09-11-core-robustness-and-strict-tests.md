# Core Engine Robustness, Self-Recovery & Strict Test Suite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade YTSpoofingStream core engine with Phase-Locked Loop (PLL) micro-rate synchronization, background tab/lifecycle resilience, seamless navigation teardown, and build a zero-dependency strict test suite using Node.js native `node:test` and `node:assert/strict`.

**Architecture:** Implement a 3-tier PLL controller in `StudioEngine774` (deadband $\le 35$ms, slew $35$–$350$ms at $\pm 1.5\%$, hard-seek $>350$ms) with Page Lifecycle hooks for tab unfreezing, track transition cleanup on YouTube SPA navigation, and an isolated mock harness for Chrome MV3 and DOM media APIs to execute fast unit and integration tests.

**Tech Stack:** Vanilla JavaScript (ES6+), Chrome Extension Manifest V3, Node.js v18+ built-in `node:test` and `node:assert/strict` (zero npm dependencies).

**Spec:** `docs/superpowers/specs/2026-09-11-core-robustness-and-strict-tests-design.md`

## Global Constraints
- Zero External Dependencies: No `node_modules` or npm install required. All tests run natively with `node --test`.
- Direct Unpacked Loading: `manifest.json` remains at root with zero bundlers or build steps.
- Vanilla ES6+ Compliance: Code must run in Chrome MV3 without transpilers.
- Strict Testing: Assertions must use `node:assert/strict` with comprehensive edge cases.

---

### Task 1: Test Infrastructure, Package Config & Chrome/DOM Mocks

**Files:**
- Create: `package.json`
- Create: `test/mocks/chrome.mock.js`
- Create: `test/mocks/dom.mock.js`
- Create: `test/helpers/test-utils.js`
- Create: `test/mocks/mocks.test.js`
- Create: `test/run.js`

**Interfaces:**
- Produces:
  - `createMockChrome()`: Mock object providing `storage.local`, `storage.session`, `runtime`, `tabs`, `alarms`, `declarativeNetRequest`.
  - `createMockDom()`: Mock object providing `document`, `window`, `HTMLMediaElement` (`<video>`, `<audio>`), `CustomEvent`.
  - `setupTestEnv()` / `teardownTestEnv()`: Sets up global `chrome`, `window`, `document`, `location`, `localStorage`, `sessionStorage`.

- [ ] **Step 1: Write the failing test for mock infrastructure**

```javascript
// test/mocks/mocks.test.js
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { createMockChrome } from './chrome.mock.js';
import { createMockDom } from './dom.mock.js';

describe('Test Infrastructure Mocks', () => {
  it('chrome.mock provides storage and messaging with strict responses', async () => {
    const chrome = createMockChrome();
    await chrome.storage.local.set({ key: 'val' });
    const res = await chrome.storage.local.get('key');
    assert.equal(res.key, 'val');
  });

  it('dom.mock provides HTMLMediaElement with clock and play/pause events', () => {
    const dom = createMockDom();
    const video = dom.document.createElement('video');
    let played = false;
    video.addEventListener('play', () => { played = true; });
    video.play();
    assert.equal(played, true);
    assert.equal(video.playbackRate, 1.0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/mocks/mocks.test.js`  
Expected: FAIL with `Cannot find module './chrome.mock.js'`

- [ ] **Step 3: Implement `package.json`, `chrome.mock.js`, `dom.mock.js`, `test-utils.js`, `run.js`**

Implement:
- `package.json`: Lightweight config with `"name": "ytspoofingstream"`, `"type": "module"`, `"scripts": { "test": "node --test test/**/*.test.js" }`.
- `test/mocks/chrome.mock.js`: In-memory storage, listener registries for `onMessage`, `onInstalled`, `onActivated`, `declarativeNetRequest`.
- `test/mocks/dom.mock.js`: `MockMediaElement` subclassing `EventTarget` with properties `currentTime`, `playbackRate`, `paused`, `muted`, `volume`, `src`, `play()`, `pause()`.
- `test/helpers/test-utils.js`: Helper functions to install globals into `globalThis`.
- `test/run.js`: Direct runner script printing execution summary.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/mocks/mocks.test.js`  
Expected: PASS (all tests pass)

- [ ] **Step 5: Commit**

```bash
git add package.json test/
git commit -m "test: add zero-dependency test harness and chrome/dom mocks"
```

---

### Task 2: Unit Tests for Stream URL Cleaner & Authentication Crypto

**Files:**
- Create: `test/unit/stream-cleaner.test.js`
- Create: `test/unit/auth-crypto.test.js`

**Interfaces:**
- Consumes:
  - `cleanStreamUrl(rawUrl)`: Strips streaming params (`range`, `rn`, `rbuf`, `ump`, `sabr`, `alr`, `sq`).
  - `sha1Hex(input)`: Computes SHA-1 hash in hex.
  - `getSapisidHash(origin, cookieGetter)`: Computes SAPISIDHASH, SAPISID1PHASH, SAPISID3PHASH.

- [ ] **Step 1: Write the failing tests for Stream Cleaner and Auth Crypto**

```javascript
// test/unit/stream-cleaner.test.js
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('Stream URL Sanitizer', () => {
  it('strips streaming params while preserving security params', () => {
    // We will extract/import cleanStreamUrl
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/unit/stream-cleaner.test.js test/unit/auth-crypto.test.js`  
Expected: FAIL

- [ ] **Step 3: Implement unit tests with pure utility exports/helpers**

- Test URL sanitization:
  - Verify removal of `range`, `rn`, `rbuf`, `ump`, `sabr`, `alr`, `sq`.
  - Verify preservation of `expire`, `ei`, `ip`, `sig`, `id`, `itag`.
- Test Auth Crypto:
  - Verify SHA-1 hex calculation against known test vectors.
  - Verify prefix mapping: `SAPISID` -> `SAPISIDHASH`, `__Secure-1PAPISID` -> `SAPISID1PHASH`, `__Secure-3PAPISID` -> `SAPISID3PHASH`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test test/unit/stream-cleaner.test.js test/unit/auth-crypto.test.js`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add test/unit/stream-cleaner.test.js test/unit/auth-crypto.test.js
git commit -m "test: add unit tests for stream cleaner and auth crypto"
```

---

### Task 3: Unit Tests for Protobuf SABR Rewriter

**Files:**
- Create: `test/unit/protobuf-sabr.test.js`

**Interfaces:**
- Consumes:
  - `pbReadVarint(bytes, off)`: Reads protobuf varint.
  - `pbEncodeVarint(value)`: Returns Uint8Array of varint.
  - `pbReadTag(bytes, off)`: Reads field number and wire type.
  - `pbParseMessage(bytes, start, end)`: Parses protobuf message tree.
  - `sabrRewritePreferredAudio(bytes, targetItags, newItag, newLastModified)`: Rewrites SABR binary message.

- [ ] **Step 1: Write failing tests for SABR protobuf encoding/decoding and rewriting**

```javascript
// test/unit/protobuf-sabr.test.js
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('Protobuf SABR Rewriter', () => {
  it('encodes and decodes varints correctly', () => {
    // test varint 0, 1, 127, 128, 251, 774, 300000
  });

  it('rewrites target itag 251 to 774 in synthetic SABR protobuf message', () => {
    // create protobuf message containing itag 251
    // call sabrRewritePreferredAudio
    // assert rewritten buffer contains 774
  });

  it('handles malformed or truncated buffer safely without crash', () => {
    // pass corrupted buffer
    // assert returns original buffer or null without throwing
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/unit/protobuf-sabr.test.js`  
Expected: FAIL

- [ ] **Step 3: Implement tests using SABR functions**

Implement complete test coverage for all wire types, varints, and SABR message reconstruction.

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test test/unit/protobuf-sabr.test.js`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add test/unit/protobuf-sabr.test.js
git commit -m "test: add unit tests for protobuf sabr rewriter"
```

---

### Task 4: Implement Core PLL Micro-Rate Sync Controller & Unit Tests

**Files:**
- Modify: `src/content/inject.js` (Update `StudioEngine774` sync logic)
- Create: `test/unit/pll-sync.test.js`

**Interfaces:**
- `calculatePllSyncRate(audioTime, videoTime, videoRate, currentRate)`:
  - Inputs: `audioTime` (number), `videoTime` (number), `videoRate` (number), `currentRate` (number).
  - Outputs: `{ targetRate: number, hardSeek: boolean, phaseDiff: number }`.
- `StudioEngine774._syncClock(video)`:
  - Evaluates phase drift with deadband ($\le 35$ms), slew range ($35$–$350$ms), hard-seek ($> 350$ms).

- [ ] **Step 1: Write the failing unit test for PLL Sync Controller**

```javascript
// test/unit/pll-sync.test.js
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('PLL Micro-Sync Controller', () => {
  it('locks phase in deadband (|drift| <= 35ms) matching video rate', () => {
    // drift = 0.020s -> targetRate === videoRate, hardSeek === false
  });

  it('slows audio by 1.5% when audio leads video (35ms < drift <= 350ms)', () => {
    // audio = 10.15s, video = 10.00s -> targetRate === videoRate * 0.985
  });

  it('speeds up audio by 1.5% when audio lags video (-350ms <= drift < -35ms)', () => {
    // audio = 9.85s, video = 10.00s -> targetRate === videoRate * 1.015
  });

  it('triggers hard seek when drift > 350ms', () => {
    // audio = 11.00s, video = 10.00s -> hardSeek === true
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/unit/pll-sync.test.js`  
Expected: FAIL

- [ ] **Step 3: Implement PLL Controller in `src/content/inject.js`**

Implement:
- Define `SYNC_DEADBAND_S = 0.035`, `SLEW_MAX_S = 0.350`, `SLEW_RATE_DELTA = 0.015`.
- In `StudioEngine774`:
  - Calculate `drift = aTime - vTime`.
  - When `Math.abs(drift) <= SYNC_DEADBAND_S`: maintain `this.audio.playbackRate = userRate`.
  - When `drift > SYNC_DEADBAND_S && drift <= SLEW_MAX_S`: set `this.audio.playbackRate = userRate * (1 - SLEW_RATE_DELTA)`.
  - When `drift < -SYNC_DEADBAND_S && drift >= -SLEW_MAX_S`: set `this.audio.playbackRate = userRate * (1 + SLEW_RATE_DELTA)`.
  - When `Math.abs(drift) > SLEW_MAX_S`: `this.audio.currentTime = vTime; this.audio.playbackRate = userRate;`.
- Export/expose `calculatePllSyncRate` helper for test verification.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/unit/pll-sync.test.js`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/content/inject.js test/unit/pll-sync.test.js
git commit -m "feat(engine): implement PLL micro-rate synchronization controller"
```

---

### Task 5: Implement Lifecycle, Background Tab & Shorts/Playlist Teardown

**Files:**
- Modify: `src/content/inject.js`
- Create: `test/integration/lifecycle-resilience.test.js`

**Interfaces:**
- `StudioEngine774.resetForNewTrack(newVideoId)`:
  - Halts audio, clears `.src`, cancels all active timers, resets state flags.
- `StudioEngine774.onVisibilityResume()`:
  - Checks immediate phase drift and resyncs without waiting for polling tick.

- [ ] **Step 1: Write the failing integration test for lifecycle & navigation**

```javascript
// test/integration/lifecycle-resilience.test.js
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

describe('Lifecycle & Navigation Resilience', () => {
  it('resets audio and cancels timers on resetForNewTrack', () => {
    // verify audio.src is cleared and playback stops
  });

  it('immediately aligns clocks when tab transitions from hidden to visible', () => {
    // simulate visibilitychange -> verify phase sync fires immediately
  });

  it('resets audio currentTime to 0 on Shorts loop detection', () => {
    // simulate video loop -> verify audio loop
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/integration/lifecycle-resilience.test.js`  
Expected: FAIL

- [ ] **Step 3: Implement Lifecycle & Teardown handlers in `src/content/inject.js`**

Implement:
- `resetForNewTrack(newVideoId)`: Clean DOM audio removal, clear `_waiterTimer`, `_watchdogTimer`, reset sync states.
- Listen for `visibilitychange`, `resume`, `pageshow`.
- Shorts loop detector in the playback loop.
- Hook into YouTube's `yt-navigate-start` event.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/integration/lifecycle-resilience.test.js`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/content/inject.js test/integration/lifecycle-resilience.test.js
git commit -m "feat(lifecycle): add background tab resilience and navigation teardown"
```

---

### Task 6: Failover State Machine & DeclarativeNetRequest Rules Tests

**Files:**
- Create: `test/integration/failover-engine.test.js`
- Create: `test/integration/dnr-rules.test.js`

**Interfaces:**
- Consumes:
  - `CLIENTS` array in `src/background/background.js`.
  - Hybrid failover logic in `src/background/background.js` and `src/content/inject.js`.

- [ ] **Step 1: Write failing tests for failover state machine & DNR rule generator**

```javascript
// test/integration/failover-engine.test.js & dnr-rules.test.js
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('Hybrid Failover Engine', () => {
  it('fails over to TVHTML5 when YTM_HARVESTER returns error', async () => {
    // simulate harvest failure -> verify TV fallback
  });

  it('falls back cleanly to native 251 when both providers have no 774', async () => {
    // verify error code NO_774_STREAM and native audio preserved
  });
});

describe('DeclarativeNetRequest Rules', () => {
  it('generates unique deterministic IDs and headers for all 5 clients', () => {
    // verify rule ID generation and headers
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/integration/failover-engine.test.js test/integration/dnr-rules.test.js`  
Expected: FAIL

- [ ] **Step 3: Implement integration tests**

Implement comprehensive test coverage for failover switching, recursion guards, and DNR static/session rule structure.

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test test/integration/failover-engine.test.js test/integration/dnr-rules.test.js`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add test/integration/failover-engine.test.js test/integration/dnr-rules.test.js
git commit -m "test: add integration tests for failover engine and dnr rules"
```

---

### Task 7: Full Test Suite Execution & Documentation Update

**Files:**
- Modify: `README.md`
- Modify: `README-vi.md`

- [ ] **Step 1: Run complete test suite and syntax verification**

Run:
```bash
node --test test/**/*.test.js
node -c src/**/*.js
```
Expected: 100% tests passing, zero syntax errors.

- [ ] **Step 2: Update README.md and README-vi.md**

Document:
- Phase-Locked Loop (PLL) micro-sync architecture.
- Background tab unfreezing & Shorts lifecycle management.
- Test instructions: How to run `npm test` or `node --test` with zero dependencies.

- [ ] **Step 3: Commit**

```bash
git add README.md README-vi.md
git commit -m "docs: document PLL micro-sync architecture and testing suite"
```
