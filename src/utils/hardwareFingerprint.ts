'use client';

/**
 * hardwareFingerprint.ts — UpStore Anti-VPN & Anti-Spoofing Hardware Fingerprint Engine
 *
 * Captures stable, immutable hardware & browser entropy components that DO NOT change
 * when using VPNs, proxies, Tor, changing IPs, or switching networks:
 *
 * 1. WebGL GPU Unmasked Renderer & Vendor (Direct GPU Silicon details)
 * 2. Canvas 2D Render Vector Hash (Subpixel, font antialiasing & GPU rasterization)
 * 3. AudioContext DSP Frequency Response (Float32 buffer audio hardware compression)
 * 4. Screen Color Depth, Pixel Density & Resolution Metrics
 * 5. CPU Hardware Concurrency (Cores count) & Device Memory
 * 6. Multi-Layered Persistent Device Vault (Cookie + localStorage + sessionStorage)
 */

const STORAGE_KEY = 'upstore_device_hw_id';
const COOKIE_NAME = 'device_signature';

/**
 * Fast Murmur3-like string hasher to generate deterministic 64-bit hex hash.
 */
function fastHash(str: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0, ch; i < str.length; i++) {
    ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).padStart(16, '0');
}

/**
 * Extracts unmasked WebGL GPU Renderer and Vendor (e.g. "ANGLE (NVIDIA, GeForce RTX 3070...)")
 */
function getWebGLInfo(): string {
  try {
    const canvas = document.createElement('canvas');
    const gl = (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null;
    if (!gl) return 'no-webgl';

    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    if (!debugInfo) {
      return gl.getParameter(gl.RENDERER) || 'generic-webgl';
    }

    const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || '';
    const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || '';
    return `${vendor}~${renderer}`;
  } catch {
    return 'webgl-error';
  }
}

/**
 * Generates a high-entropy Canvas 2D rasterization hash across GPU font-rendering engines.
 */
function getCanvasFingerprint(): string {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 240;
    canvas.height = 60;
    const ctx = canvas.getContext('2d');
    if (!ctx) return 'no-canvas-2d';

    // Canvas composite test
    ctx.textBaseline = 'top';
    ctx.font = "14px 'Arial', 'Cairo', 'Segoe UI', sans-serif";
    ctx.fillStyle = '#f60';
    ctx.fillRect(125, 1, 62, 20);

    ctx.fillStyle = '#069';
    ctx.fillText('UpStore_Safe_2026', 2, 15);
    ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
    ctx.fillText('UpStore_Safe_2026', 4, 17);

    // Geometry bezier test
    ctx.beginPath();
    ctx.arc(50, 40, 15, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.fillStyle = 'rgba(255, 0, 128, 0.5)';
    ctx.fill();

    return fastHash(canvas.toDataURL());
  } catch {
    return 'canvas-error';
  }
}

/**
 * Generates an AudioContext hardware processing fingerprint via DynamicsCompressor.
 */
async function getAudioFingerprint(): Promise<string> {
  try {
    // @ts-ignore
    const AudioContextClass = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    if (!AudioContextClass) return 'no-audio-ctx';

    const context = new AudioContextClass(1, 44100, 44100);
    const oscillator = context.createOscillator();
    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(10000, context.currentTime);

    const compressor = context.createDynamicsCompressor();
    compressor.threshold.setValueAtTime(-50, context.currentTime);
    compressor.knee.setValueAtTime(40, context.currentTime);
    compressor.ratio.setValueAtTime(12, context.currentTime);
    compressor.attack.setValueAtTime(0, context.currentTime);
    compressor.release.setValueAtTime(0.25, context.currentTime);

    oscillator.connect(compressor);
    compressor.connect(context.destination);
    oscillator.start(0);

    const audioBuffer = await context.startRendering();
    const channelData = audioBuffer.getChannelData(0);
    let sampleSum = 0;
    for (let i = 4500; i < 5000; i++) {
      sampleSum += Math.abs(channelData[i]);
    }
    return fastHash(sampleSum.toString());
  } catch {
    return 'audio-error';
  }
}

/**
 * Extracts screen, color depth, CPU, and hardware platform traits.
 */
function getSystemHardwareMetrics(): string {
  try {
    const screenMetrics = typeof window !== 'undefined' && window.screen
      ? `${window.screen.colorDepth}_${window.screen.pixelDepth}_${window.devicePixelRatio || 1}`
      : 'no-screen';

    const cores = typeof navigator !== 'undefined' ? (navigator.hardwareConcurrency || 4) : 4;
    // @ts-ignore
    const memory = typeof navigator !== 'undefined' ? (navigator.deviceMemory || 8) : 8;
    const platform = typeof navigator !== 'undefined' ? (navigator.platform || 'unknown') : 'unknown';

    return `${screenMetrics}~cores:${cores}~mem:${memory}~plat:${platform}`;
  } catch {
    return 'metrics-error';
  }
}

/**
 * Generates or recovers a persistent random seed stored across multi-layered storage.
 */
function getPersistentDeviceSeed(): string {
  if (typeof window === 'undefined') return 'server-seed';

  let seed = '';

  try {
    seed = localStorage.getItem(STORAGE_KEY) || '';
  } catch {}

  if (!seed) {
    try {
      seed = sessionStorage.getItem(STORAGE_KEY) || '';
    } catch {}
  }

  if (!seed) {
    const match = document.cookie.match(new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]*)`));
    if (match && match[1]) {
      seed = decodeURIComponent(match[1]).split('_')[0] || '';
    }
  }

  if (!seed || seed.length < 16) {
    const randomBytes = new Uint8Array(16);
    if (window.crypto && window.crypto.getRandomValues) {
      window.crypto.getRandomValues(randomBytes);
      seed = Array.from(randomBytes).map((b) => b.toString(16).padStart(2, '0')).join('');
    } else {
      seed = (Math.random().toString(36).substring(2) + Date.now().toString(36)).padEnd(32, '0');
    }
  }

  // Synchronize across all storages
  try {
    localStorage.setItem(STORAGE_KEY, seed);
  } catch {}
  try {
    sessionStorage.setItem(STORAGE_KEY, seed);
  } catch {}

  return seed;
}

/**
 * Computes the complete deterministic hardware fingerprint of the device.
 * Immune to VPNs, IP changes, or basic cookie clearing.
 */
export async function getHardwareFingerprint(): Promise<string> {
  if (typeof window === 'undefined') {
    return 'server-render-fingerprint';
  }

  const [webgl, canvas, audio, hardware, seed] = await Promise.all([
    Promise.resolve(getWebGLInfo()),
    Promise.resolve(getCanvasFingerprint()),
    getAudioFingerprint(),
    Promise.resolve(getSystemHardwareMetrics()),
    Promise.resolve(getPersistentDeviceSeed()),
  ]);

  const rawEntropy = `GPU:${webgl}|CANVAS:${canvas}|AUDIO:${audio}|HW:${hardware}|SEED:${seed}`;
  const hardwareHash = fastHash(rawEntropy);
  const compositeSignature = `HW_${hardwareHash}_${seed.slice(0, 12)}`;

  return compositeSignature;
}

/**
 * Automatically computes and sets the persistent 1-year device signature cookie on the client.
 */
export async function syncDeviceFingerprintCookie(): Promise<string> {
  if (typeof window === 'undefined') return '';

  const fingerprint = await getHardwareFingerprint();

  // Set 1-year persistent cookie with SameSite=Lax
  const maxAge = 60 * 60 * 24 * 365; // 365 days
  const isSecure = window.location.protocol === 'https:';
  document.cookie = `${COOKIE_NAME}=${encodeURIComponent(fingerprint)}; Path=/; Max-Age=${maxAge}; SameSite=Lax${isSecure ? '; Secure' : ''}`;

  return fingerprint;
}
