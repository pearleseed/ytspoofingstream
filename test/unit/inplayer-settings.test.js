import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Pure representation of settings filtering logic from bridge.js & inject.js
const EXPOSED_SETTINGS = [
  'enabled',
  'hqFetch',
  'forceOverride',
  'autoReload',
  'audioMode',
  'preferredClient',
  'rawItag',
  'shadowPlayer',
  'shadowVolume',
  'operationMode',
  'lang',
];

function pickSettings(data) {
  const out = {};
  if (!data || typeof data !== 'object') return out;
  for (const key of EXPOSED_SETTINGS) {
    if (data[key] !== undefined) out[key] = data[key];
  }
  return out;
}

describe('In-Player Settings & Storage Bridge Sync', () => {
  it('filters out sensitive or unknown keys like tvOAuthToken', () => {
    const maliciousInput = {
      enabled: true,
      operationMode: 'HYBRID_HQ',
      shadowPlayer: true,
      lang: 'vi',
      tvOAuthToken: { access_token: 'SECRET_TOKEN', refresh_token: 'REFRESH' },
      arbitraryInjection: '<script>alert(1)</script>'
    };

    const sanitized = pickSettings(maliciousInput);

    assert.equal(sanitized.enabled, true);
    assert.equal(sanitized.operationMode, 'HYBRID_HQ');
    assert.equal(sanitized.shadowPlayer, true);
    assert.equal(sanitized.lang, 'vi');
    assert.equal(sanitized.tvOAuthToken, undefined, 'Must never expose tvOAuthToken');
    assert.equal(sanitized.arbitraryInjection, undefined, 'Must drop arbitrary keys');
  });

  it('safely handles empty, null or undefined input', () => {
    assert.deepEqual(pickSettings(null), {});
    assert.deepEqual(pickSettings(undefined), {});
    assert.deepEqual(pickSettings('string'), {});
    assert.deepEqual(pickSettings({}), {});
  });

  it('correctly maps valid operationMode changes', () => {
    const modes = ['HYBRID_HQ', 'YTM_HARVESTER', 'TV_HEADLESS'];
    for (const m of modes) {
      const filtered = pickSettings({ operationMode: m });
      assert.equal(filtered.operationMode, m);
    }
  });

  it('correctly preserves toggle flags for enabled, shadowPlayer, and lang', () => {
    const toggles = pickSettings({ enabled: false, shadowPlayer: true, lang: 'en' });
    assert.strictEqual(toggles.enabled, false);
    assert.strictEqual(toggles.shadowPlayer, true);
    assert.strictEqual(toggles.lang, 'en');
  });
});
