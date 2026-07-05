from __future__ import annotations

import argparse
from pathlib import Path

from .io import load_hdr_mosaic, load_raw_u16_mosaic, save_pgm_u16, save_raw_u16
from .models import ReadoutConfig, SensorProfile, SimulationConfig, adc_levels
from .simulation import simulate_adc


def _mode_selector(value: str) -> int | str:
    try:
        return int(value)
    except ValueError:
        return value


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Run SensorNoiseSimulator reference Python simulation.")
    parser.add_argument("input", help="Input .hdr or .raw image.")
    parser.add_argument("--sensor", required=True, help="SensorPRS JSON path.")
    parser.add_argument("--output", required=True, help="Output .raw path for single mode, or output stem for IDCG.")
    parser.add_argument("--input-kind", choices=["hdr", "raw"], help="Override input kind. Defaults from extension.")
    parser.add_argument("--pixel-type", default="Bayer", choices=["Bayer", "Tetra", "TetraSquare"])
    parser.add_argument("--pixel-order", default=0, type=int)
    parser.add_argument("--photon-white-point", type=float)
    parser.add_argument("--width", type=int, help="Required for raw input.")
    parser.add_argument("--height", type=int, help="Required for raw input.")
    parser.add_argument("--black-level", type=int, default=64)
    parser.add_argument("--white-level", type=int, default=1023)
    parser.add_argument("--byte-order", default="little-endian", choices=["little-endian", "big-endian"])

    parser.add_argument("--acquisition", choices=["single", "idcg"], default="single")
    parser.add_argument("--cg-mode", default="0", help="Single-mode CG mode index or name.")
    parser.add_argument("--cg-a", default="0", help="IDCG shot/LCG CG mode index or name.")
    parser.add_argument("--cg-b", default="1", help="IDCG long/HCG CG mode index or name.")

    parser.add_argument("--eit", type=float, default=1.0)
    parser.add_argument("--black", type=float, default=0.0)
    parser.add_argument("--seed", type=float, default=0.0)
    parser.add_argument("--adc-full-scale-uv", type=float)

    parser.add_argument("--adc-bits", type=int, default=10)
    parser.add_argument("--analog-gain", type=float, default=1.0)
    parser.add_argument("--digital-gain", type=float, default=1.0)
    parser.add_argument("--shot-adc-bits", type=int, default=10)
    parser.add_argument("--shot-analog-gain", type=float, default=1.0)
    parser.add_argument("--shot-digital-gain", type=float, default=1.0)
    parser.add_argument("--long-adc-bits", type=int, default=10)
    parser.add_argument("--long-analog-gain", type=float, default=1.0)
    parser.add_argument("--long-digital-gain", type=float, default=1.0)
    parser.add_argument("--preview-pgm", action="store_true", help="Also save 16-bit PGM preview files.")
    return parser


def load_input(args: argparse.Namespace):
    input_path = Path(args.input)
    kind = args.input_kind
    if kind is None:
        kind = "hdr" if input_path.suffix.lower() == ".hdr" else "raw"
    if kind == "hdr":
        return load_hdr_mosaic(
            input_path,
            pixel_type=args.pixel_type,
            pixel_order=args.pixel_order,
            photon_white_point=args.photon_white_point,
        )
    if args.width is None or args.height is None:
        raise ValueError("--width and --height are required for raw input.")
    return load_raw_u16_mosaic(
        input_path,
        width=args.width,
        height=args.height,
        black_level=args.black_level,
        white_level=args.white_level,
        byte_order=args.byte_order,
    )


def save_result(path: Path, image, *, preview_pgm: bool, valid_max: int) -> None:
    save_raw_u16(path, image)
    if preview_pgm:
        save_pgm_u16(path.with_suffix(".pgm"), image, valid_max=valid_max)


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    sensor = SensorProfile.from_json(args.sensor)
    mosaic = load_input(args)
    config = SimulationConfig(
        eit=args.eit,
        black=args.black,
        seed=args.seed,
        adc_full_scale_uv=args.adc_full_scale_uv,
    )

    output = Path(args.output)
    if args.acquisition == "single":
        mode = sensor.mode(_mode_selector(args.cg_mode))
        readout = ReadoutConfig.from_mode(
            mode,
            analog_gain=args.analog_gain,
            digital_gain=args.digital_gain,
            adc_bits=args.adc_bits,
        )
        image = simulate_adc(mosaic, sensor, readout, config)
        save_result(output, image, preview_pgm=args.preview_pgm, valid_max=adc_levels(readout.adc_bits))
        print(f"saved {output} {image.shape[1]}x{image.shape[0]} {readout.name} {readout.adc_bits}b range 0-{adc_levels(readout.adc_bits)}")
        return 0

    shot_mode = sensor.mode(_mode_selector(args.cg_a))
    long_mode = sensor.mode(_mode_selector(args.cg_b))
    shot = ReadoutConfig.from_mode(
        shot_mode,
        analog_gain=args.shot_analog_gain,
        digital_gain=args.shot_digital_gain,
        adc_bits=args.shot_adc_bits,
        branch="shot",
    )
    long = ReadoutConfig.from_mode(
        long_mode,
        analog_gain=args.long_analog_gain,
        digital_gain=args.long_digital_gain,
        adc_bits=args.long_adc_bits,
        branch="long",
    )
    stem = output.with_suffix("")
    for readout in (shot, long):
        image = simulate_adc(mosaic, sensor, readout, config)
        path = stem.with_name(f"{stem.name}_{readout.name}_{readout.adc_bits}b.raw")
        save_result(path, image, preview_pgm=args.preview_pgm, valid_max=adc_levels(readout.adc_bits))
        print(f"saved {path} {image.shape[1]}x{image.shape[0]} {readout.name} {readout.adc_bits}b range 0-{adc_levels(readout.adc_bits)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
