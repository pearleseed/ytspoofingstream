import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Logic matching src/background/background.js lines 1007-1100 and src/content/inject.js lines 658-670
export function canHybridFailover(failedSourcesMap, videoId, failedSource, targetSource) {
  if (!videoId || !failedSource || !targetSource) return false;
  if (!failedSourcesMap.has(videoId)) {
    failedSourcesMap.set(videoId, new Set());
  }
  const failedSet = failedSourcesMap.get(videoId);
  failedSet.add(failedSource);

  // If alternate source already failed earlier for this video, reject to prevent infinite ping-pong
  if (failedSet.has(targetSource)) {
    return false;
  }
  return true;
}

export async function runHybridHqResolver({
  videoId,
  excludeSource = null,
  preferredSource = null,
  harvestYtm,
  fetchTv,
}) {
  const PROV_YTM = 'YTM_HARVESTER';
  const PROV_TV = 'TVHTML5';

  const tryYtm = async () => {
    try {
      const ytmFormats = await harvestYtm(videoId);
      if (ytmFormats && ytmFormats.some(f => f.itag === 774)) {
        return { source: PROV_YTM, audioFormats: ytmFormats, streamingContext: null };
      }
    } catch (e) {}
    return null;
  };

  const tryTv = async () => {
    try {
      const tvRes = await fetchTv(videoId);
      if (tvRes?.audioFormats?.some(f => f.itag === 774)) {
        return { source: PROV_TV, audioFormats: tvRes.audioFormats, streamingContext: tvRes.streamingContext || null };
      }
    } catch (e) {}
    return null;
  };

  let firstProv = PROV_YTM;
  let secondProv = PROV_TV;

  if (excludeSource === PROV_YTM) {
    firstProv = PROV_TV;
    secondProv = null;
  } else if (excludeSource === PROV_TV) {
    firstProv = PROV_YTM;
    secondProv = null;
  } else if (preferredSource === PROV_TV) {
    firstProv = PROV_TV;
    secondProv = PROV_YTM;
  }

  const runProvider = (p) => (p === PROV_YTM ? tryYtm() : tryTv());

  // Step 1: Attempt primary candidate
  let result = await runProvider(firstProv);

  // Step 2: Smart failover if primary failed
  if (!result && secondProv) {
    result = await runProvider(secondProv);
  }

  if (result) {
    return {
      success: true,
      results: [{ source: result.source, audioFormats: result.audioFormats }],
      streamingContext: result.streamingContext,
      opMode: 'HYBRID_HQ',
      usedSource: result.source,
    };
  }

  // Step 3: Fallback to native
  return {
    success: false,
    results: [],
    error: 'NO_774_STREAM',
    opMode: 'HYBRID_HQ',
  };
}

describe('Hybrid HQ Failover Engine', () => {
  const videoId = 'dQw4w9WgXcQ';

  it('delivers 774 from primary source (YTM) when available', async () => {
    const res = await runHybridHqResolver({
      videoId,
      harvestYtm: async () => [{ itag: 774, bitrate: 280000 }],
      fetchTv: async () => null,
    });

    assert.equal(res.success, true);
    assert.equal(res.usedSource, 'YTM_HARVESTER');
    assert.equal(res.results[0].audioFormats[0].itag, 774);
  });

  it('fails over to TVHTML5 when YTM harvester fails', async () => {
    const res = await runHybridHqResolver({
      videoId,
      harvestYtm: async () => { throw new Error('YTM Track Not Available'); },
      fetchTv: async () => ({
        audioFormats: [{ itag: 774, bitrate: 301258 }],
        streamingContext: { serverAbrStreamingUrl: 'https://example.com' },
      }),
    });

    assert.equal(res.success, true);
    assert.equal(res.usedSource, 'TVHTML5');
    assert.notEqual(res.streamingContext, null);
  });

  it('cleanly reports NO_774_STREAM when both providers fail', async () => {
    const res = await runHybridHqResolver({
      videoId,
      harvestYtm: async () => [],
      fetchTv: async () => ({ audioFormats: [{ itag: 251 }] }), // only native 251, no 774
    });

    assert.equal(res.success, false);
    assert.equal(res.error, 'NO_774_STREAM');
    assert.deepEqual(res.results, []);
  });

  it('canHybridFailover detects and prevents infinite failover recursion', () => {
    const failedMap = new Map();

    // First failover: YTM failed -> try TV (allowed)
    const allow1 = canHybridFailover(failedMap, videoId, 'YTM_HARVESTER', 'TVHTML5');
    assert.equal(allow1, true);

    // Second failover: TV also failed -> try YTM again (must be rejected!)
    const allow2 = canHybridFailover(failedMap, videoId, 'TVHTML5', 'YTM_HARVESTER');
    assert.equal(allow2, false);
  });
});
