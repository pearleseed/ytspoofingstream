import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

export const SAPISID_COOKIES = [
  { name: 'SAPISID', prefix: 'SAPISIDHASH' },
  { name: '__Secure-1PAPISID', prefix: 'SAPISID1PHASH' },
  { name: '__Secure-3PAPISID', prefix: 'SAPISID3PHASH' },
];

export async function sha1Hex(input) {
  const buf = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest('SHA-1', buf);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function getSapisidHash(origin = 'https://www.youtube.com', cookieGetter) {
  try {
    const ts = Math.floor(Date.now() / 1000);
    const parts = [];

    for (const { name, prefix } of SAPISID_COOKIES) {
      const cookie = await cookieGetter({ url: origin, name });
      if (!cookie?.value) continue;
      const hex = await sha1Hex(`${ts} ${cookie.value} ${origin}`);
      parts.push(`${prefix} ${ts}_${hex}`);
    }

    return parts.length ? parts.join(' ') : null;
  } catch (err) {
    return null;
  }
}

describe('Authentication Crypto & SAPISID Hasher', () => {
  it('sha1Hex generates valid 40-character hex string for known vectors', async () => {
    // SHA-1 of "" is da39a3ee5e6b4b0d3255bfef95601890afd80709
    const emptyHash = await sha1Hex('');
    assert.equal(emptyHash, 'da39a3ee5e6b4b0d3255bfef95601890afd80709');

    // SHA-1 of "test" is a94a8fe5ccb19ba61c4c0873d391e987982fbbd3
    const testHash = await sha1Hex('test');
    assert.equal(testHash, 'a94a8fe5ccb19ba61c4c0873d391e987982fbbd3');
  });

  it('getSapisidHash returns null if no cookies exist', async () => {
    const getter = async () => null;
    const header = await getSapisidHash('https://www.youtube.com', getter);
    assert.equal(header, null);
  });

  it('getSapisidHash constructs correct SAPISID authorization headers for YouTube', async () => {
    const cookies = {
      'SAPISID': 'sapisid_token_value_123',
      '__Secure-1PAPISID': '1papisid_token_value_456',
      '__Secure-3PAPISID': '3papisid_token_value_789',
    };
    const getter = async ({ name }) => cookies[name] ? { value: cookies[name] } : null;

    const authHeader = await getSapisidHash('https://www.youtube.com', getter);
    assert.notEqual(authHeader, null);

    const parts = authHeader.split(' ');
    // Expect 6 tokens: "SAPISIDHASH ts_hex SAPISID1PHASH ts_hex SAPISID3PHASH ts_hex"
    assert.equal(parts.length, 6);
    assert.equal(parts[0], 'SAPISIDHASH');
    assert.match(parts[1], /^\d+_[a-f0-9]{40}$/);
    assert.equal(parts[2], 'SAPISID1PHASH');
    assert.match(parts[3], /^\d+_[a-f0-9]{40}$/);
    assert.equal(parts[4], 'SAPISID3PHASH');
    assert.match(parts[5], /^\d+_[a-f0-9]{40}$/);
  });
});
