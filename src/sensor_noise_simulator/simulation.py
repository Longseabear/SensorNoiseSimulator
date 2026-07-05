from __future__ import annotations

from collections.abc import Mapping

import numpy as np

from .models import ReadoutConfig, SensorProfile, SimulationConfig, adc_levels, pedestal_for_adc_bits


def _fractional(value: np.ndarray) -> np.ndarray:
    return value - np.floor(value)


def dither_for_pixel(x: np.ndarray, y: np.ndarray, seed: float) -> np.ndarray:
    raw = np.sin(x * 419.2 + y * 173.7 + seed + 991.13) * 32719.917
    return _fractional(raw) - 0.5


def gaussian_like(x: np.ndarray, y: np.ndarray, noise_seed: float) -> np.ndarray:
    total = np.zeros_like(x, dtype=np.float64)
    for i in range(6):
        raw = np.sin(x * (127.1 + i * 31.7) + y * (311.7 + i * 17.3) + noise_seed + i * 101.9) * 43758.5453
        total += _fractional(raw)
    return (total - 3.0) / np.sqrt(0.5)


def sensor_noise_terms(
    x: np.ndarray,
    y: np.ndarray,
    signal_electron: np.ndarray,
    sensor: SensorProfile,
    readout: ReadoutConfig,
    eit: float = 1.0,
) -> Mapping[str, np.ndarray]:
    cg = max(float(readout.sensor_cg), 1e-9)
    prnu = signal_electron * sensor.sensor_prnu * gaussian_like(x, y, sensor.seed("PRNU", 1001))
    shot = np.sqrt(np.maximum(signal_electron, 0.0)) * gaussian_like(x, y, sensor.seed("ShotNoise", 2001))
    read = readout.sensor_rn * gaussian_like(x, y, readout.read_noise_seed)
    pfpn = (sensor.sensor_pfpn / cg) * gaussian_like(x, y, sensor.seed("PFPN", 1002))
    dark = sensor.sensor_dark * max(float(eit), 0.0) * gaussian_like(x, y, sensor.seed("Dark", 1003))
    total = prnu + shot + read + pfpn + dark
    return {
        "prnu_electron": prnu,
        "shot_electron": shot,
        "read_electron": read,
        "pfpn_electron": pfpn,
        "dark_electron": dark,
        "total_electron": total,
    }


def js_round(value: np.ndarray) -> np.ndarray:
    return np.floor(value + 0.5)


def simulate_adc(
    photon_mosaic: np.ndarray,
    sensor: SensorProfile,
    readout: ReadoutConfig,
    config: SimulationConfig | None = None,
) -> np.ndarray:
    cfg = config or SimulationConfig()
    mosaic = np.asarray(photon_mosaic, dtype=np.float64)
    if mosaic.ndim != 2:
        raise ValueError("photon_mosaic must be a 2D array.")

    height, width = mosaic.shape
    yy, xx = np.indices((height, width), dtype=np.float64)
    levels = adc_levels(readout.adc_bits)
    pedestal = pedestal_for_adc_bits(readout.adc_bits)
    adc_full_scale = cfg.adc_full_scale(sensor)

    signal_electron = np.maximum(0.0, mosaic * sensor.sensor_fwc * cfg.eit)
    noise = sensor_noise_terms(xx, yy, signal_electron, sensor, readout, cfg.eit)
    electron = signal_electron + noise["total_electron"]
    voltage = electron * readout.sensor_cg * readout.analog_gain
    normalized_signal = voltage / max(adc_full_scale, 1e-9) - cfg.black
    code_float = pedestal + normalized_signal * max(0, levels - pedestal)
    adc_code = np.clip(np.floor(code_float), 0, levels)

    if abs(readout.digital_gain - 1.0) > 1e-6:
        signal_code = adc_code - pedestal
        adc_code = np.clip(
            js_round(pedestal + signal_code * readout.digital_gain + dither_for_pixel(xx, yy, cfg.seed)),
            0,
            levels,
        )

    return adc_code.astype(np.uint16)


def simulate_idcg(
    photon_mosaic: np.ndarray,
    sensor: SensorProfile,
    shot_readout: ReadoutConfig,
    long_readout: ReadoutConfig,
    config: SimulationConfig | None = None,
) -> dict[str, np.ndarray]:
    return {
        shot_readout.name: simulate_adc(photon_mosaic, sensor, shot_readout, config),
        long_readout.name: simulate_adc(photon_mosaic, sensor, long_readout, config),
    }
