// src/lib/audio/pcm.ts
// Minimal PCM/Base64 helpers for Gemini Live audio (browser/web).
// - Float32 PCM (-1..1) -> PCM16 little-endian -> base64
// - base64 -> Uint8Array
// - PCM16 bytes -> Float32Array

export function f32ToPcm16Base64(data: Float32Array): string {
  const l = data.length;
  const int16 = new Int16Array(l);

  for (let i = 0; i < l; i++) {
    // clamp to [-1, 1]
    const v = Math.max(-1, Math.min(1, data[i]));
    // convert to int16 range (asymmetric to avoid clipping +1)
    int16[i] = v < 0 ? (v * 32768) | 0 : (v * 32767) | 0;
  }

  const bytes = new Uint8Array(int16.buffer);

  // bytes -> base64 (btoa expects binary string)
  let bin = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    bin += String.fromCharCode(bytes[i]);
  }
  return btoa(bin);
}

export function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

/**
 * Decode PCM16 little-endian bytes into Float32 samples in [-1, 1].
 * Assumes the Uint8Array buffer is aligned to 16-bit samples.
 */
export function decodePcm16ToFloat32(pcmBytes: Uint8Array): Float32Array {
  // If pcmBytes is a view into a larger ArrayBuffer, slice to its exact region.
  const ab = pcmBytes.byteOffset === 0 && pcmBytes.byteLength === pcmBytes.buffer.byteLength
    ? pcmBytes.buffer
    : pcmBytes.buffer.slice(pcmBytes.byteOffset, pcmBytes.byteOffset + pcmBytes.byteLength);

  const int16 = new Int16Array(ab);
  const out = new Float32Array(int16.length);

  for (let i = 0; i < int16.length; i++) {
    out[i] = int16[i] / 32768.0;
  }
  return out;
}
