# Input Formats

NoiseSimulator supports two primary image input families:

1. HDR RGB images
2. 16-bit Bayer raw images

Both input types are served by the server as files and parsed on the client. The
server must not run image processing.

Inputs can come from two sources:

```text
server sample
  user selects a bundled example
  browser fetches the selected static file from the server
  server sends bytes only

local upload
  user selects a local file in the browser
  browser reads the file with the File API
  file bytes never leave the client
```

Local uploads must never be posted, streamed, logged, cached, or otherwise sent
to the server by the application.

## 1. HDR RGB Image

```text
extension: .hdr
kind: hdr_scene_rgb
typical format: Radiance RGBE / FORMAT=32-bit_rle_rgbe
```

HDR images are treated as scene-level RGB radiance inputs. They are not rendered
directly as RGB in the sensor simulation path. They must be sampled through the
selected virtual sensor pattern before entering noise, ADC, demosaic, and ISP.

Client-side pipeline:

```text
.hdr file
  -> fetch as ArrayBuffer
  -> parse Radiance RGBE on the client
  -> convert to float RGB radiance
  -> sample through selected pixel order and pixel type
  -> virtual sensor/electron mosaic
  -> virtual exposure / EIT
  -> noise / gain / ADC simulation using selected ADC bit depth
  -> simple ISP / display
```

Important distinction: `.hdr` is not native sensor raw. It is RGB scene data. If
the viewer needs to simulate a raw sensor pipeline from HDR input, it must first
convert scene RGB into a virtual sensor/electron mosaic using the active pixel
order and pixel type.

## 2. 16-Bit Bayer Raw Image

```text
kind: bayer_raw_u16
sample type: unsigned 16-bit integer
layout: single-channel Bayer-family mosaic
byte order: must be specified by metadata
width: must be specified by metadata
height: must be specified by metadata
black level: must be specified by metadata or sensor profile
white level: must be specified by metadata or sensor profile
```

16-bit Bayer raw is treated as sensor-level input. It should enter the pipeline
before demosaic and ISP.

Client-side pipeline:

```text
16-bit raw file
  -> fetch as ArrayBuffer
  -> parse as Uint16Array on the client
  -> upload raw mosaic to WebGPU buffer/texture
  -> black-level / white-level normalization
  -> EIT / gain / noise / ADC model as applicable
  -> ADC quantization using selected bit depth
  -> demosaic according to pixel order and pixel type
  -> simple ISP / display
```

## Bayer Pixel Order

The Bayer pixel order must be explicit metadata. The first known order is:

```text
order id: 0
name: GRBG
2x2 row-major pattern:
  G R
  B G
```

This follows the user's shorthand: `0 = GR / B G` or `G R B G` in row-major
order. Confirm this mapping before locking the binary schema.

Future order ids should be added as explicit enum values rather than inferred
from filenames.

## Pixel Type

The raw input also has a pixel type. Initial supported pixel types:

```text
Bayer
  classic 2x2 Bayer mosaic
  order id 0 / GRBG:
    G R
    B G

Tetra
  grouped same-color low-light structure
  order id 0 / GRBG:
    G G R R
    G G R R
    B B G G
    B B G G

TetraSquare
  4x4 grouped structure
  order id 0 / GRBG:
    G G R R
    G G R R
    B B G G
    B B G G
```

Open definition: if Tetra and TetraSquare have different 4x4 color maps or
different binning semantics, document that difference before locking shader
behavior.

## Suggested Metadata

Raw files need sidecar metadata or an equivalent manifest entry:

```json
{
  "kind": "bayer_raw_u16",
  "uri": "./assets/sample.raw",
  "width": 4096,
  "height": 3072,
  "byteOrder": "little-endian",
  "pixelOrder": {
    "id": 0,
    "name": "GRBG"
  },
  "pixelType": "Bayer",
  "blackLevel": 64,
  "whiteLevel": 1023,
  "adcBits": 10
}
```

For HDR inputs:

```json
{
  "kind": "hdr_scene_rgb",
  "uri": "./assets/studio_small_08_1k.hdr",
  "format": "radiance-rgbe"
}
```

Synthetic HDR test inputs are listed in:

```text
examples/hosted-viewer/public/assets/test-inputs/manifest.json
```

Synthetic 16-bit raw test inputs are listed in:

```text
examples/hosted-viewer/public/assets/test-inputs/raw/manifest.json
```

## Implementation Notes

- Keep input parsing client-side.
- Keep local uploads client-only. Do not send user-provided image bytes to the
  server.
- Keep source image data resident in browser memory and upload to GPU memory for
  realtime processing.
- Do not infer critical raw metadata from extension alone.
- Treat `.hdr` and `bayer_raw_u16` as different semantic input kinds.
- For sensor simulation, route `.hdr` through virtual sensor sampling before
  noise, ADC, demosaic, or ISP.
- Keep loader code separate from ISP/noise shader code.

## SensorPRS Metadata

SensorPRS metadata describes the sensor model used to convert normalized photon
input into electrons, voltage, and ADC code.

```text
photon_input: 0..1
electron = photon_input * SensorFWC
voltage_uV = electron * SensorCG
adc_code = Pedestal + voltage_uV / ADCFullScale * (2^ADCBits - 1 - Pedestal)
```

Units are fixed:

```text
SensorFWC  e-
SensorRN   e-
SensorCG   uV/e-
SensorPFPN uV
Pedestal   LSB
ADCFullScale uV
```

Seed classes must remain separate:

```text
PRNU / PFPN / Dark
  fixed-pattern seeds, stable at the same pixel position

ShotNoise
  photon-domain seed, shared by LCG/HCG branches for HDR simulations

ReadNoise
  readout-path seed, separate for LCG/HCG when the read path differs
```

Example sensor profiles:

```text
examples/hosted-viewer/public/sensors/BasicSensorLCG.sensor-prs.json
examples/hosted-viewer/public/sensors/BasicSensorHCG.sensor-prs.json
```
