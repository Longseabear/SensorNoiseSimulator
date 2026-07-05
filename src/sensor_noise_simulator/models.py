from __future__ import annotations

from dataclasses import dataclass, field
import json
from pathlib import Path
from typing import Any


def adc_levels(bits: int) -> int:
    return 2 ** int(bits) - 1


def pedestal_for_adc_bits(bits: int) -> int:
    return 2 ** max(0, int(bits) - 4)


@dataclass(frozen=True)
class CGMode:
    name: str
    sensor_cg: float
    sensor_rn: float
    read_noise_seed: float


@dataclass
class SensorProfile:
    sensor_name: str
    sensor_fwc: float
    sensor_rn: float
    sensor_prnu: float
    sensor_cg: float
    sensor_pfpn: float
    sensor_dark: float = 0.0
    seeds: dict[str, float] = field(default_factory=dict)
    cg_modes: list[CGMode] = field(default_factory=list)

    @classmethod
    def from_json(cls, path: str | Path) -> "SensorProfile":
        with Path(path).open("r", encoding="utf-8") as handle:
            payload = json.load(handle)
        return cls.from_dict(payload)

    @classmethod
    def from_dict(cls, payload: dict[str, Any]) -> "SensorProfile":
        if payload.get("schema") not in (None, "SensorPRS"):
            raise ValueError(f"Unsupported SensorPRS schema: {payload.get('schema')}")
        seeds = {key: float(value) for key, value in dict(payload.get("Seeds", {})).items()}
        modes = []
        for index, mode in enumerate(payload.get("CGModes") or []):
            mode_seeds = dict(mode.get("Seeds", {}))
            modes.append(
                CGMode(
                    name=str(mode.get("Name") or f"CG{index}"),
                    sensor_cg=float(mode.get("SensorCG", payload.get("SensorCG", 1))),
                    sensor_rn=float(mode.get("SensorRN", payload.get("SensorRN", 0))),
                    read_noise_seed=float(mode_seeds.get("ReadNoise", seeds.get("ReadNoise", 3001))),
                )
            )
        if not modes:
            modes.append(
                CGMode(
                    name=str(payload.get("ActiveCGMode") or payload.get("SensorName") or "CG0"),
                    sensor_cg=float(payload.get("SensorCG", 1)),
                    sensor_rn=float(payload.get("SensorRN", 0)),
                    read_noise_seed=float(seeds.get("ReadNoise", 3001)),
                )
            )
        return cls(
            sensor_name=str(payload.get("SensorName", "SensorPRS")),
            sensor_fwc=float(payload.get("SensorFWC", 10000)),
            sensor_rn=float(payload.get("SensorRN", modes[0].sensor_rn)),
            sensor_prnu=float(payload.get("SensorPRNU", 0)),
            sensor_cg=float(payload.get("SensorCG", modes[0].sensor_cg)),
            sensor_pfpn=float(payload.get("SensorPFPN", 0)),
            sensor_dark=float(payload.get("SensorDark", 0)),
            seeds=seeds,
            cg_modes=modes,
        )

    def mode(self, selector: int | str | None = None) -> CGMode:
        if selector is None:
            return self.cg_modes[0]
        if isinstance(selector, int):
            try:
                return self.cg_modes[selector]
            except IndexError as exc:
                raise ValueError(f"CG mode index out of range: {selector}") from exc
        for mode in self.cg_modes:
            if mode.name == selector:
                return mode
        raise ValueError(f"Unknown CG mode: {selector}")

    def seed(self, key: str, fallback: float) -> float:
        return float(self.seeds.get(key, fallback))


@dataclass(frozen=True)
class ReadoutConfig:
    name: str
    sensor_cg: float
    sensor_rn: float
    read_noise_seed: float
    analog_gain: float = 1.0
    digital_gain: float = 1.0
    adc_bits: int = 10
    branch: str = "single"

    @classmethod
    def from_mode(
        cls,
        mode: CGMode,
        *,
        analog_gain: float = 1.0,
        digital_gain: float = 1.0,
        adc_bits: int = 10,
        branch: str = "single",
    ) -> "ReadoutConfig":
        return cls(
            name=mode.name,
            sensor_cg=mode.sensor_cg,
            sensor_rn=mode.sensor_rn,
            read_noise_seed=mode.read_noise_seed,
            analog_gain=float(analog_gain),
            digital_gain=float(digital_gain),
            adc_bits=int(adc_bits),
            branch=branch,
        )


@dataclass(frozen=True)
class SimulationConfig:
    eit: float = 1.0
    black: float = 0.0
    seed: float = 0.0
    adc_full_scale_uv: float | None = None

    def adc_full_scale(self, sensor: SensorProfile) -> float:
        return max(1.0, float(self.adc_full_scale_uv if self.adc_full_scale_uv is not None else sensor.sensor_fwc))
