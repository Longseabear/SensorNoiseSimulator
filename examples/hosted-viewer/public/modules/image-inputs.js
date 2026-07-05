(() => {
function channelForPixel(x, y, pixelType, pixelOrderId) {
  if (pixelOrderId !== 0) {
    throw new Error(`Unsupported pixel order: ${pixelOrderId}`);
  }

  if (pixelType === "Bayer") {
    const evenX = x % 2 === 0;
    const evenY = y % 2 === 0;
    if (evenY && evenX) return "g";
    if (evenY && !evenX) return "r";
    if (!evenY && evenX) return "b";
    return "g";
  }

  if (pixelType === "Tetra" || pixelType === "TetraSquare") {
    const xx = x % 4;
    const yy = y % 4;
    if (yy < 2 && xx < 2) return "g";
    if (yy < 2 && xx >= 2) return "r";
    if (yy >= 2 && xx < 2) return "b";
    return "g";
  }

  throw new Error(`Unsupported pixel type: ${pixelType}`);
}

function sampleHdrRgbToSensorMosaic(hdr, { pixelType, pixelOrder }) {
  const data = new Float32Array(hdr.width * hdr.height);
  const exposureReference = Math.max(1e-6, hdr.exposureReference ?? 1);

  for (let y = 0; y < hdr.height; y += 1) {
    for (let x = 0; x < hdr.width; x += 1) {
      const index = y * hdr.width + x;
      const channel = channelForPixel(x, y, pixelType, Number(pixelOrder));
      data[index] = Math.min(1, hdr[channel][index] / exposureReference);
    }
  }

  return { width: hdr.width, height: hdr.height, data };
}

function parseHdrToRgbFloat(buffer, metadata = {}) {
  const { bytes, width, height, payloadStart } = readHdrHeader(buffer);
  const payload = decodeRadiancePayload(bytes.subarray(payloadStart), width, height);

  const rData = new Float32Array(width * height);
  const gData = new Float32Array(width * height);
  const bData = new Float32Array(width * height);
  const luminanceSamples = [];
  const sampleStep = Math.max(1, Math.floor((width * height) / 65536));
  for (let index = 0; index < width * height; index += 1) {
    const offset = index * 4;
    const exponent = payload[offset + 3];
    if (exponent === 0) {
      rData[index] = 0;
      gData[index] = 0;
      bData[index] = 0;
      continue;
    }
    const scale = 2 ** (exponent - 128) / 256;
    rData[index] = payload[offset] * scale;
    gData[index] = payload[offset + 1] * scale;
    bData[index] = payload[offset + 2] * scale;
    if (index % sampleStep === 0) {
      luminanceSamples.push(0.2126 * rData[index] + 0.7152 * gData[index] + 0.0722 * bData[index]);
    }
  }

  luminanceSamples.sort((a, b) => a - b);
  const exposureReference = Math.max(
    1e-6,
    Number(metadata.photonWhitePoint ?? luminanceSamples[Math.floor(luminanceSamples.length * 0.75)] ?? 1),
  );

  return { width, height, r: rData, g: gData, b: bData, exposureReference };
}

function parseHdrDirectToSensorMosaic(buffer, metadata = {}, sensorSampling) {
  const { bytes, width, height, payloadStart } = readHdrHeader(buffer);
  const payload = decodeRadiancePayload(bytes.subarray(payloadStart), width, height);
  const pixelCount = width * height;
  const sampleStep = Math.max(1, Math.floor(pixelCount / 65536));
  const luminanceSamples = [];
  for (let index = 0; index < pixelCount; index += sampleStep) {
    const offset = index * 4;
    const exponent = payload[offset + 3];
    if (exponent === 0) {
      luminanceSamples.push(0);
      continue;
    }
    const scale = 2 ** (exponent - 128) / 256;
    const r = payload[offset] * scale;
    const g = payload[offset + 1] * scale;
    const b = payload[offset + 2] * scale;
    luminanceSamples.push(0.2126 * r + 0.7152 * g + 0.0722 * b);
  }
  luminanceSamples.sort((a, b) => a - b);
  const exposureReference = Math.max(
    1e-6,
    Number(metadata.photonWhitePoint ?? luminanceSamples[Math.floor(luminanceSamples.length * 0.75)] ?? 1),
  );

  const data = new Float32Array(pixelCount);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x;
      const offset = index * 4;
      const exponent = payload[offset + 3];
      if (exponent === 0) {
        data[index] = 0;
        continue;
      }
      const scale = 2 ** (exponent - 128) / 256;
      const channel = channelForPixel(x, y, sensorSampling.pixelType, Number(sensorSampling.pixelOrder));
      const byteOffset = channel === "r" ? 0 : channel === "g" ? 1 : 2;
      data[index] = Math.min(1, (payload[offset + byteOffset] * scale) / exposureReference);
    }
  }

  return { width, height, data };
}

function parseRawU16ToFloat(buffer, metadata) {
  const values = new Uint16Array(buffer);
  const expectedPixels = metadata.width * metadata.height;
  if (values.length < expectedPixels) {
    throw new Error("RAW file is smaller than metadata expects.");
  }

  const blackLevel = metadata.blackLevel ?? 64;
  const whiteLevel = metadata.whiteLevel ?? 1023;
  const range = Math.max(1, whiteLevel - blackLevel);
  const data = new Float32Array(expectedPixels);

  for (let index = 0; index < expectedPixels; index += 1) {
    data[index] = Math.min(1, Math.max(0, (values[index] - blackLevel) / range));
  }

  return { width: metadata.width, height: metadata.height, data };
}

function hdrPixelCountFromBuffer(buffer) {
  const { width, height } = readHdrHeader(buffer);
  return width * height;
}

function readHdrHeader(buffer) {
  const bytes = new Uint8Array(buffer);
  const headerProbe = new TextDecoder("ascii").decode(bytes.slice(0, Math.min(bytes.length, 2048)));
  const resolution = /-Y\s+(\d+)\s+\+X\s+(\d+)/.exec(headerProbe);
  if (!resolution) {
    throw new Error("Unsupported HDR resolution header.");
  }

  const height = Number(resolution[1]);
  const width = Number(resolution[2]);
  let payloadStart = resolution.index + resolution[0].length;
  while (payloadStart < bytes.length && (bytes[payloadStart] === 0x0d || bytes[payloadStart] === 0x0a)) {
    payloadStart += 1;
  }
  return { bytes, width, height, payloadStart };
}

function decodeRadiancePayload(payload, width, height) {
  const expectedBytes = width * height * 4;

  if (width < 8 || width > 32767 || payload[0] !== 2 || payload[1] !== 2 || (payload[2] & 0x80) !== 0) {
    if (payload.length < expectedBytes) {
      throw new Error("HDR payload is smaller than expected.");
    }
    return payload.slice(0, expectedBytes);
  }

  const output = new Uint8Array(expectedBytes);
  let inputOffset = 0;
  let outputOffset = 0;
  const scanline = new Uint8Array(width * 4);

  for (let y = 0; y < height; y += 1) {
    if (
      inputOffset + 4 > payload.length ||
      payload[inputOffset] !== 2 ||
      payload[inputOffset + 1] !== 2 ||
      ((payload[inputOffset + 2] << 8) | payload[inputOffset + 3]) !== width
    ) {
      throw new Error("Unsupported or corrupt HDR RLE scanline.");
    }
    inputOffset += 4;

    for (let channel = 0; channel < 4; channel += 1) {
      let x = 0;
      while (x < width) {
        if (inputOffset >= payload.length) {
          throw new Error("Unexpected end of HDR RLE payload.");
        }
        const count = payload[inputOffset++];
        if (count > 128) {
          const runLength = count - 128;
          const value = payload[inputOffset++];
          scanline[channel * width + x] = value;
          for (let run = 1; run < runLength; run += 1) {
            scanline[channel * width + x + run] = value;
          }
          x += runLength;
        } else {
          for (let run = 0; run < count; run += 1) {
            scanline[channel * width + x + run] = payload[inputOffset++];
          }
          x += count;
        }
      }
    }

    for (let x = 0; x < width; x += 1) {
      output[outputOffset++] = scanline[x];
      output[outputOffset++] = scanline[width + x];
      output[outputOffset++] = scanline[width * 2 + x];
      output[outputOffset++] = scanline[width * 3 + x];
    }
  }

  return output;
}

globalThis.NoiseInputs = {
  channelForPixel,
  hdrPixelCountFromBuffer,
  parseHdrDirectToSensorMosaic,
  parseHdrToRgbFloat,
  parseRawU16ToFloat,
  sampleHdrRgbToSensorMosaic,
};
})();
