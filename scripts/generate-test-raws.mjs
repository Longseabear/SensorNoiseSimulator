import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = dirname(fileURLToPath(new URL("../package-marker", import.meta.url)));
const outDir = join(repoRoot, "examples", "hosted-viewer", "public", "assets", "test-inputs", "raw");

const width = 512;
const height = 256;
const blackLevel = 64;
const whiteLevel = 1023;
const usableRange = whiteLevel - blackLevel;

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function gaussian(x, y, cx, cy, radius) {
  return Math.exp(-((x - cx) ** 2 + (y - cy) ** 2) / (radius * radius));
}

function sceneGradient(x, y) {
  const u = x / (width - 1);
  const v = y / (height - 1);
  const ramp = clamp01(0.02 + u * 0.92 + v * 0.18);
  const highlight = gaussian(u, v, 0.74, 0.34, 0.09) * 0.55;
  return {
    r: clamp01(ramp * 1.08 + highlight),
    g: clamp01(ramp * (0.92 + 0.08 * v) + highlight * 0.82),
    b: clamp01(ramp * (0.72 + 0.18 * (1 - v)) + highlight * 0.64),
  };
}

function sceneLowLight(x, y) {
  const u = x / (width - 1);
  const v = y / (height - 1);
  const base = 0.006 + u * 0.055;
  const softSpot = gaussian(u, v, 0.36, 0.48, 0.2) * 0.16;
  const rowPattern = Math.floor(y / 16) % 2 === 0 ? 0.006 : 0;
  return {
    r: clamp01(base * 1.1 + softSpot + rowPattern),
    g: clamp01(base + softSpot * 0.86 + rowPattern),
    b: clamp01(base * 1.25 + softSpot * 0.58 + rowPattern),
  };
}

function sceneColorChart(x, y) {
  const colors = [
    { r: 0.18, g: 0.18, b: 0.18 },
    { r: 0.85, g: 0.12, b: 0.1 },
    { r: 0.12, g: 0.75, b: 0.16 },
    { r: 0.1, g: 0.16, b: 0.9 },
    { r: 0.92, g: 0.74, b: 0.12 },
    { r: 0.1, g: 0.78, b: 0.86 },
    { r: 0.86, g: 0.16, b: 0.78 },
    { r: 0.95, g: 0.95, b: 0.95 },
  ];
  const col = Math.min(colors.length - 1, Math.floor((x / width) * colors.length));
  const gain = [0.2, 0.7, 1.0, 1.35][Math.min(3, Math.floor((y / height) * 4))];
  const c = colors[col];
  return {
    r: clamp01(c.r * gain),
    g: clamp01(c.g * gain),
    b: clamp01(c.b * gain),
  };
}

function channelForBayerGrbg(x, y) {
  const evenX = x % 2 === 0;
  const evenY = y % 2 === 0;
  if (evenY && evenX) return "g";
  if (evenY && !evenX) return "r";
  if (!evenY && evenX) return "b";
  return "g";
}

function channelForTetraGrbg(x, y) {
  const xx = x % 4;
  const yy = y % 4;
  if (yy < 2 && xx < 2) return "g";
  if (yy < 2 && xx >= 2) return "r";
  if (yy >= 2 && xx < 2) return "b";
  return "g";
}

function valueToU16(value) {
  return Math.round(blackLevel + clamp01(value) * usableRange);
}

function writeRaw(name, scene, channelForPixel) {
  const data = new Uint16Array(width * height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const rgb = scene(x, y);
      data[y * width + x] = valueToU16(rgb[channelForPixel(x, y)]);
    }
  }
  writeFileSync(join(outDir, name), Buffer.from(data.buffer));
}

mkdirSync(outDir, { recursive: true });

const inputs = [
  {
    file: "bayer_grbg_gradient_512x256_u16le.raw",
    label: "Bayer GRBG gradient",
    purpose: "2x2 Bayer demosaic, EIT, gain, and clipping checks",
    pixelType: "Bayer",
    pixelPattern: ["G R", "B G"],
    scene: sceneGradient,
    channelForPixel: channelForBayerGrbg,
  },
  {
    file: "bayer_grbg_low_light_512x256_u16le.raw",
    label: "Bayer GRBG low light",
    purpose: "2x2 Bayer read-noise and shadow checks",
    pixelType: "Bayer",
    pixelPattern: ["G R", "B G"],
    scene: sceneLowLight,
    channelForPixel: channelForBayerGrbg,
  },
  {
    file: "tetra_grbg_low_light_512x256_u16le.raw",
    label: "Tetra GRBG low light",
    purpose: "Grouped same-color low-light checks",
    pixelType: "Tetra",
    pixelPattern: ["G G R R", "G G R R", "B B G G", "B B G G"],
    scene: sceneLowLight,
    channelForPixel: channelForTetraGrbg,
  },
  {
    file: "tetrasquare_grbg_color_512x256_u16le.raw",
    label: "TetraSquare GRBG color chart",
    purpose: "4x4 grouped color arrangement and color response checks",
    pixelType: "TetraSquare",
    pixelPattern: ["G G R R", "G G R R", "B B G G", "B B G G"],
    scene: sceneColorChart,
    channelForPixel: channelForTetraGrbg,
  },
];

for (const input of inputs) {
  writeRaw(input.file, input.scene, input.channelForPixel);
}

writeFileSync(
  join(outDir, "manifest.json"),
  JSON.stringify(
    {
      kind: "bayer_raw_u16_test_set",
      generatedBy: "scripts/generate-test-raws.mjs",
      defaults: {
        width,
        height,
        byteOrder: "little-endian",
        sampleType: "uint16",
        blackLevel,
        whiteLevel,
        pixelOrder: {
          id: 0,
          name: "GRBG",
        },
      },
      inputs: inputs.map((input) => ({
        kind: "bayer_raw_u16",
        uri: `./assets/test-inputs/raw/${input.file}`,
        label: input.label,
        purpose: input.purpose,
        width,
        height,
        byteOrder: "little-endian",
        sampleType: "uint16",
        blackLevel,
        whiteLevel,
        pixelOrder: {
          id: 0,
          name: "GRBG",
        },
        pixelType: input.pixelType,
        pixelPattern: input.pixelPattern,
      })),
    },
    null,
    2,
  ),
);

console.log(`Generated RAW test inputs in ${outDir}`);
