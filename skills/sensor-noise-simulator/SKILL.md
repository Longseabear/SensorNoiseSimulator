---
name: sensor-noise-simulator
description: Generate sensor noise simulation ADC RAW outputs from SensorPRS metadata and HDR or 16-bit RAW inputs using the SensorNoiseSimulator Python package. Use when Codex needs to run the project Python library or CLI, create Single-CG or IDCG dual-readout RAW files, compare Python output with the web viewer, or preserve web/Python binary parity for noise simulation.
---

# Sensor Noise Simulator

Use this skill to generate client-viewer-compatible ADC RAW outputs through the Python package in the SensorNoiseSimulator repo.

## Quick Workflow

1. Work from the SensorNoiseSimulator repo root when possible.
2. Prefer the bundled wrapper:

```powershell
python C:/Users/leap1/.codex/skills/sensor-noise-simulator/scripts/run_noise_sim.py <input> --sensor <SensorPRS.json> --output <output.raw> [sim args]
```

3. Use `--acquisition single` for one RAW or `--acquisition idcg` for two RAWs.
4. Treat HDR values as photon values by default; `photonWhitePoint` defaults to `1.0`.
5. Verify output with `Get-FileHash` or binary reads when parity matters.

## Common Commands

Single CG:

```powershell
python C:/Users/leap1/.codex/skills/sensor-noise-simulator/scripts/run_noise_sim.py examples/hosted-viewer/public/assets/test-inputs/linear_photon_ramp_512x256.hdr --sensor examples/hosted-viewer/public/sensors/BasicSensor.sensor-prs.json --output .codex/out/single.raw --acquisition single --cg-mode LCG --adc-bits 10 --analog-gain 1 --digital-gain 1 --eit 1 --pixel-type Bayer
```

IDCG:

```powershell
python C:/Users/leap1/.codex/skills/sensor-noise-simulator/scripts/run_noise_sim.py examples/hosted-viewer/public/assets/test-inputs/linear_photon_ramp_512x256.hdr --sensor examples/hosted-viewer/public/sensors/BasicSensor.sensor-prs.json --output .codex/out/idcg.raw --acquisition idcg --cg-a LCG --cg-b HCG --shot-adc-bits 10 --long-adc-bits 10 --shot-analog-gain 1 --shot-digital-gain 1 --long-analog-gain 1 --long-digital-gain 1 --eit 1 --pixel-type Bayer
```

The IDCG command writes:

- `<stem>_<cgAName>_<shotBits>b.raw`
- `<stem>_<cgBName>_<longBits>b.raw`

## Parity Rules

- Treat scene-linear input as photon input in `0..1`.
- `photon 1.0 = SensorFWC`.
- ADC output is uint16 little-endian, with valid codes `0..2^ADCbit-1`.
- Pedestal is derived from ADC bit depth: `2^(bits - 4)`; examples: 8b=16, 10b=64, 11b=128.
- Apply gains without pedestal; add pedestal only in ADC code conversion.
- ISP-style float processing must subtract pedestal first.
- In IDCG, shared between A/B: photon input, PRNU, PFPN, dark pattern, shot noise.
- In IDCG, independent per readout: read noise seed, CG, RN, ADC conversion, ADC bit depth, analog gain, digital gain.
- Digital gain is applied in LSB space and uses dither only when gain is not 1.

## Important Web Parity Detail

The web viewer and Python package both default HDR white point to `1.0`. Use `--auto-white-point p75` only when intentionally importing a non-normalized HDR for convenience, because that changes the photon mapping and breaks binary parity with the default sensor simulation contract.

For more CLI options and defaults, read `references/python-cli.md`.
