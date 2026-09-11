import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createMockChrome } from '../mocks/chrome.mock.js';

export const CLIENTS = [
  { name: 'WEB_REMIX', clientName: 'WEB_REMIX', clientId: '67', ua: null },
  { name: 'TVHTML5', clientName: 'TVHTML5', clientId: '7', ua: 'Mozilla/5.0 (SMART-TV; Linux; Tizen 5.0) AppleWebKit/538.1' },
  { name: 'ANDROID', clientName: 'ANDROID', clientId: '3', ua: 'com.google.android.youtube/21.04.223 (Linux; U; Android 14)' },
  { name: 'ANDROID_MUSIC', clientName: 'ANDROID_MUSIC', clientId: '21', ua: 'com.google.android.apps.youtube.music/7.27.52' },
  { name: 'ANDROID_VR', clientName: 'ANDROID_VR', clientId: '28', ua: 'Mozilla/5.0 (Linux; Android 10; Quest 2)' },
];
CLIENTS.forEach((c, i) => { c.idx = i; });

export const ORIGIN_RULE_ID = 9190;
export const API_UA_RULE_ID_BASE = 9200;
export const MEDIA_RULE_ID_BASE = 9220;

export function buildDnrRules(enabled = true) {
  if (!enabled) {
    return { rulesToAdd: [], shouldWipeAll: true };
  }

  const rulesToAdd = [];

  // Origin rule
  rulesToAdd.push({
    id: ORIGIN_RULE_ID,
    priority: 1,
    action: {
      type: 'modifyHeaders',
      requestHeaders: [
        { header: 'Origin', operation: 'set', value: 'https://www.youtube.com' },
        { header: 'Referer', operation: 'set', value: 'https://www.youtube.com/' },
      ],
    },
    condition: {
      urlFilter: '*youtubei/v1/player*',
      resourceTypes: ['xmlhttprequest', 'other'],
    },
  });

  // Per-client UA rules
  CLIENTS.forEach((c) => {
    if (!c.ua) return;
    const ruleId = API_UA_RULE_ID_BASE + c.idx;
    rulesToAdd.push({
      id: ruleId,
      priority: 20,
      action: {
        type: 'modifyHeaders',
        requestHeaders: [
          { header: 'User-Agent', operation: 'set', value: c.ua },
        ],
      },
      condition: {
        urlFilter: `*youtubei/v1/player*_ytss_c=${c.idx}*`,
        resourceTypes: ['xmlhttprequest', 'other'],
      },
    });

    const mediaRuleId = MEDIA_RULE_ID_BASE + c.idx;
    rulesToAdd.push({
      id: mediaRuleId,
      priority: 2,
      action: {
        type: 'modifyHeaders',
        requestHeaders: [
          { header: 'User-Agent', operation: 'set', value: c.ua },
        ],
      },
      condition: {
        regexFilter: `^https?://.*\\.googlevideo\\.com/videoplayback.*(?:[?&]c=|/c/)${c.clientName}(?:[&/]|$)`,
        resourceTypes: ['xmlhttprequest', 'media', 'other'],
      },
    });
  });

  return { rulesToAdd, shouldWipeAll: false };
}

describe('DeclarativeNetRequest Ruleset Generator', () => {
  it('generates unique deterministic integer IDs for all rules', () => {
    const { rulesToAdd } = buildDnrRules(true);
    const ids = rulesToAdd.map(r => r.id);
    const uniqueIds = new Set(ids);

    assert.equal(ids.length, uniqueIds.size, 'All rule IDs must be strictly unique');
    for (const id of ids) {
      assert.equal(Number.isInteger(id), true);
      assert.equal(id > 0, true);
    }
  });

  it('generates specific User-Agent spoofing rules for TVHTML5, ANDROID, and ANDROID_MUSIC', () => {
    const { rulesToAdd } = buildDnrRules(true);

    const tvRule = rulesToAdd.find(r => r.condition.urlFilter?.includes('_ytss_c=1'));
    assert.notEqual(tvRule, undefined);
    assert.equal(tvRule.action.requestHeaders[0].value, CLIENTS[1].ua);

    const androidRule = rulesToAdd.find(r => r.condition.urlFilter?.includes('_ytss_c=2'));
    assert.notEqual(androidRule, undefined);
    assert.equal(androidRule.action.requestHeaders[0].value, CLIENTS[2].ua);

    const musicRule = rulesToAdd.find(r => r.condition.urlFilter?.includes('_ytss_c=3'));
    assert.notEqual(musicRule, undefined);
    assert.equal(musicRule.action.requestHeaders[0].value, CLIENTS[3].ua);
  });

  it('skips UA generation for clients with ua: null (WEB_REMIX)', () => {
    const { rulesToAdd } = buildDnrRules(true);
    const webRemixRule = rulesToAdd.find(r => r.condition.urlFilter?.includes('_ytss_c=0'));
    assert.equal(webRemixRule, undefined);
  });

  it('indicates wipe all rules when extension is disabled', () => {
    const disabled = buildDnrRules(false);
    assert.equal(disabled.shouldWipeAll, true);
    assert.equal(disabled.rulesToAdd.length, 0);
  });

  it('updates session rules in Chrome mock correctly', async () => {
    const chrome = createMockChrome();
    const { rulesToAdd } = buildDnrRules(true);

    await chrome.declarativeNetRequest.updateSessionRules({
      addRules: rulesToAdd,
      removeRuleIds: [],
    });

    const activeRules = await chrome.declarativeNetRequest.getSessionRules();
    assert.equal(activeRules.length, rulesToAdd.length);
  });
});
