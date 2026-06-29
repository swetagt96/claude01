// Generates PlantPal PWA icons as PNGs with no external dependencies.
// Renders a leaf on a green rounded tile (and a full-bleed "maskable" variant)
// using supersampled software rasterization, then encodes PNG via zlib.
//
// Usage: node scripts/generate-icons.mjs
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "..", "client", "public", "icons");

// ---- PNG encoder ----------------------------------------------------------
function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return (~c) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}
function encodePng(width, height, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  // bytes 10-12 already 0 (compression, filter, interlace)
  const stride = width * 4;
  const raw = Buffer.alloc(height * (stride + 1));
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filter: none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---- helpers --------------------------------------------------------------
const lerp = (a, b, t) => a + (b - a) * t;
function mix(c1, c2, t) {
  return [lerp(c1[0], c2[0], t), lerp(c1[1], c2[1], t), lerp(c1[2], c2[2], t)];
}

const BG_TOP = [46, 158, 91]; // #2E9E5B
const BG_BOTTOM = [20, 83, 45]; // #14532D
const LEAF = [236, 251, 240]; // near-white green
const VEIN = [46, 158, 91]; // #2E9E5B

// Returns {r,g,b,a} (0..255) for a sub-pixel sample at (x,y).
function sample(x, y, size, maskable) {
  const half = size / 2;
  const cx = x - half;
  const cy = y - half;

  // Tile mask: full-bleed for maskable, rounded square otherwise.
  let onTile = true;
  if (!maskable) {
    const r = size * 0.22;
    const b = half - r;
    const qx = Math.abs(cx) - b;
    const qy = Math.abs(cy) - b;
    const corner = Math.hypot(Math.max(qx, 0), Math.max(qy, 0));
    onTile = corner <= r;
  }
  if (!onTile) return [0, 0, 0, 0];

  // Background gradient (top -> bottom).
  const t = y / size;
  let [r, g, b] = mix(BG_TOP, BG_BOTTOM, t);

  // Leaf: pointed lens shape |across| <= a*(1-along^2), rotated 45deg.
  const L = size * (maskable ? 0.27 : 0.34);
  const ang = (-45 * Math.PI) / 180;
  const ca = Math.cos(ang);
  const sa = Math.sin(ang);
  const along = (cx * ca + cy * sa) / L;
  const across = (-cx * sa + cy * ca) / L;
  const a = 0.62;
  if (Math.abs(along) <= 1) {
    const wHalf = a * (1 - along * along);
    if (Math.abs(across) <= wHalf) {
      // Slight shading across the leaf for depth.
      const shade = 1 - Math.abs(across) / (wHalf + 1e-6) * 0.12;
      r = LEAF[0] * shade;
      g = LEAF[1] * shade;
      b = LEAF[2] * shade;
      // Midrib vein + a few side veins.
      const ribW = 0.05;
      if (Math.abs(across) < ribW) {
        [r, g, b] = VEIN;
      }
    }
  }
  return [r, g, b, 255];
}

function renderIcon(size, maskable) {
  const SS = 4; // supersampling factor
  const rgba = Buffer.alloc(size * size * 4);
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let ar = 0,
        ag = 0,
        ab = 0,
        aa = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const x = px + (sx + 0.5) / SS;
          const y = py + (sy + 0.5) / SS;
          const [r, g, b, alpha] = sample(x, y, size, maskable);
          const af = alpha / 255;
          ar += r * af;
          ag += g * af;
          ab += b * af;
          aa += af;
        }
      }
      const n = SS * SS;
      const idx = (py * size + px) * 4;
      const cov = aa / n;
      // Un-premultiply for straight-alpha PNG.
      rgba[idx] = cov > 0 ? Math.round(ar / aa) : 0;
      rgba[idx + 1] = cov > 0 ? Math.round(ag / aa) : 0;
      rgba[idx + 2] = cov > 0 ? Math.round(ab / aa) : 0;
      rgba[idx + 3] = Math.round(cov * 255);
    }
  }
  return encodePng(size, size, rgba);
}

mkdirSync(OUT_DIR, { recursive: true });
const targets = [
  ["icon-192.png", 192, false],
  ["icon-512.png", 512, false],
  ["icon-maskable-512.png", 512, true],
  ["apple-touch-icon-180.png", 180, false],
];
for (const [name, size, maskable] of targets) {
  const png = renderIcon(size, maskable);
  writeFileSync(join(OUT_DIR, name), png);
  console.log(`wrote ${name} (${size}x${size}, ${png.length} bytes)`);
}
console.log("Done -> " + OUT_DIR);
