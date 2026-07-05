# Python Library

`sensor-noise-simulator` is the Python reference implementation for the same
noise and ADC model used by the hosted WebGPU viewer.

Install in editable mode from the repository root:

```powershell
python -m pip install -e .
```

## CLI

Single-CG example:

```powershell
sensor-noise-sim `
  examples/hosted-viewer/public/assets/test-inputs/linear_photon_ramp_512x256.hdr `
  --sensor examples/hosted-viewer/public/sensors/BasicSensor.sensor-prs.json `
  --output out_single.raw `
  --pixel-type Bayer `
  --adc-bits 10 `
  --cg-mode LCG
```

IDCG example:

```powershell
sensor-noise-sim `
  examples/hosted-viewer/public/assets/test-inputs/linear_photon_ramp_512x256.hdr `
  --sensor examples/hosted-viewer/public/sensors/BasicSensor.sensor-prs.json `
  --output out_idcg.raw `
  --acquisition idcg `
  --cg-a LCG `
  --cg-b HCG `
  --shot-adc-bits 12 `
  --long-adc-bits 10 `
  --shot-analog-gain 1 `
  --shot-digital-gain 1 `
  --long-analog-gain 4 `
  --long-digital-gain 2
```

This writes:

```text
out_idcg_LCG_12b.raw
out_idcg_HCG_10b.raw
```

Each RAW output is `uint16 little-endian`. Valid ADC code range is still
`0..2^ADCBits-1`, even though the file container is 16-bit.

Use `--preview-pgm` to also write a dependency-free 16-bit PGM preview.

HDR inputs are treated as scene-linear photon data by default:

```text
HDR value 1.0 -> photon 1.0 -> SensorFWC
```

The CLI default is `--photon-white-point 1`. Use `--auto-white-point p75`
only as an explicit import convenience for non-normalized display-oriented HDRs.

## Library

```python
from sensor_noise_simulator import (
    ReadoutConfig,
    SensorProfile,
    SimulationConfig,
    load_hdr_mosaic,
    save_raw_u16,
    simulate_adc,
)

sensor = SensorProfile.from_json("examples/hosted-viewer/public/sensors/BasicSensor.sensor-prs.json")
mosaic = load_hdr_mosaic(
    "examples/hosted-viewer/public/assets/test-inputs/linear_photon_ramp_512x256.hdr",
    pixel_type="Bayer",
    pixel_order=0,
)

readout = ReadoutConfig.from_mode(
    sensor.mode("LCG"),
    analog_gain=1,
    digital_gain=1,
    adc_bits=10,
)

image = simulate_adc(mosaic, sensor, readout, SimulationConfig(eit=1, seed=0))
save_raw_u16("out.raw", image)
```

## Parity Contract

The Python path mirrors the viewer math:

```text
photon 0..1
  -> electron = photon * SensorFWC * EIT
  -> PRNU + shared shot noise + readout-specific read noise + PFPN + Dark pattern
  -> voltage = electron * SensorCG * AnalogGain
  -> ADC code with bit-depth-derived pedestal
  -> optional pedestal-relative digital gain with dither
```

Important parity rules:

- HDR default white point is `1.0`, matching the web viewer photon contract.
- `pedestal = 2^(ADCBits - 4)`.
- `ShotNoise` seed is shared between IDCG branches.
- read noise uses each CG mode's `Seeds.ReadNoise`.
- PRNU and PFPN are fixed-pattern sources shared by pixel position.
- Dark pattern uses `Seeds.Dark`, is shared by readouts, and scales with EIT.
- ADC output is clipped to `0..2^ADCBits-1`.
