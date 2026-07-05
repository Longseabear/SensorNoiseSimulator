# Python CLI Notes

The project CLI is:

```powershell
python -m sensor_noise_simulator.cli <input> --sensor <SensorPRS.json> --output <output.raw> [options]
```

Run it from the repo root with `PYTHONPATH=src`, or use `scripts/run_noise_sim.py` from this skill.

## Input Options

- `--input-kind hdr|raw`
- `--pixel-type Bayer|Tetra|TetraSquare`
- `--pixel-order 0`
- `--photon-white-point <float>`; default is `1.0`
- `--auto-white-point p75` for explicit convenience normalization only
- RAW inputs require `--width`, `--height`; optional `--black-level`, `--white-level`, `--byte-order`

## Single CG Options

- `--acquisition single`
- `--cg-mode <index-or-name>`
- `--adc-bits 8..16`
- `--analog-gain <float>`
- `--digital-gain <float>`

## IDCG Options

- `--acquisition idcg`
- `--cg-a <index-or-name>`
- `--cg-b <index-or-name>`
- `--shot-adc-bits <bits>`
- `--long-adc-bits <bits>`
- `--shot-analog-gain <float>`
- `--shot-digital-gain <float>`
- `--long-analog-gain <float>`
- `--long-digital-gain <float>`

## Shared Simulation Options

- `--eit <float>`
- `--black <float>`
- `--seed <float>`
- `--adc-full-scale-uv <float>`
- `--preview-pgm`

## Known Good Parity Check

For the web sample `Linear photon ramp`, parity with the web viewer works with the default HDR white point:

```powershell
--photon-white-point 1
```

Known hashes for BasicSensor IDCG LCG/HCG, 10b/10b, all gains 1, including SensorDark:

- LCG: `4C2DEA465E58531CE4E8901D0B2BC9455DAFB05C221728962569B795878CF513`
- HCG: `A3AB31883D6AD6D89FBFFADFFB109071395EDD5AF7025E32434A7B7E6A5A98F8`
