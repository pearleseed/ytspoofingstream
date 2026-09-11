import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createMockChrome } from './chrome.mock.js';
import { createMockDom } from './dom.mock.js';

describe('Test Infrastructure Mocks', () => {
  it('chrome.mock provides storage.local with set/get/remove', async () => {
    const chrome = createMockChrome();
    await chrome.storage.local.set({ foo: 'bar', num: 42 });
    const res = await chrome.storage.local.get(['foo', 'num']);
    assert.equal(res.foo, 'bar');
    assert.equal(res.num, 42);

    await chrome.storage.local.remove('foo');
    const after = await chrome.storage.local.get('foo');
    assert.equal(after.foo, undefined);
  });

  it('chrome.mock provides storage.session with set/get/remove', async () => {
    const chrome = createMockChrome();
    await chrome.storage.session.set({ hq_123: { itag: 774 } });
    const res = await chrome.storage.session.get('hq_123');
    assert.deepEqual(res.hq_123, { itag: 774 });
  });

  it('chrome.mock provides runtime messaging and ping', async () => {
    const chrome = createMockChrome();
    let handled = false;
    chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
      if (msg.type === 'TEST_PING') {
        handled = true;
        sendResponse({ pong: true });
      }
    });

    const resp = await new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: 'TEST_PING' }, resolve);
    });
    assert.equal(handled, true);
    assert.deepEqual(resp, { pong: true });
  });

  it('dom.mock provides HTMLMediaElement with clock, rate, play/pause events', () => {
    const dom = createMockDom();
    const video = dom.document.createElement('video');
    assert.equal(video.tagName, 'VIDEO');
    assert.equal(video.currentTime, 0);
    assert.equal(video.playbackRate, 1.0);
    assert.equal(video.paused, true);
    assert.equal(video.muted, false);

    let playFired = false;
    let pauseFired = false;
    video.addEventListener('play', () => { playFired = true; });
    video.addEventListener('pause', () => { pauseFired = true; });

    video.play();
    assert.equal(video.paused, false);
    assert.equal(playFired, true);

    video.currentTime = 15.5;
    assert.equal(video.currentTime, 15.5);

    video.playbackRate = 1.25;
    assert.equal(video.playbackRate, 1.25);

    video.pause();
    assert.equal(video.paused, true);
    assert.equal(pauseFired, true);
  });

  it('dom.mock supports document visibility and custom events', () => {
    const dom = createMockDom();
    assert.equal(dom.document.hidden, false);
    assert.equal(dom.document.visibilityState, 'visible');

    let visChanged = false;
    dom.document.addEventListener('visibilitychange', () => {
      visChanged = true;
    });

    dom.document.hidden = true;
    dom.document.visibilityState = 'hidden';
    dom.document.dispatchEvent(new dom.window.Event('visibilitychange'));
    assert.equal(visChanged, true);
  });
});
