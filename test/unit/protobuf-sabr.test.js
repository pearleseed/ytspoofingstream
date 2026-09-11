import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

export function pbReadVarint(bytes, off) {
  let result = 0n, shift = 0n;
  for (let i = 0; i < 10; i++) {
    if (off + i >= bytes.length) return null;
    const b = bytes[off + i];
    result |= BigInt(b & 0x7f) << shift;
    if ((b & 0x80) === 0) {
      const v = result;
      return [v <= 0xFFFFFFFFn ? Number(v) : v, off + i + 1];
    }
    shift += 7n;
  }
  return null;
}

export function pbEncodeVarint(value) {
  const out = [];
  let v = typeof value === 'bigint' ? value : BigInt(value);
  if (v < 0n) v = 0n;
  while (v > 0x7fn) {
    out.push(Number(v & 0x7fn) | 0x80);
    v >>= 7n;
  }
  out.push(Number(v & 0x7fn));
  return out;
}

export function pbReadTag(bytes, off) {
  const v = pbReadVarint(bytes, off);
  if (!v) return null;
  const tag = v[0], next = v[1];
  return [tag >>> 3, tag & 0x07, next];
}

export function pbParseMessage(bytes, start, end) {
  const fields = new Map();
  let off = start;
  while (off < end) {
    const tag = pbReadTag(bytes, off);
    if (!tag) return null;
    const fn = tag[0], wt = tag[1], afterTag = tag[2];
    if (wt === 0) {
      const v = pbReadVarint(bytes, afterTag);
      if (!v) return null;
      if (!fields.has(fn)) fields.set(fn, []);
      fields.get(fn).push({ wireType: 0, valueOff: afterTag, valueLen: v[1] - afterTag, value: v[0] });
      off = v[1];
    } else if (wt === 2) {
      const lenV = pbReadVarint(bytes, afterTag);
      if (!lenV) return null;
      const len = lenV[0], dataOff = lenV[1];
      if (dataOff + len > end) return null;
      if (!fields.has(fn)) fields.set(fn, []);
      fields.get(fn).push({ wireType: 2, valueOff: dataOff, valueLen: len });
      off = dataOff + len;
    } else if (wt === 1) {
      if (afterTag + 8 > end) return null;
      if (!fields.has(fn)) fields.set(fn, []);
      fields.get(fn).push({ wireType: 1, valueOff: afterTag, valueLen: 8 });
      off = afterTag + 8;
    } else if (wt === 5) {
      if (afterTag + 4 > end) return null;
      if (!fields.has(fn)) fields.set(fn, []);
      fields.get(fn).push({ wireType: 5, valueOff: afterTag, valueLen: 4 });
      off = afterTag + 4;
    } else {
      return null;
    }
  }
  return off === end ? fields : null;
}

export function sabrRewritePreferredAudio(bytes, targetItags, newItag, newLastModified) {
  if (!bytes || bytes.length === 0) return null;
  try {
    const topFields = pbParseMessage(bytes, 0, bytes.length);
    if (!topFields) return null;

    const itagList = Array.isArray(targetItags) ? targetItags : [targetItags];

    const f16Entries = topFields.get(16);
    if (!f16Entries || f16Entries.length === 0) return null;
    let f16Target = null, f16Fields = null, f16f1 = null;
    for (const e of f16Entries) {
      const ff = pbParseMessage(bytes, e.valueOff, e.valueOff + e.valueLen);
      if (!ff) continue;
      const f1 = ff.get(1)?.[0];
      if (f1 && f1.wireType === 0 && itagList.includes(f1.value)) {
        f16Target = e;
        f16Fields = ff;
        f16f1 = f1;
        break;
      }
    }
    if (!f16Target || !f16f1) return null;

    const oldItag = f16f1.value;
    const f2Entries = topFields.get(2);
    let f2Target = null, f2Fields = null, f2f1 = null, f2f2 = null;
    if (f2Entries) {
      for (const e of f2Entries) {
        const ff = pbParseMessage(bytes, e.valueOff, e.valueOff + e.valueLen);
        if (!ff) continue;
        const f1 = ff.get(1)?.[0];
        if (f1 && f1.wireType === 0 && f1.value === oldItag) {
          f2Target = e; f2Fields = ff; f2f1 = f1; f2f2 = ff.get(2)?.[0];
          break;
        }
      }
    }

    const oldItagBytes = pbEncodeVarint(oldItag);
    const newItagBytes = pbEncodeVarint(newItag);
    if (oldItagBytes.length !== newItagBytes.length) {
      return null;
    }

    const out = new Uint8Array(bytes);
    out[f16f1.valueOff] = newItagBytes[0];
    out[f16f1.valueOff + 1] = newItagBytes[1];

    const f16f2 = f16Fields.get(2)?.[0];
    if (f16f2 && f16f2.wireType === 0) {
      const newLmBytes = pbEncodeVarint(BigInt(newLastModified));
      const oldLmLen = f16f2.valueLen;
      if (newLmBytes.length === oldLmLen) {
        for (let i = 0; i < newLmBytes.length; i++) out[f16f2.valueOff + i] = newLmBytes[i];
      }
    }

    if (f2Target && f2f1) {
      out[f2f1.valueOff] = newItagBytes[0];
      out[f2f1.valueOff + 1] = newItagBytes[1];
      if (f2f2 && f2f2.wireType === 0) {
        const newLmBytes = pbEncodeVarint(BigInt(newLastModified));
        if (newLmBytes.length === f2f2.valueLen) {
          for (let i = 0; i < newLmBytes.length; i++) out[f2f2.valueOff + i] = newLmBytes[i];
        }
      }
    }

    return out;
  } catch (e) {
    return null;
  }
}

describe('Protobuf SABR Rewriter', () => {
  it('encodes and decodes varints of various sizes', () => {
    const testCases = [0, 1, 127, 128, 251, 774, 16384, 1726050000000n];
    for (const val of testCases) {
      const encoded = pbEncodeVarint(val);
      const decoded = pbReadVarint(new Uint8Array(encoded), 0);
      assert.notEqual(decoded, null);
      if (typeof val === 'bigint') {
        assert.equal(BigInt(decoded[0]), val);
      } else {
        assert.equal(decoded[0], val);
      }
    }
  });

  it('rejects malformed varint exceeding 10 bytes', () => {
    const malformed = new Uint8Array(11).fill(0x80);
    assert.equal(pbReadVarint(malformed, 0), null);
  });

  it('reads field number and wire types correctly in pbReadTag', () => {
    // Field 1, wireType 0 (varint): (1 << 3) | 0 = 8
    const tagVarint = new Uint8Array([8]);
    const res = pbReadTag(tagVarint, 0);
    assert.deepEqual(res, [1, 0, 1]);

    // Field 16, wireType 2 (length-delimited): (16 << 3) | 2 = 130 -> varint: [0x82, 0x01]
    const tagLenDelim = new Uint8Array(pbEncodeVarint((16 << 3) | 2));
    const res16 = pbReadTag(tagLenDelim, 0);
    assert.deepEqual(res16, [16, 2, tagLenDelim.length]);
  });

  it('correctly rewrites target itag 251 to 774 in synthetic SABR message', () => {
    // Construct synthetic SABR message:
    // Sub-message for f16: f1=251, f2=1000n
    const f16Sub = [
      ...pbEncodeVarint((1 << 3) | 0), ...pbEncodeVarint(251),
      ...pbEncodeVarint((2 << 3) | 0), ...pbEncodeVarint(1000n),
    ];
    // Sub-message for f2: f1=251, f2=1000n
    const f2Sub = [
      ...pbEncodeVarint((1 << 3) | 0), ...pbEncodeVarint(251),
      ...pbEncodeVarint((2 << 3) | 0), ...pbEncodeVarint(1000n),
    ];

    // Top message: f16 (wire 2) and f2 (wire 2)
    const topMsg = [
      ...pbEncodeVarint((16 << 3) | 2), ...pbEncodeVarint(f16Sub.length), ...f16Sub,
      ...pbEncodeVarint((2 << 3) | 2), ...pbEncodeVarint(f2Sub.length), ...f2Sub,
    ];

    const inputBytes = new Uint8Array(topMsg);
    const rewritten = sabrRewritePreferredAudio(inputBytes, [251], 774, 1000n);

    assert.notEqual(rewritten, null);

    // Verify rewritten payload has itag 774 in both f16 and f2
    const parsed = pbParseMessage(rewritten, 0, rewritten.length);
    assert.notEqual(parsed, null);

    const f16After = parsed.get(16)[0];
    const f16AfterMsg = pbParseMessage(rewritten, f16After.valueOff, f16After.valueOff + f16After.valueLen);
    assert.equal(f16AfterMsg.get(1)[0].value, 774);

    const f2After = parsed.get(2)[0];
    const f2AfterMsg = pbParseMessage(rewritten, f2After.valueOff, f2After.valueOff + f2After.valueLen);
    assert.equal(f2AfterMsg.get(1)[0].value, 774);
  });

  it('handles null, empty, or truncated buffer gracefully without throwing', () => {
    assert.equal(sabrRewritePreferredAudio(null, 251, 774, 0), null);
    assert.equal(sabrRewritePreferredAudio(new Uint8Array(0), 251, 774, 0), null);
    assert.equal(sabrRewritePreferredAudio(new Uint8Array([0x80, 0x80]), 251, 774, 0), null);
  });
});
