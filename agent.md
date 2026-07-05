# Agent Instructions

This repository is for a client-side WebGPU ISP/noise simulation viewer. Follow
these rules when making changes here.

## Core Direction

- The public viewer must run image processing on the client.
- The server must only serve static assets, raw/electron data, profiles,
  presets, and documentation.
- The server may send selected bundled example images to the browser, but it
  must never receive user-uploaded image files.
- WebGPU is the primary realtime runtime.
- Python is the reference simulation engine, not the interactive viewer runtime.
- Keep Python and WebGPU aligned through shared schemas, presets, and golden
  fixtures.

## Architecture Rules

- Do not add server-side ISP, noise simulation, thumbnail generation, or image
  processing unless the user explicitly asks for an offline/admin tool.
- Use the browser File API for local uploads. Do not post, stream, log, cache, or
  otherwise transmit user-selected image bytes to the server.
- Keep source raw/electron data resident in browser memory after load, and move
  it to GPU buffers/textures for realtime work.
- Support the two primary input families as distinct semantic inputs:
  `.hdr` RGB scene radiance and 16-bit Bayer raw mosaic data.
- For sensor simulation, do not render `.hdr` as final RGB directly. Sample HDR
  scene radiance through the active pixel order and pixel type to create a
  virtual sensor mosaic first.
- Treat the primary raw mosaic display as the post-ADC sampled image. ADC bit
  depth must be explicit and adjustable.
- Do not infer raw width, height, byte order, Bayer order, pixel type, black
  level, or white level from the file extension alone.
- Parameter changes such as EIT, gain, ADC, and ISP controls should update small
  parameter buffers/uniforms instead of reloading or recomputing source data.
- Prefer staged WebGPU compute/render passes over one large shader when it makes
  intermediate state easier to validate.
- Keep raw data, sensor metadata, simulation parameters, and UI state as
  separate concepts.

## Implementation Guidance

- Use TypeScript for browser/WebGPU code unless the project later establishes a
  different frontend stack.
- Use WGSL for WebGPU shaders.
- Put shader code in files or modules that can be tested and reviewed
  separately from UI components.
- Use Web Workers where CPU parsing, decoding, or large transfer work could
  block the UI.
- Avoid Pyodide for the main realtime path. It may be acceptable for experiments
  or documentation demos, but not for frame-interactive ISP controls.
- If WebGL is added, treat it as a fallback/preview path, not the primary
  architecture.

## Correctness And Validation

- Treat the Python engine as the canonical reference for image math.
- Add or update golden fixtures when changing sensor/noise/ISP behavior.
- Prefer tolerance-based comparisons between Python and WebGPU outputs.
- Preserve deterministic seeds or stable noise textures for interactive controls
  so slider movement does not create random per-frame flicker.
- Clearly separate accurate/reference mode from realtime/interactive mode when
  exact parity would make the viewer slow.

## UX Expectations

- The first screen should be the usable ISP viewer, not a marketing landing
  page.
- Controls should feel immediate: changing EIT, gain, noise, ADC, white balance,
  tone mapping, or related parameters should trigger a client-side GPU update.
- Use compact, inspectable panels for technical controls and state.
- Expose intermediate pipeline views when useful: raw, noisy raw, ADC output,
  demosaic, linear RGB, and display output.

## Documentation Expectations

- Document any new parameter schema, raw data format, preset format, or fixture
  format close to the code that consumes it.
- Keep [docs/input-formats.md](docs/input-formats.md) updated when input format
  assumptions change.
- When adding a new processing stage, describe whether it exists in Python,
  WebGPU, or both.
- If a feature requires server-side work, explicitly call out why it does not
  violate the no-server-processing constraint.

## Before Claiming Done

- Confirm the realtime path remains client-side.
- Confirm no server-side image processing was introduced accidentally.
- Run available tests or type checks.
- For visual/WebGPU changes, verify in a browser when practical and mention any
  browser/device limitations.
