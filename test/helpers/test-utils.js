// Helper to inject mock environment into globalThis for extension scripts

import { createMockChrome } from '../mocks/chrome.mock.js';
import { createMockDom } from '../mocks/dom.mock.js';

export function setupTestEnv(initialUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ') {
  const chrome = createMockChrome();
  const dom = createMockDom();
  dom.window.location.href = initialUrl;
  const urlObj = new URL(initialUrl);
  dom.window.location.search = urlObj.search;
  dom.window.location.hostname = urlObj.hostname;

  const previousGlobals = {
    chrome: globalThis.chrome,
    window: globalThis.window,
    document: globalThis.document,
    location: globalThis.location,
    localStorage: globalThis.localStorage,
    sessionStorage: globalThis.sessionStorage,
    HTMLMediaElement: globalThis.HTMLMediaElement,
  };

  globalThis.chrome = chrome;
  globalThis.window = dom.window;
  globalThis.document = dom.document;
  globalThis.location = dom.window.location;
  globalThis.localStorage = dom.window.localStorage;
  globalThis.sessionStorage = dom.window.sessionStorage;

  return {
    chrome,
    dom,
    teardown() {
      for (const [k, v] of Object.entries(previousGlobals)) {
        if (v === undefined) {
          delete globalThis[k];
        } else {
          globalThis[k] = v;
        }
      }
    }
  };
}
