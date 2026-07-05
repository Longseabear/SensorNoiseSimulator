# NoiseSimulator

Client-side ISP and noise simulation viewer for electron-level image data.

## Goal

NoiseSimulator is intended to expose an image simulation engine to users through
a web viewer. The viewer must run the actual noise simulation and simple ISP
pipeline on the client. The server is only responsible for serving static web
assets, raw/electron-level data, sensor profiles, presets, and documentation.

The project direction is:

- Use a Python library as the reference image simulation engine.
- Use WebGPU as the realtime browser implementation.
- Keep server-side image processing out of the product path.
- Share one parameter/schema contract between Python and WebGPU.
- Validate the realtime WebGPU output against Python-generated fixtures.

## Supported Input Families

NoiseSimulator is designed around two input families:

- `.hdr` RGB images, treated as scene-level HDR radiance inputs.
- 16-bit Bayer raw images, treated as sensor-level mosaic inputs.

Because this is a sensor simulator, `.hdr` inputs are not final display RGB.
They must be sampled through the selected pixel order and pixel type to create a
virtual sensor mosaic before noise, ADC, demosaic, and ISP.

The displayed raw mosaic view represents the image after sensor sampling and ADC
quantization. ADC bit depth is a viewer parameter.

The example viewer also includes a quantization-error view. It is only a debug
view for confirming ADC bit-depth behavior; the default view remains the
post-ADC sampled mosaic.

## SensorPRS Metadata

Sensor metadata is represented as `SensorPRS` JSON for the initial viewer. The
server may provide profiles, and users may later load local profiles, but all
simulation remains client-side.

Initial profiles:

- `BasicSensorLCG`: `SensorCG = 1 uV/e-`, `SensorRN = 64 e-`
- `BasicSensorHCG`: `SensorCG = 64 uV/e-`, `SensorRN = 1 e-`

Both use `SensorFWC = 10000 e-` and `Pedestal = 64 LSB`. The HCG profile has
64x the conversion gain and 1/64 the read noise of LCG. ADC full-scale voltage
is explicit so electron-to-voltage conversion is separate from ADC code range.

16-bit raw inputs require explicit metadata for width, height, byte order, Bayer
pixel order, pixel type, black level, and white level. The initial Bayer order
id is `0 = GRBG`, interpreted as a 2x2 row-major pattern of `G R / B G`.

See [docs/input-formats.md](docs/input-formats.md) for the current input
contract and open definitions.

## Why WebGPU

The viewer needs immediate visual response when parameters such as EIT,
analog gain, digital gain, read noise, ADC settings, and ISP controls change.
That means the source raw/electron data should stay resident in browser-side
memory, preferably GPU memory, and parameter changes should update GPU uniforms
or small parameter buffers rather than recomputing images on the server.

WebGPU is the primary runtime because it supports both GPU computation and
rendering. This fits the intended pipeline better than a CPU-bound Python
runtime in the browser or a WebGL-only rendering path.

## Runtime Architecture

```text
Server
  static web app
  raw/electron-level data files
  sensor profile JSON
  simulation presets
  documentation and examples
  no image processing

Browser client
  downloads selected server sample data
  reads local uploads with the File API without sending them to the server
  parses .hdr or 16-bit Bayer raw input locally
  uploads source data to GPU buffers/textures
  runs noise, ADC, and simple ISP in WebGPU
  renders the result to canvas
  updates parameter buffers when controls change
```

The viewer must support both bundled examples and local uploads. Example images
are fetched from the server as static files. User-uploaded files must stay in the
browser and must never be sent to the server.

## Simulation Pipeline

The exact pipeline will evolve, but the intended stages are:

```text
electron/raw input
  -> exposure / EIT scaling
  -> shot noise
  -> dark current / DSNU / PRNU
  -> read noise
  -> analog gain
  -> ADC quantization
  -> black level / clipping
  -> demosaic
  -> white balance
  -> color correction matrix
  -> tone map / gamma
  -> display
```

These stages should be split into practical WebGPU compute/render passes rather
than forced into one monolithic shader. Intermediate textures and buffers should
be inspectable so the viewer can later expose debugging or educational views.

## Python Reference Engine

The Python package is the canonical model for correctness. It should be used
for:

- offline simulation,
- scientific validation,
- golden fixture generation,
- documenting the sensor and noise model,
- regression tests for the WebGPU implementation.

The realtime viewer should not depend on server-side Python execution. Pyodide
may be useful for experiments or demos, but it is not the main interactive ISP
runtime.

## WebGPU Realtime Engine

The WebGPU implementation should prioritize interactive response:

- Keep source raw/electron data on the GPU after load.
- Update only parameter buffers for slider/control changes.
- Use deterministic seeds or stable noise textures when possible so controls do
  not create distracting per-frame random flicker.
- Separate accurate/reference mode from realtime/interactive mode when exact
  numerical parity would hurt responsiveness.
- Treat Python output as the reference for tolerance-based validation, not
  necessarily bit-exact matching.

## Suggested Repository Layout

```text
packages/
  noise-sim-python/
    Python reference implementation

  noise-sim-core-spec/
    shared schemas, presets, fixtures, and golden outputs

  noise-sim-webgpu/
    WGSL shaders and TypeScript/WebGPU pipeline code

apps/
  isp-viewer/
    browser UI, controls, canvas viewer, and asset loading
```

The initial implementation does not need to create every package immediately,
but new code should move toward this separation of concerns.

## Non-Goals

- Do not rely on server-side image processing for the public viewer.
- Do not maintain unrelated Python and frontend algorithms without shared
  fixtures.
- Do not treat the browser UI as a thin server-rendered image viewer.
- Do not optimize for WebGL first unless it is explicitly being added as a
  fallback path.

## Development Principles

1. Define parameter schemas before wiring UI controls.
2. Keep raw data, sensor config, and simulation parameters separate.
3. Make every simulation result reproducible with a seed and preset.
4. Add golden fixtures for changes that affect image math.
5. Keep the browser rendering path fully client-side.

## Hosted Viewer Example

This repository includes a minimal example showing the intended split:

- the server hosts only static files,
- the browser fetches raw/electron metadata,
- WebGPU performs the display-time noise, ADC, and simple ISP work.

Run it with:

```powershell
node examples/hosted-viewer/server.mjs
```

Then open:

```text
http://localhost:5173
```

The EIT, analog gain, digital gain, ADC, SensorPRS, white-balance, gamma, black-level,
and seed controls update the client-side render path. WebGPU is used when the
browser exposes it; otherwise the hosted example falls back to a client-side 2D
preview so the server still does not process images.

SimpleISP mode applies bilinear demosaic, white balance, and gamma after the ADC
sample stage, then displays an 8-bit RGB output regardless of the selected input
or ADC bit depth.

The hosted viewer keeps runtime parameters in a structured client-side state
object instead of treating individual DOM inputs as the source of truth. The
parameter schema maps UI controls to `input`, `sensor`, `simulation`,
`simpleIsp`, and `view` state groups, and the WebGPU uniform buffer is built
from that state snapshot.

### HDR Test Inputs

Synthetic `.hdr` inputs can be regenerated with:

```powershell
node scripts/generate-test-hdrs.mjs
```

Synthetic 16-bit raw inputs can be regenerated with:

```powershell
node scripts/generate-test-raws.mjs
```

The generated files live under:

```text
examples/hosted-viewer/public/assets/test-inputs/
```

Current test inputs:

- `linear_photon_ramp_512x256.hdr` for uniform 0..1 photon and ADC histogram sanity checks.
- `../studio_small_08_1k.hdr` for a downloaded CC0 real-world HDRI scene.
- `../afrikaans_church_interior_1k.hdr` for a downloaded CC0 high-contrast church interior HDR scene.
- `../memorial_church_debevec.hdr` for a perspective HDR research radiance map.
- `gradient_ramp_512x256.hdr` for exposure, EIT, gain, gamma, and banding checks.
- `low_light_noise_512x256.hdr` for read-noise and shadow response checks.
- `highlight_clip_512x256.hdr` for saturation, ADC clipping, and tone-map checks.
- `color_patches_512x256.hdr` for white balance, color matrix, and exposure bracket checks.

Current raw test inputs:

- `raw/bayer_grbg_gradient_512x256_u16le.raw` for 2x2 Bayer demosaic and exposure checks.
- `raw/bayer_grbg_low_light_512x256_u16le.raw` for Bayer shadow/noise checks.
- `raw/tetra_grbg_low_light_512x256_u16le.raw` for grouped low-light checks.
- `raw/tetrasquare_grbg_color_512x256_u16le.raw` for 4x4 grouped color checks.
