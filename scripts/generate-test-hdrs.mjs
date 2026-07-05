import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = dirname(fileURLToPath(new URL("../package-marker", import.meta.url)));
const outDir = join(repoRoot, "examples", "hosted-viewer", "public", "assets", "test-inputs");

function rgbePixel(r, g, b) {
  const maxValue = Math.max(r, g, b);
  if (maxValue < 1e-32) {
    return [0, 0, 0, 0];
  }

  const exponent = Math.floor(Math.log2(maxValue)) + 1;
  const scale = 256 / 2 ** exponent;
  return [
    Math.max(0, Math.min(255, Math.round(r * scale))),
    Math.max(0, Math.min(255, Math.round(g * scale))),
    Math.max(0, Math.min(255, Math.round(b * scale))),
    exponent + 128,
  ];
}

function writeHdr(name, width, height, sampler) {
  const header = Buffer.from(`#?RADIANCE\nFORMAT=32-bit_rle_rgbe\n\n-Y ${height} +X ${width}\n`, "ascii");
  const pixels = Buffer.alloc(width * height * 4);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const [r, g, b] = sampler(x, y, width, height);
      const [re, ge, be, e] = rgbePixel(r, g, b);
      const offset = (y * width + x) * 4;
      pixels[offset] = re;
      pixels[offset + 1] = ge;
      pixels[offset + 2] = be;
      pixels[offset + 3] = e;
    }
  }

  writeFileSync(join(outDir, name), Buffer.concat([header, pixels]));
}

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function gaussian(x, y, cx, cy, radius) {
  return Math.exp(-((x - cx) ** 2 + (y - cy) ** 2) / (radius * radius));
}

mkdirSync(outDir, { recursive: true });

writeHdr("gradient_ramp_512x256.hdr", 512, 256, (x, y, width, height) => {
  const u = x / (width - 1);
  const v = y / (height - 1);
  const exposureRamp = 2 ** (-6 + u * 14);
  const tint = 0.65 + 0.35 * v;
  return [exposureRamp * tint, exposureRamp * (0.9 + 0.1 * v), exposureRamp * (1.15 - 0.35 * v)];
});

writeHdr("linear_photon_ramp_512x256.hdr", 512, 256, (x, y, width) => {
  const u = x / (width - 1);
  return [u, u, u];
});

writeHdr("low_light_noise_512x256.hdr", 512, 256, (x, y, width, height) => {
  const u = x / (width - 1);
  const v = y / (height - 1);
  const base = 0.005 + 0.05 * u;
  const softSpot = gaussian(u, v, 0.42, 0.45, 0.18) * 0.18;
  const dimStripe = Math.floor(y / 24) % 2 === 0 ? 0.008 : 0;
  return [base + softSpot + dimStripe, base * 0.95 + softSpot * 0.86, base * 1.15 + softSpot * 0.62];
});

writeHdr("highlight_clip_512x256.hdr", 512, 256, (x, y, width, height) => {
  const u = x / (width - 1);
  const v = y / (height - 1);
  const base = 0.04 + u * 0.9;
  const hotA = gaussian(u, v, 0.32, 0.42, 0.055) * 160;
  const hotB = gaussian(u, v, 0.72, 0.55, 0.09) * 28;
  return [base + hotA + hotB, base * 0.82 + hotA * 0.86 + hotB, base * 0.72 + hotA * 0.65 + hotB * 1.25];
});

writeHdr("color_patches_512x256.hdr", 512, 256, (x, y, width, height) => {
  const colors = [
    [0.18, 0.18, 0.18],
    [1.8, 0.2, 0.15],
    [0.2, 1.5, 0.25],
    [0.2, 0.28, 2.2],
    [2.2, 1.7, 0.2],
    [0.25, 1.8, 1.9],
    [2.4, 0.35, 2.1],
    [8.0, 8.0, 8.0],
  ];
  const col = Math.min(colors.length - 1, Math.floor((x / width) * colors.length));
  const rowGain = [0.15, 1.0, 4.0, 16.0][Math.min(3, Math.floor((y / height) * 4))];
  const edge = Math.min(x % 64, 63 - (x % 64), y % 64, 63 - (y % 64));
  const border = edge < 2 ? 0.25 : 1.0;
  const [r, g, b] = colors[col];
  return [r * rowGain * border, g * rowGain * border, b * rowGain * border];
});

writeFileSync(
  join(outDir, "manifest.json"),
  JSON.stringify(
    {
      kind: "hdr_scene_rgb_test_set",
      generatedBy: "scripts/generate-test-hdrs.mjs",
      inputs: [
        {
          kind: "hdr_scene_rgb",
          uri: "./assets/test-inputs/linear_photon_ramp_512x256.hdr",
          label: "Linear photon ramp",
          purpose: "Uniform 0..1 photon ramp for ADC histogram sanity checks",
          photonWhitePoint: 1.0,
        },
        {
          kind: "hdr_scene_rgb",
          uri: "./assets/test-inputs/gradient_ramp_512x256.hdr",
          label: "Gradient ramp",
          purpose: "Exposure, EIT, gain, gamma, and banding checks",
        },
        {
          kind: "hdr_scene_rgb",
          uri: "./assets/test-inputs/low_light_noise_512x256.hdr",
          label: "Low light",
          purpose: "Read-noise and shadow response checks",
        },
        {
          kind: "hdr_scene_rgb",
          uri: "./assets/test-inputs/highlight_clip_512x256.hdr",
          label: "Highlight clip",
          purpose: "Saturation, ADC clipping, and tone-map checks",
        },
        {
          kind: "hdr_scene_rgb",
          uri: "./assets/test-inputs/color_patches_512x256.hdr",
          label: "Color patches",
          purpose: "White balance, color matrix, and exposure bracket checks",
        },
        {
          kind: "hdr_scene_rgb",
          uri: "./assets/studio_small_08_1k.hdr",
          label: "Studio Small 08 HDRI",
          purpose: "Downloaded CC0 HDRI sample for real-world HDR scene input",
        },
        {
          kind: "hdr_scene_rgb",
          uri: "./assets/afrikaans_church_interior_1k.hdr",
          label: "Afrikaans Church Interior HDRI",
          purpose: "Downloaded CC0 high-contrast church interior HDR scene",
        },
        {
          kind: "hdr_scene_rgb",
          uri: "./assets/memorial_church_debevec.hdr",
          label: "Memorial Church Perspective HDR",
          purpose: "Perspective HDR research radiance map from Debevec and Malik",
        },
      ],
    },
    null,
    2,
  ),
);

console.log(`Generated HDR test inputs in ${outDir}`);
