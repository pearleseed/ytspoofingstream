import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Pure implementation matching src/content/inject.js line 631 and ytm_harvester_cs.js line 136
export function cleanStreamUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return rawUrl;
  try {
    const u = new URL(rawUrl);
    u.searchParams.delete('range');
    u.searchParams.delete('rn');
    u.searchParams.delete('rbuf');
    u.searchParams.delete('ump');
    u.searchParams.delete('sabr');
    u.searchParams.delete('alr');
    u.searchParams.delete('sq');
    return u.toString();
  } catch (e) {
    return rawUrl
      .replace(/[?&]range=[^&]*/g, '')
      .replace(/[?&]rn=[^&]*/g, '')
      .replace(/[?&]rbuf=[^&]*/g, '')
      .replace(/[?&]ump=[^&]*/g, '')
      .replace(/[?&]sabr=[^&]*/g, '')
      .replace(/[?&]alr=[^&]*/g, '')
      .replace(/[?&]sq=[^&]*/g, '');
  }
}

describe('Stream URL Sanitizer', () => {
  it('handles null, undefined, and non-string inputs safely', () => {
    assert.equal(cleanStreamUrl(null), null);
    assert.equal(cleanStreamUrl(undefined), undefined);
    assert.equal(cleanStreamUrl(123), 123);
  });

  it('strips all streaming buffer and chunk params from valid URL', () => {
    const input = 'https://rr1---sn-4g5ednks.googlevideo.com/videoplayback?expire=1726050000&ei=AbCdEf&ip=1.2.3.4&id=o-AbC&itag=774&source=youtube&range=0-1048575&rn=1&rbuf=5000&ump=1&sabr=1&alr=yes&sq=12&signature=DEADBEEF';
    const cleaned = cleanStreamUrl(input);

    const url = new URL(cleaned);
    assert.equal(url.searchParams.has('range'), false, 'Should strip range');
    assert.equal(url.searchParams.has('rn'), false, 'Should strip rn');
    assert.equal(url.searchParams.has('rbuf'), false, 'Should strip rbuf');
    assert.equal(url.searchParams.has('ump'), false, 'Should strip ump');
    assert.equal(url.searchParams.has('sabr'), false, 'Should strip sabr');
    assert.equal(url.searchParams.has('alr'), false, 'Should strip alr');
    assert.equal(url.searchParams.has('sq'), false, 'Should strip sq');

    // Essential playback and security params must remain intact!
    assert.equal(url.searchParams.get('expire'), '1726050000');
    assert.equal(url.searchParams.get('ei'), 'AbCdEf');
    assert.equal(url.searchParams.get('ip'), '1.2.3.4');
    assert.equal(url.searchParams.get('itag'), '774');
    assert.equal(url.searchParams.get('signature'), 'DEADBEEF');
  });

  it('handles malformed URL via regex fallback safely', () => {
    const malformed = 'videoplayback?itag=774&range=0-100&sabr=1&sq=5';
    const cleaned = cleanStreamUrl(malformed);
    assert.equal(cleaned.includes('range='), false);
    assert.equal(cleaned.includes('sabr='), false);
    assert.equal(cleaned.includes('sq='), false);
    assert.equal(cleaned.includes('itag=774'), true);
  });
});
