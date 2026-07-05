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
- `--photon-white-point <float>` for HDR normalization parity
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

For the web sample `Linear photon ramp`, parity with the web viewer requires:

```powershell
--photon-white-point 1
```

Known hashes for BasicSensor IDCG LCG/HCG, 10b/10b, all gains 1:

- LCG: `B0E3B854D392785C9EC8DCF558A8D7966B0279D5C5BA8563132FB5EFEA2EF7CF`
- HCG: `825E4DA851F1E93E444E8EDBA31E161DFCEEB9F90CBF56A3111DD13D76ECCE89`
