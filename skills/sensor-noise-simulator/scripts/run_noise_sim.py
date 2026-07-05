from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
import subprocess
import sys


def find_repo(explicit: str | None) -> Path:
    if explicit:
        return Path(explicit).resolve()
    env_repo = os.environ.get("SENSOR_NOISE_SIMULATOR_REPO")
    if env_repo:
        return Path(env_repo).resolve()
    current = Path.cwd().resolve()
    for candidate in (current, *current.parents):
        if (candidate / "src" / "sensor_noise_simulator" / "cli.py").exists():
            return candidate
    default = Path(r"C:\Users\leap1\OneDrive\문서\NoiseSimulator")
    if (default / "src" / "sensor_noise_simulator" / "cli.py").exists():
        return default
    raise SystemExit("Cannot find SensorNoiseSimulator repo. Pass --repo or set SENSOR_NOISE_SIMULATOR_REPO.")


def split_args(argv: list[str]) -> tuple[argparse.Namespace, list[str]]:
    parser = argparse.ArgumentParser(
        description="Run SensorNoiseSimulator Python CLI with repo-local PYTHONPATH and hosted sample parity helpers.",
    )
    parser.add_argument("input", help="Input .hdr or .raw image.")
    parser.add_argument("--sensor", required=True, help="SensorPRS JSON path.")
    parser.add_argument("--output", required=True, help="Output .raw path or IDCG output stem.")
    parser.add_argument("--repo", help="SensorNoiseSimulator repo root. Defaults to cwd/parents/env/known workspace.")
    parser.add_argument("--no-manifest-white-point", action="store_true", help="Do not auto-apply hosted sample photonWhitePoint.")
    parser.add_argument("--dry-run", action="store_true", help="Print the resolved CLI command without running it.")
    known, passthrough = parser.parse_known_args(argv)
    return known, passthrough


def normalize_path(value: str, repo: Path) -> Path:
    path = Path(value)
    if path.is_absolute():
        return path
    return (repo / path).resolve()


def manifest_white_point(input_path: Path, repo: Path) -> float | None:
    manifest_path = repo / "examples" / "hosted-viewer" / "public" / "assets" / "test-inputs" / "manifest.json"
    if not manifest_path.exists():
        return None
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    public_root = repo / "examples" / "hosted-viewer" / "public"
    try:
        resolved_input = input_path.resolve()
    except OSError:
        resolved_input = input_path
    for item in manifest.get("inputs", []):
        uri = item.get("uri")
        if not uri:
            continue
        sample_path = (public_root / uri).resolve()
        if sample_path == resolved_input and "photonWhitePoint" in item:
            return float(item["photonWhitePoint"])
    return None


def has_option(args: list[str], option: str) -> bool:
    return any(arg == option or arg.startswith(f"{option}=") for arg in args)


def main(argv: list[str] | None = None) -> int:
    known, passthrough = split_args(argv or sys.argv[1:])
    repo = find_repo(known.repo)
    input_path = normalize_path(known.input, repo)
    sensor_path = normalize_path(known.sensor, repo)
    output_path = normalize_path(known.output, repo)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    cli_args = [
        sys.executable,
        "-m",
        "sensor_noise_simulator.cli",
        str(input_path),
        "--sensor",
        str(sensor_path),
        "--output",
        str(output_path),
        *passthrough,
    ]

    if (
        not known.no_manifest_white_point
        and input_path.suffix.lower() == ".hdr"
        and not has_option(passthrough, "--photon-white-point")
    ):
        white_point = manifest_white_point(input_path, repo)
        if white_point is not None:
            cli_args.extend(["--photon-white-point", str(white_point)])

    env = os.environ.copy()
    src = str(repo / "src")
    env["PYTHONPATH"] = src if not env.get("PYTHONPATH") else f"{src}{os.pathsep}{env['PYTHONPATH']}"

    if known.dry_run:
        print(" ".join(cli_args))
        return 0
    return subprocess.run(cli_args, cwd=repo, env=env, check=False).returncode


if __name__ == "__main__":
    raise SystemExit(main())
