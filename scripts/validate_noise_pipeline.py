from __future__ import annotations

import argparse
import json
import math
from dataclasses import asdict
from pathlib import Path
from tempfile import TemporaryDirectory
from typing import Any

import numpy as np

from sensor_noise_simulator import ReadoutConfig, SensorProfile, SimulationConfig, load_hdr_mosaic, save_raw_u16, simulate_adc
from sensor_noise_simulator.models import CGMode, adc_levels, pedestal_for_adc_bits
from sensor_noise_simulator.simulation import sensor_noise_terms


def sha256_file(path: Path) -> str:
    import hashlib

    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def status(ok: bool, detail: str, metrics: dict[str, Any] | None = None) -> dict[str, Any]:
    return {"status": "PASS" if ok else "FAIL", "detail": detail, "metrics": metrics or {}}


def rel_err(actual: float, expected: float) -> float:
    return abs(actual - expected) / max(abs(expected), 1e-12)


def make_triple_sensor(base: SensorProfile) -> SensorProfile:
    return SensorProfile(
        sensor_name="TripleCGDebugSensor",
        sensor_fwc=base.sensor_fwc,
        sensor_rn=base.sensor_rn,
        sensor_prnu=base.sensor_prnu,
        sensor_cg=base.sensor_cg,
        sensor_pfpn=base.sensor_pfpn,
        sensor_dark=base.sensor_dark,
        seeds=base.seeds,
        cg_modes=[
            CGMode("LCG", 1.0, 64.0, 3001.0),
            CGMode("MCG", 8.0, 8.0, 3003.0),
            CGMode("HCG", 64.0, 1.0, 3002.0),
        ],
    )


def snr_model(
    input_electron: float,
    *,
    eit: float,
    rn: float,
    prnu: float,
    pfpn_electron: float,
    dark_electron: float,
    quant_electron: float,
) -> float:
    collected = max(0.0, input_electron * eit)
    variance = collected + rn * rn + (prnu * collected) ** 2 + pfpn_electron**2 + dark_electron**2 + quant_electron**2
    return collected / max(math.sqrt(variance), 1e-12)


def snr_one_root(**kwargs: float) -> float:
    lo = 1e-6
    hi = max(1.0, kwargs.get("rn", 1.0) * 10.0)
    while snr_model(hi, **kwargs) < 1.0 and hi < 1e9:
        hi *= 2.0
    for _ in range(80):
        mid = math.sqrt(lo * hi)
        if snr_model(mid, **kwargs) < 1.0:
            lo = mid
        else:
            hi = mid
    return hi


def run(repo: Path, out_dir: Path) -> dict[str, Any]:
    sensor_path = repo / "examples" / "hosted-viewer" / "public" / "sensors" / "BasicSensor.sensor-prs.json"
    hdr_path = repo / "examples" / "hosted-viewer" / "public" / "assets" / "test-inputs" / "linear_photon_ramp_512x256.hdr"
    sensor = SensorProfile.from_json(sensor_path)
    lcg = ReadoutConfig.from_mode(sensor.mode("LCG"), adc_bits=10)
    hcg = ReadoutConfig.from_mode(sensor.mode("HCG"), adc_bits=10)

    height = 256
    width = 512
    yy, xx = np.indices((height, width), dtype=np.float64)
    flat = np.linspace(0.0, 1.0, width * height, dtype=np.float64).reshape(height, width)
    signal_1000 = np.full((height, width), 1000.0, dtype=np.float64)
    signal_zero = np.zeros((height, width), dtype=np.float64)
    config = SimulationConfig(eit=1.0, seed=0.0)

    results: dict[str, dict[str, Any]] = {}

    noise_l = sensor_noise_terms(xx, yy, signal_1000, sensor, lcg, config.eit)
    noise_h = sensor_noise_terms(xx, yy, signal_1000, sensor, hcg, config.eit)

    shot_equal = np.array_equal(noise_l["shot_electron"], noise_h["shot_electron"])
    results["01_idcg_shot_noise_shared"] = status(
        shot_equal,
        "LCG/HCG shot arrays are bit-identical for the same photon input." if shot_equal else "LCG/HCG shot arrays differ.",
        {
            "lcg_shot_std": float(noise_l["shot_electron"].std()),
            "hcg_shot_std": float(noise_h["shot_electron"].std()),
            "max_abs_delta": float(np.max(np.abs(noise_l["shot_electron"] - noise_h["shot_electron"]))),
        },
    )

    read_corr = float(np.corrcoef(noise_l["read_electron"].ravel(), noise_h["read_electron"].ravel())[0, 1])
    results["02_idcg_read_noise_independent"] = status(
        abs(read_corr) < 0.05,
        "Read noise differs per CG mode seed and is effectively uncorrelated.",
        {"correlation": read_corr, "lcg_std": float(noise_l["read_electron"].std()), "hcg_std": float(noise_h["read_electron"].std())},
    )

    zero_prnu = sensor_noise_terms(xx, yy, signal_zero, sensor, lcg, config.eit)["prnu_electron"]
    prnu_std = float(noise_l["prnu_electron"].std())
    results["03_prnu_signal_proportional_fixed_pattern"] = status(
        float(np.max(np.abs(zero_prnu))) == 0.0 and rel_err(prnu_std, 1000.0 * sensor.sensor_prnu) < 0.05,
        "PRNU is zero at zero signal and approximately signal*PRNU at 1000 e-.",
        {"zero_max_abs": float(np.max(np.abs(zero_prnu))), "std_at_1000e": prnu_std, "expected_std": 1000.0 * sensor.sensor_prnu},
    )

    shot_std = float(noise_l["shot_electron"].std())
    results["04_shot_noise_poisson_level"] = status(
        rel_err(shot_std, math.sqrt(1000.0)) < 0.05,
        "Shot noise sample std is close to sqrt(signal electron).",
        {"std": shot_std, "expected": math.sqrt(1000.0)},
    )

    results["05_read_noise_level_sampling"] = status(
        rel_err(float(noise_l["read_electron"].std()), lcg.sensor_rn) < 0.05 and rel_err(float(noise_h["read_electron"].std()), hcg.sensor_rn) < 0.08,
        "Read noise std follows per-readout RN.",
        {"lcg_std": float(noise_l["read_electron"].std()), "lcg_expected": lcg.sensor_rn, "hcg_std": float(noise_h["read_electron"].std()), "hcg_expected": hcg.sensor_rn},
    )

    pfpn_ratio = float(noise_l["pfpn_electron"].std() / max(noise_h["pfpn_electron"].std(), 1e-12))
    results["06_pfpn_cg_scaling"] = status(
        rel_err(pfpn_ratio, hcg.sensor_cg / lcg.sensor_cg) < 0.05,
        "PFPN electron-domain amplitude scales as 1/CG.",
        {"std_ratio_lcg_over_hcg": pfpn_ratio, "expected": hcg.sensor_cg / lcg.sensor_cg},
    )

    dark_eit1 = noise_l["dark_electron"]
    dark_eit4 = sensor_noise_terms(xx, yy, signal_1000, sensor, lcg, 4.0)["dark_electron"]
    dark_ratio = float(dark_eit4.std() / max(dark_eit1.std(), 1e-12))
    results["07_dark_pattern_eit_scaling"] = status(
        rel_err(dark_ratio, 4.0) < 0.05 and np.array_equal(dark_eit1, noise_h["dark_electron"]),
        "Dark pattern is shared between readouts and scales with EIT.",
        {"std_eit1": float(dark_eit1.std()), "std_eit4": float(dark_eit4.std()), "ratio": dark_ratio},
    )

    triple = make_triple_sensor(sensor)
    triple_outputs = {}
    triple_stats = {}
    for mode in triple.cg_modes:
        readout = ReadoutConfig.from_mode(mode, adc_bits=12)
        image = simulate_adc(flat, triple, readout, config)
        triple_outputs[mode.name] = image
        triple_stats[mode.name] = {
            "min": int(image.min()),
            "max": int(image.max()),
            "saturated": int(np.count_nonzero(image == adc_levels(readout.adc_bits))),
            "rn": readout.sensor_rn,
            "cg": readout.sensor_cg,
        }
    results["08_triple_cg_modes"] = status(
        set(triple_outputs) == {"LCG", "MCG", "HCG"} and triple_stats["LCG"]["saturated"] < triple_stats["MCG"]["saturated"] < triple_stats["HCG"]["saturated"],
        "Triple-CG sensor can simulate three modes and saturation rises with CG.",
        triple_stats,
    )

    hdr_mosaic = load_hdr_mosaic(hdr_path, pixel_type="Bayer", pixel_order=0)
    adc_l = simulate_adc(hdr_mosaic, sensor, lcg, config)
    adc_h = simulate_adc(hdr_mosaic, sensor, hcg, config)
    out_dir.mkdir(parents=True, exist_ok=True)
    l_path = out_dir / "validation_LCG_10b.raw"
    h_path = out_dir / "validation_HCG_10b.raw"
    save_raw_u16(l_path, adc_l)
    save_raw_u16(h_path, adc_h)
    valid_saved = l_path.stat().st_size == width * height * 2 and h_path.stat().st_size == width * height * 2
    valid_range = int(adc_l.min()) >= 0 and int(adc_l.max()) <= 1023 and int(adc_h.min()) >= 0 and int(adc_h.max()) <= 1023
    results["09_saved_raw_format_and_range"] = status(
        valid_saved and valid_range,
        "Saved RAW files are uint16-sized and remain in 10-bit valid code range.",
        {
            "lcg_bytes": l_path.stat().st_size,
            "hcg_bytes": h_path.stat().st_size,
            "lcg_min": int(adc_l.min()),
            "lcg_max": int(adc_l.max()),
            "hcg_min": int(adc_h.min()),
            "hcg_max": int(adc_h.max()),
            "lcg_sha256": sha256_file(l_path),
            "hcg_sha256": sha256_file(h_path),
        },
    )

    rn_only_sensor = SensorProfile(
        sensor_name="RNOnly",
        sensor_fwc=10000.0,
        sensor_rn=32.0,
        sensor_prnu=0.0,
        sensor_cg=1.0,
        sensor_pfpn=0.0,
        sensor_dark=0.0,
        seeds=sensor.seeds,
        cg_modes=[CGMode("RN", 1.0, 32.0, 3001.0)],
    )
    rn_readout = ReadoutConfig.from_mode(rn_only_sensor.mode("RN"), adc_bits=16)
    rn_signal = np.zeros((height, width), dtype=np.float64)
    rn_adc = simulate_adc(rn_signal, rn_only_sensor, rn_readout, SimulationConfig(eit=1.0, adc_full_scale_uv=10000.0))
    electron_from_code = (rn_adc.astype(np.float64) - pedestal_for_adc_bits(16)) * 10000.0 / max(1, adc_levels(16) - pedestal_for_adc_bits(16))
    measured_noise_std = float((electron_from_code - np.median(electron_from_code)).std())
    results["10_saved_noise_level_sampling"] = status(
        rel_err(measured_noise_std, 32.0) < 0.08,
        "Saved ADC sample noise level recovers the configured RN within quantization tolerance.",
        {"measured_std_e": measured_noise_std, "expected_std_e": 32.0},
    )

    base_readout = ReadoutConfig.from_mode(sensor.mode("LCG"), adc_bits=10, digital_gain=1.0)
    dg_readout = ReadoutConfig.from_mode(sensor.mode("LCG"), adc_bits=10, digital_gain=2.0)
    base_adc = simulate_adc(flat, sensor, base_readout, config)
    dg_adc = simulate_adc(flat, sensor, dg_readout, config)
    results["11_digital_gain_dither_path"] = status(
        not np.array_equal(base_adc, dg_adc) and int(dg_adc.max()) == 1023,
        "Digital gain changes ADC output and still clips to ADC full scale.",
        {"base_sha256": sha256_array(base_adc), "dg_sha256": sha256_array(dg_adc), "dg_max": int(dg_adc.max())},
    )

    pedestals = {bits: pedestal_for_adc_bits(bits) for bits in range(8, 17)}
    results["12_adc_pedestal_by_bit_depth"] = status(
        pedestals[8] == 16 and pedestals[10] == 64 and pedestals[11] == 128 and pedestals[16] == 4096,
        "Pedestal follows 2^(bits-4).",
        {str(k): v for k, v in pedestals.items()},
    )

    mosaic_default = hdr_mosaic
    mosaic_explicit = load_hdr_mosaic(hdr_path, pixel_type="Bayer", pixel_order=0, photon_white_point=1.0)
    results["13_hdr_default_photon_white_point"] = status(
        np.array_equal(mosaic_default, mosaic_explicit) and float(mosaic_default.max()) <= 1.0,
        "Python HDR default matches web photonWhitePoint=1 behavior.",
        {"max": float(mosaic_default.max()), "mean": float(mosaic_default.mean())},
    )

    cg = lcg.sensor_cg
    usable = adc_levels(10) - pedestal_for_adc_bits(10)
    quant_step = config.adc_full_scale(sensor) / (cg * lcg.analog_gain * usable)
    quant_noise = math.sqrt(quant_step**2 + quant_step**2) / math.sqrt(12)
    pfpn_e = sensor.sensor_pfpn / cg
    dark_e = sensor.sensor_dark * config.eit
    analytic = snr_model(1000.0, eit=config.eit, rn=lcg.sensor_rn, prnu=sensor.sensor_prnu, pfpn_electron=pfpn_e, dark_electron=dark_e, quant_electron=quant_noise)
    component_noise = noise_l["shot_electron"] + noise_l["read_electron"] + noise_l["prnu_electron"] + noise_l["pfpn_electron"] + noise_l["dark_electron"]
    empirical = 1000.0 / max(float(component_noise.std()), 1e-12)
    results["14_snr_graph_model_vs_empirical_noise"] = status(
        rel_err(empirical, analytic) < 0.08,
        "Analytic SNR graph model matches empirical component sampling at 1000 e-.",
        {"analytic_snr": analytic, "empirical_snr": empirical, "analytic_db": 20 * math.log10(analytic), "empirical_db": 20 * math.log10(empirical)},
    )

    snr1 = snr_one_root(eit=1.0, rn=lcg.sensor_rn, prnu=sensor.sensor_prnu, pfpn_electron=pfpn_e, dark_electron=dark_e, quant_electron=quant_noise)
    results["15_snr_one_marker"] = status(
        55.0 <= snr1 <= 75.0,
        "SNR=1 root is near the RN-dominated LCG threshold.",
        {"snr_one_electron": snr1, "rn": lcg.sensor_rn},
    )

    lcg_efwc = min(sensor.sensor_fwc, config.adc_full_scale(sensor) / lcg.sensor_cg)
    hcg_efwc = min(sensor.sensor_fwc, config.adc_full_scale(sensor) / hcg.sensor_cg)
    results["16_idcg_saturation_points"] = status(
        rel_err(lcg_efwc, 10000.0) < 1e-9 and rel_err(hcg_efwc, 156.25) < 1e-9,
        "IDCG saturation points differ by CG as expected, giving an SNR dip point for HCG.",
        {"lcg_effective_fwc_e": lcg_efwc, "hcg_effective_fwc_e": hcg_efwc},
    )

    return {
        "sensor": sensor.sensor_name,
        "input": str(hdr_path),
        "artifacts": {"out_dir": str(out_dir), "saved_raw": [str(l_path), str(h_path)]},
        "results": results,
        "summary": {
            "pass": sum(1 for item in results.values() if item["status"] == "PASS"),
            "fail": sum(1 for item in results.values() if item["status"] == "FAIL"),
            "total": len(results),
        },
    }


def sha256_array(array: np.ndarray) -> str:
    import hashlib

    return hashlib.sha256(np.asarray(array, dtype="<u2").tobytes()).hexdigest()


def display_path(value: str, repo: Path) -> str:
    path = Path(value)
    try:
        return str(path.resolve().relative_to(repo.resolve()))
    except ValueError:
        return str(path)


def write_markdown(report: dict[str, Any], path: Path, repo: Path) -> None:
    lines = [
        "# Noise Pipeline Validation Report",
        "",
        f"Sensor: `{report['sensor']}`",
        f"Input: `{display_path(report['input'], repo)}`",
        f"Summary: **{report['summary']['pass']}/{report['summary']['total']} PASS**, {report['summary']['fail']} FAIL",
        "",
        "## Checks",
        "",
    ]
    for name, item in report["results"].items():
        lines.extend(
            [
                f"### {name}: {item['status']}",
                "",
                item["detail"],
                "",
                "```json",
                json.dumps(item["metrics"], indent=2, sort_keys=True),
                "```",
                "",
            ]
        )
    lines.extend(
        [
            "## Artifacts",
            "",
            f"- Output directory: `{display_path(report['artifacts']['out_dir'], repo)}`",
            *[f"- Saved RAW: `{display_path(item, repo)}`" for item in report["artifacts"]["saved_raw"]],
            "",
        ]
    )
    path.write_text("\n".join(lines), encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate SensorNoiseSimulator noise pipeline assumptions.")
    parser.add_argument("--repo", default=".", help="Repository root.")
    parser.add_argument("--out-dir", default=".codex/noise-validation", help="Directory for JSON, report, and RAW artifacts.")
    args = parser.parse_args()
    repo = Path(args.repo).resolve()
    out_dir = (repo / args.out_dir).resolve()
    report = run(repo, out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    json_path = out_dir / "noise_validation_report.json"
    md_path = repo / "docs" / "noise-validation-report.md"
    json_path.write_text(json.dumps(report, indent=2, sort_keys=True), encoding="utf-8")
    write_markdown(report, md_path, repo)
    print(json.dumps(report["summary"], sort_keys=True))
    return 0 if report["summary"]["fail"] == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
