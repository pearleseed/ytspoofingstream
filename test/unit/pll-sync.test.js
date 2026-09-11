import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

export const SYNC_DEADBAND_S = 0.035; // 35ms broadcast tolerance
export const SLEW_MAX_S = 0.350;      // 350ms micro-slew range
export const SLEW_RATE_DELTA = 0.015; // 1.5% imperceptible slew rate

export function calculatePllSyncRate(audioTime, videoTime, userRate = 1.0, isSeeking = false) {
  const drift = audioTime - videoTime;
  const absDrift = Math.abs(drift);

  if (isSeeking || absDrift > SLEW_MAX_S) {
    return {
      targetRate: userRate,
      hardSeek: true,
      phaseDiff: drift,
      state: 'HARD_ALIGN',
    };
  }

  if (absDrift <= SYNC_DEADBAND_S) {
    return {
      targetRate: userRate,
      hardSeek: false,
      phaseDiff: drift,
      state: 'PHASE_LOCKED',
    };
  }

  // Audio leading video -> slow audio down by 1.5%
  if (drift > 0) {
    return {
      targetRate: +(userRate * (1 - SLEW_RATE_DELTA)).toFixed(4),
      hardSeek: false,
      phaseDiff: drift,
      state: 'SLEW_DECELERATE',
    };
  }

  // Audio lagging video -> speed audio up by 1.5%
  return {
    targetRate: +(userRate * (1 + SLEW_RATE_DELTA)).toFixed(4),
    hardSeek: false,
    phaseDiff: drift,
    state: 'SLEW_ACCELERATE',
  };
}

describe('PLL Micro-Sync Controller', () => {
  it('locks phase in deadband (|drift| <= 35ms) maintaining exact video rate', () => {
    // Exactly 0ms drift
    const r0 = calculatePllSyncRate(10.000, 10.000, 1.0);
    assert.equal(r0.state, 'PHASE_LOCKED');
    assert.equal(r0.targetRate, 1.0);
    assert.equal(r0.hardSeek, false);

    // +25ms drift
    const rPos = calculatePllSyncRate(10.025, 10.000, 1.5);
    assert.equal(rPos.state, 'PHASE_LOCKED');
    assert.equal(rPos.targetRate, 1.5);
    assert.equal(rPos.hardSeek, false);

    // -30ms drift
    const rNeg = calculatePllSyncRate(9.970, 10.000, 1.25);
    assert.equal(rNeg.state, 'PHASE_LOCKED');
    assert.equal(rNeg.targetRate, 1.25);
    assert.equal(rNeg.hardSeek, false);
  });

  it('slows audio by 1.5% when audio leads video (35ms < drift <= 350ms)', () => {
    // Audio is +100ms ahead at normal 1.0x speed
    const r = calculatePllSyncRate(10.100, 10.000, 1.0);
    assert.equal(r.state, 'SLEW_DECELERATE');
    assert.equal(r.targetRate, 0.985);
    assert.equal(r.hardSeek, false);

    // Audio is +300ms ahead at 2.0x speed
    const r2 = calculatePllSyncRate(10.300, 10.000, 2.0);
    assert.equal(r2.state, 'SLEW_DECELERATE');
    assert.equal(r2.targetRate, 1.97);
    assert.equal(r2.hardSeek, false);
  });

  it('speeds up audio by 1.5% when audio lags video (-350ms <= drift < -35ms)', () => {
    // Audio is -150ms behind at normal 1.0x speed
    const r = calculatePllSyncRate(9.850, 10.000, 1.0);
    assert.equal(r.state, 'SLEW_ACCELERATE');
    assert.equal(r.targetRate, 1.015);
    assert.equal(r.hardSeek, false);

    // Audio is -200ms behind at 1.5x speed
    const r15 = calculatePllSyncRate(9.800, 10.000, 1.5);
    assert.equal(r15.state, 'SLEW_ACCELERATE');
    assert.equal(r15.targetRate, 1.5225);
    assert.equal(r15.hardSeek, false);
  });

  it('triggers hard seek when drift exceeds 350ms threshold', () => {
    const rLarge = calculatePllSyncRate(11.000, 10.000, 1.0);
    assert.equal(rLarge.state, 'HARD_ALIGN');
    assert.equal(rLarge.hardSeek, true);
    assert.equal(rLarge.targetRate, 1.0);
  });

  it('triggers hard seek immediately when video is in seeking state', () => {
    // Even if drift is only 10ms, if user is scrubbing/seeking, snap clock!
    const rSeeking = calculatePllSyncRate(10.010, 10.000, 1.0, true);
    assert.equal(rSeeking.state, 'HARD_ALIGN');
    assert.equal(rSeeking.hardSeek, true);
  });
});
