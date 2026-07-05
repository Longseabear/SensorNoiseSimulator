(() => {
const ispShader = `
struct Params {
  width: f32,
  height: f32,
  eit: f32,
  analogGain: f32,
  digitalGain: f32,
  black: f32,
  seed: f32,
  pixelType: f32,
  adcLevels: f32,
  viewMode: f32,
  sensorFWC: f32,
  sensorRN: f32,
  sensorCG: f32,
  sensorPRNU: f32,
  sensorPFPN: f32,
  pedestal: f32,
  adcFullScale: f32,
  wbR: f32,
  wbB: f32,
  gamma: f32,
  sourceWidth: f32,
  acquisitionMode: f32,
  sensorRN2: f32,
  sensorCG2: f32,
  readNoiseSeed: f32,
  readNoiseSeed2: f32,
  sensorDark: f32,
  darkSeed: f32,
  prnuSeed: f32,
  pfpnSeed: f32,
  shotSeed: f32,
  _pad0: f32,
};

@group(0) @binding(0) var rawTex: texture_2d<f32>;
@group(0) @binding(1) var<uniform> params: Params;

struct VertexOut {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
};

@vertex
fn vs(@builtin(vertex_index) vertexIndex: u32) -> VertexOut {
  var positions = array<vec2f, 3>(
    vec2f(-1.0, -1.0),
    vec2f(3.0, -1.0),
    vec2f(-1.0, 3.0)
  );

  var out: VertexOut;
  out.position = vec4f(positions[vertexIndex], 0.0, 1.0);
  out.uv = out.position.xy * 0.5 + vec2f(0.5);
  out.uv.y = 1.0 - out.uv.y;
  return out;
}

fn sourceWidthU32() -> u32 {
  return max(1u, u32(params.sourceWidth));
}

fn isSecondReadout(coord: vec2u) -> bool {
  return params.acquisitionMode > 0.5 && coord.x >= sourceWidthU32();
}

fn sourceCoord(coord: vec2u) -> vec2u {
  if (isSecondReadout(coord)) {
    return vec2u(coord.x - sourceWidthU32(), coord.y);
  }
  return vec2u(min(coord.x, sourceWidthU32() - 1u), coord.y);
}

fn paneStart(coord: vec2u) -> u32 {
  if (isSecondReadout(coord)) {
    return sourceWidthU32();
  }
  return 0u;
}

fn paneEnd(coord: vec2u) -> u32 {
  return paneStart(coord) + sourceWidthU32() - 1u;
}

fn readoutRN(coord: vec2u) -> f32 {
  if (isSecondReadout(coord)) {
    return params.sensorRN2;
  }
  return params.sensorRN;
}

fn readoutCG(coord: vec2u) -> f32 {
  if (isSecondReadout(coord)) {
    return params.sensorCG2;
  }
  return params.sensorCG;
}

fn readoutSeed(coord: vec2u) -> f32 {
  if (isSecondReadout(coord)) {
    return params.readNoiseSeed2;
  }
  return params.readNoiseSeed;
}

fn hashWithSeed(p: vec2f, noiseSeed: f32) -> f32 {
  let h = dot(p, vec2f(127.1, 311.7)) + noiseSeed;
  return fract(sin(h) * 43758.5453123);
}

fn centeredHashWithSeed(p: vec2f, noiseSeed: f32) -> f32 {
  return hashWithSeed(p, noiseSeed) * 2.0 - 1.0;
}

fn gaussianLike(p: vec2f, noiseSeed: f32) -> f32 {
  var sum = 0.0;
  for (var i = 0u; i < 6u; i = i + 1u) {
    let fi = f32(i);
    let raw = sin(p.x * (127.1 + fi * 31.7) + p.y * (311.7 + fi * 17.3) + noiseSeed + fi * 101.9) * 43758.5453;
    sum = sum + fract(raw);
  }
  return (sum - 3.0) / sqrt(0.5);
}

fn ditherForPixel(coord: vec2u) -> f32 {
  let p = vec2f(coord);
  let raw = sin(p.x * 419.2 + p.y * 173.7 + params.seed + 991.13) * 32719.917;
  return fract(raw) - 0.5;
}

fn sensorChannel(coord: vec2u) -> u32 {
  if (params.pixelType < 0.5) {
    let evenX = (coord.x % 2u) == 0u;
    let evenY = (coord.y % 2u) == 0u;

    if (evenY && evenX) {
      return 1u;
    }
    if (evenY && !evenX) {
      return 0u;
    }
    if (!evenY && evenX) {
      return 2u;
    }
    return 1u;
  }

  let xx = coord.x % 4u;
  let yy = coord.y % 4u;
  if (yy < 2u && xx < 2u) {
    return 1u;
  }
  if (yy < 2u && xx >= 2u) {
    return 0u;
  }
  if (yy >= 2u && xx < 2u) {
    return 2u;
  }
  return 1u;
}

fn sensorMask(coord: vec2u) -> vec3f {
  let channel = sensorChannel(sourceCoord(coord));
  if (channel == 0u) {
    return vec3f(1.0, 0.0, 0.0);
  }
  if (channel == 2u) {
    return vec3f(0.0, 0.0, 1.0);
  }
  return vec3f(0.0, 1.0, 0.0);
}

fn adcCodeFloat(coord: vec2u) -> f32 {
  let src = sourceCoord(coord);
  let photon = textureLoad(rawTex, src, 0).r;
  let signalElectron = max(0.0, photon * params.sensorFWC * params.eit);
  let cg = max(readoutCG(coord), 1e-6);
  let srcf = vec2f(src);
  let prnu = signalElectron * params.sensorPRNU * gaussianLike(srcf, params.prnuSeed);
  let shot = sqrt(max(signalElectron, 0.0)) * gaussianLike(srcf, params.shotSeed);
  let rn = readoutRN(coord) * gaussianLike(srcf, readoutSeed(coord));
  let pfpn = (params.sensorPFPN / cg) * gaussianLike(srcf, params.pfpnSeed);
  let dark = params.sensorDark * max(params.eit, 0.0) * gaussianLike(srcf, params.darkSeed);
  let electron = signalElectron + prnu + shot + rn + pfpn + dark;
  let voltage = electron * cg * params.analogGain;
  let normalizedSignal = voltage / max(params.adcFullScale, 1e-6) - params.black;
  return params.pedestal + normalizedSignal * max(0.0, params.adcLevels - params.pedestal);
}

fn adcSample(coord: vec2u) -> f32 {
  var adcCode = floor(adcCodeFloat(coord));
  if (abs(params.digitalGain - 1.0) > 1e-6) {
    let src = sourceCoord(coord);
    let dither = ditherForPixel(src);
    let signalCode = adcCode - params.pedestal;
    adcCode = round(params.pedestal + signalCode * params.digitalGain + dither);
  }
  return clamp(adcCode, 0.0, params.adcLevels) / max(params.adcLevels, 1.0);
}

fn adcSignalSample(coord: vec2u) -> f32 {
  let adcCode = adcSample(coord) * max(params.adcLevels, 1.0);
  let usableCodes = max(1.0, params.adcLevels - params.pedestal);
  return clamp((adcCode - params.pedestal) / usableCodes, 0.0, 1.0);
}

fn sampleChannel(coord: vec2u, targetChannel: u32) -> f32 {
  if (sensorChannel(sourceCoord(coord)) == targetChannel) {
    return adcSignalSample(coord);
  }

  let radius = select(2i, 1i, params.pixelType < 0.5);
  let minX = i32(paneStart(coord));
  let maxX = i32(paneEnd(coord));
  var sum = 0.0;
  var weightSum = 0.0;
  for (var dy = -2i; dy <= 2i; dy = dy + 1i) {
    for (var dx = -2i; dx <= 2i; dx = dx + 1i) {
      if (abs(dx) > radius || abs(dy) > radius) {
        continue;
      }
      let xx = u32(clamp(i32(coord.x) + dx, minX, maxX));
      let yy = u32(clamp(i32(coord.y) + dy, 0i, i32(params.height) - 1i));
      let sampleCoord = vec2u(xx, yy);
      if (sensorChannel(sourceCoord(sampleCoord)) != targetChannel) {
        continue;
      }
      let distance = max(1.0, f32(abs(dx) + abs(dy)));
      let weight = 1.0 / distance;
      sum = sum + adcSignalSample(sampleCoord) * weight;
      weightSum = weightSum + weight;
    }
  }
  if (weightSum > 0.0) {
    return sum / weightSum;
  }
  return adcSignalSample(coord);
}

@fragment
fn fs(in: VertexOut) -> @location(0) vec4f {
  let coord = vec2u(
    min(u32(in.uv.x * params.width), u32(params.width - 1.0)),
    min(u32(in.uv.y * params.height), u32(params.height - 1.0))
  );
  let src = sourceCoord(coord);

  if (params.viewMode > 3.5) {
    let r = clamp(sampleChannel(coord, 0u) * params.wbR, 0.0, 1.0);
    let g = clamp(sampleChannel(coord, 1u), 0.0, 1.0);
    let b = clamp(sampleChannel(coord, 2u) * params.wbB, 0.0, 1.0);
    let gamma = max(params.gamma, 0.01);
    return vec4f(pow(vec3f(r, g, b), vec3f(1.0 / gamma)), 1.0);
  }

  if (params.viewMode > 2.5) {
    let photon = textureLoad(rawTex, src, 0).r;
    let signalElectron = max(0.0, photon * params.sensorFWC * params.eit);
    let cg = max(readoutCG(coord), 1e-6);
    let srcf = vec2f(src);
    let noise = signalElectron * params.sensorPRNU * gaussianLike(srcf, params.prnuSeed)
      + sqrt(max(signalElectron, 0.0)) * gaussianLike(srcf, params.shotSeed)
      + readoutRN(coord) * gaussianLike(srcf, readoutSeed(coord))
      + (params.sensorPFPN / cg) * gaussianLike(srcf, params.pfpnSeed)
      + params.sensorDark * max(params.eit, 0.0) * gaussianLike(srcf, params.darkSeed);
    let sigma = max(1e-6, sqrt(max(signalElectron, 0.0) + readoutRN(coord) * readoutRN(coord) + pow(params.sensorPRNU * signalElectron, 2.0) + pow(params.sensorPFPN / cg, 2.0) + pow(params.sensorDark * max(params.eit, 0.0), 2.0)));
    let value = clamp(0.5 + noise / (6.0 * sigma), 0.0, 1.0);
    return vec4f(vec3f(value), 1.0);
  }

  if (params.viewMode > 1.5) {
    return vec4f(in.uv.x, in.uv.y, 0.25, 1.0);
  }

  var sample = adcSample(coord);
  if (params.viewMode > 0.5) {
    sample = clamp(abs(adcCodeFloat(coord) - floor(adcCodeFloat(coord))) * 8.0, 0.0, 1.0);
  }
  let rgb = pow(sample * sensorMask(coord), vec3f(1.0 / 2.2));

  return vec4f(rgb, 1.0);
}
`;

globalThis.NoiseShaders = { ispShader };
})();
