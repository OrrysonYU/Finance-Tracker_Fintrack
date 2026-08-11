import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const charcoal = [23, 32, 51, 255];
const white = [255, 255, 255, 255];
const transparent = [0, 0, 0, 0];

function quadratic(from, control, to, steps = 20) {
  return Array.from({ length: steps }, (_, index) => {
    const t = (index + 1) / steps;
    const inverse = 1 - t;
    return [
      inverse * inverse * from[0] + 2 * inverse * t * control[0] + t * t * to[0],
      inverse * inverse * from[1] + 2 * inverse * t * control[1] + t * t * to[1],
    ];
  });
}

const pediment = [
  [128, 36],
  [205, 94],
  ...quadratic([205, 94], [211, 99], [203, 108]),
  [53, 108],
  ...quadratic([53, 108], [45, 99], [51, 94]),
];

const rectangles = [
  [48, 116, 160, 18, 7],
  [62, 151, 32, 55, 9],
  [112, 139, 32, 67, 9],
  [162, 125, 32, 81, 9],
  [42, 213, 172, 22, 9],
];

function pointInPolygon(x, y, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

function pointInRoundedRect(x, y, [left, top, width, height, radius]) {
  const right = left + width;
  const bottom = top + height;
  if (x < left || x > right || y < top || y > bottom) return false;
  if (x >= left + radius && x <= right - radius) return true;
  if (y >= top + radius && y <= bottom - radius) return true;
  const cornerX = x < left + radius ? left + radius : right - radius;
  const cornerY = y < top + radius ? top + radius : bottom - radius;
  return (x - cornerX) ** 2 + (y - cornerY) ** 2 <= radius ** 2;
}

function inMark(x, y) {
  return pointInPolygon(x, y, pediment) || rectangles.some((rect) => pointInRoundedRect(x, y, rect));
}

function blend(background, foreground, coverage) {
  return background.map((channel, index) => {
    if (index === 3) return Math.round(background[3] + (foreground[3] - background[3]) * coverage);
    const backgroundAlpha = background[3] / 255;
    const foregroundAlpha = coverage * (foreground[3] / 255);
    const outputAlpha = foregroundAlpha + backgroundAlpha * (1 - foregroundAlpha);
    if (!outputAlpha) return 0;
    return Math.round(
      (foreground[index] * foregroundAlpha + background[index] * backgroundAlpha * (1 - foregroundAlpha)) /
        outputAlpha,
    );
  });
}

function render(size, { background = transparent, inset = 0 } = {}) {
  const pixels = Buffer.alloc(size * size * 4);
  // Small favicons need stronger supersampling; high-resolution application
  // icons already have enough native pixels to preserve smooth geometry.
  const samples = size <= 48 ? 4 : size <= 256 ? 2 : 1;
  const usable = size * (1 - inset * 2);
  const scale = usable / 256;
  const offset = size * inset;

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let hits = 0;
      for (let sampleY = 0; sampleY < samples; sampleY += 1) {
        for (let sampleX = 0; sampleX < samples; sampleX += 1) {
          const viewX = (x + (sampleX + 0.5) / samples - offset) / scale;
          const viewY = (y + (sampleY + 0.5) / samples - offset) / scale;
          if (inMark(viewX, viewY)) hits += 1;
        }
      }
      const color = blend(background, charcoal, hits / (samples * samples));
      const index = (y * size + x) * 4;
      pixels.set(color, index);
    }
  }
  return pixels;
}

const crcTable = Array.from({ length: 256 }, (_, value) => {
  let current = value;
  for (let bit = 0; bit < 8; bit += 1) {
    current = current & 1 ? 0xedb88320 ^ (current >>> 1) : current >>> 1;
  }
  return current >>> 0;
});

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const name = Buffer.from(type);
  const output = Buffer.alloc(12 + data.length);
  output.writeUInt32BE(data.length, 0);
  name.copy(output, 4);
  data.copy(output, 8);
  output.writeUInt32BE(crc32(Buffer.concat([name, data])), 8 + data.length);
  return output;
}

function png(size, pixels) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header.set([8, 6, 0, 0, 0], 8);
  const rows = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y += 1) {
    pixels.copy(rows, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(rows, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function write(relativePath, buffer) {
  const target = resolve(root, relativePath);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, buffer);
}

const faviconPngs = [16, 32, 48].map((size) => png(size, render(size, { inset: 0.02 })));
const icoHeader = Buffer.alloc(6 + faviconPngs.length * 16);
icoHeader.writeUInt16LE(0, 0);
icoHeader.writeUInt16LE(1, 2);
icoHeader.writeUInt16LE(faviconPngs.length, 4);
let icoOffset = icoHeader.length;
faviconPngs.forEach((image, index) => {
  const entry = 6 + index * 16;
  const size = [16, 32, 48][index];
  icoHeader[entry] = size;
  icoHeader[entry + 1] = size;
  icoHeader.writeUInt16LE(1, entry + 4);
  icoHeader.writeUInt16LE(32, entry + 6);
  icoHeader.writeUInt32LE(image.length, entry + 8);
  icoHeader.writeUInt32LE(icoOffset, entry + 12);
  icoOffset += image.length;
});

write("public/brand/fintrack-mark.png", png(256, render(256)));
write("public/icons/apple-touch-icon.png", png(180, render(180, { background: white, inset: 0.09 })));
write("public/icons/fintrack-192.png", png(192, render(192, { background: white, inset: 0.09 })));
write("public/icons/fintrack-512.png", png(512, render(512, { background: white, inset: 0.09 })));
write("public/favicon.ico", Buffer.concat([icoHeader, ...faviconPngs]));

console.log("Generated Fintrack PNG and ICO assets from the approved geometry.");
