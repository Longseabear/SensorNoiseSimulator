from __future__ import annotations

from pathlib import Path
import re

import numpy as np


def channel_for_pixel(x: np.ndarray, y: np.ndarray, pixel_type: str, pixel_order: int = 0) -> np.ndarray:
    if int(pixel_order) != 0:
        raise ValueError(f"Unsupported pixel order: {pixel_order}")
    if pixel_type == "Bayer":
        even_x = (x % 2) == 0
        even_y = (y % 2) == 0
        out = np.full(x.shape, "g", dtype="<U1")
        out[even_y & ~even_x] = "r"
        out[~even_y & even_x] = "b"
        return out
    if pixel_type in ("Tetra", "TetraSquare"):
        xx = x % 4
        yy = y % 4
        out = np.full(x.shape, "g", dtype="<U1")
        out[(yy < 2) & (xx >= 2)] = "r"
        out[(yy >= 2) & (xx < 2)] = "b"
        return out
    raise ValueError(f"Unsupported pixel type: {pixel_type}")


def _read_hdr_header(data: bytes) -> tuple[int, int, int]:
    probe = data[: min(len(data), 4096)].decode("ascii", errors="ignore")
    match = re.search(r"-Y\s+(\d+)\s+\+X\s+(\d+)", probe)
    if not match:
        raise ValueError("Unsupported HDR resolution header.")
    height = int(match.group(1))
    width = int(match.group(2))
    payload_start = match.start() + len(match.group(0))
    while payload_start < len(data) and data[payload_start] in (0x0D, 0x0A):
        payload_start += 1
    return width, height, payload_start


def _decode_radiance_payload(payload: bytes, width: int, height: int) -> np.ndarray:
    expected = width * height * 4
    raw = np.frombuffer(payload, dtype=np.uint8)
    if width < 8 or width > 32767 or len(raw) < 4 or raw[0] != 2 or raw[1] != 2 or (raw[2] & 0x80):
        if len(raw) < expected:
            raise ValueError("HDR payload is smaller than expected.")
        return raw[:expected].reshape(height, width, 4).copy()

    output = np.empty(expected, dtype=np.uint8)
    scanline = np.empty(width * 4, dtype=np.uint8)
    input_offset = 0
    output_offset = 0
    for _y in range(height):
        if (
            input_offset + 4 > len(raw)
            or raw[input_offset] != 2
            or raw[input_offset + 1] != 2
            or ((int(raw[input_offset + 2]) << 8) | int(raw[input_offset + 3])) != width
        ):
            raise ValueError("Unsupported or corrupt HDR RLE scanline.")
        input_offset += 4
        for channel in range(4):
            x = 0
            base = channel * width
            while x < width:
                if input_offset >= len(raw):
                    raise ValueError("Unexpected end of HDR RLE payload.")
                count = int(raw[input_offset])
                input_offset += 1
                if count > 128:
                    run_length = count - 128
                    if input_offset >= len(raw):
                        raise ValueError("Unexpected end of HDR RLE payload.")
                    value = raw[input_offset]
                    input_offset += 1
                    scanline[base + x : base + x + run_length] = value
                    x += run_length
                else:
                    if input_offset + count > len(raw):
                        raise ValueError("Unexpected end of HDR RLE payload.")
                    scanline[base + x : base + x + count] = raw[input_offset : input_offset + count]
                    input_offset += count
                    x += count
        for x in range(width):
            output[output_offset] = scanline[x]
            output[output_offset + 1] = scanline[width + x]
            output[output_offset + 2] = scanline[width * 2 + x]
            output[output_offset + 3] = scanline[width * 3 + x]
            output_offset += 4
    return output.reshape(height, width, 4)


def auto_hdr_white_point(rgb: np.ndarray, percentile: float = 0.75) -> float:
    luminance = 0.2126 * rgb[:, :, 0] + 0.7152 * rgb[:, :, 1] + 0.0722 * rgb[:, :, 2]
    sample_step = max(1, luminance.size // 65536)
    samples = np.sort(luminance.reshape(-1)[::sample_step])
    index = min(len(samples) - 1, max(0, int(len(samples) * percentile)))
    return float(samples[index])


def read_hdr_rgb(
    path: str | Path,
    photon_white_point: float | None = 1.0,
    *,
    auto_white_point: str | None = None,
) -> tuple[np.ndarray, float]:
    data = Path(path).read_bytes()
    width, height, payload_start = _read_hdr_header(data)
    payload = _decode_radiance_payload(data[payload_start:], width, height).astype(np.float32)
    exponent = payload[:, :, 3]
    scale = np.where(exponent == 0, 0.0, np.exp2(exponent - 128.0) / 256.0)
    rgb = payload[:, :, :3] * scale[:, :, None]
    if auto_white_point == "p75":
        reference = auto_hdr_white_point(rgb, 0.75)
    else:
        reference = float(1.0 if photon_white_point is None else photon_white_point)
    return rgb, max(1e-6, reference)


def load_hdr_mosaic(
    path: str | Path,
    *,
    pixel_type: str = "Bayer",
    pixel_order: int = 0,
    photon_white_point: float | None = 1.0,
    auto_white_point: str | None = None,
) -> np.ndarray:
    rgb, reference = read_hdr_rgb(path, photon_white_point, auto_white_point=auto_white_point)
    height, width, _ = rgb.shape
    yy, xx = np.indices((height, width))
    channels = channel_for_pixel(xx, yy, pixel_type, pixel_order)
    mosaic = np.empty((height, width), dtype=np.float32)
    mosaic[channels == "r"] = rgb[:, :, 0][channels == "r"]
    mosaic[channels == "g"] = rgb[:, :, 1][channels == "g"]
    mosaic[channels == "b"] = rgb[:, :, 2][channels == "b"]
    return np.clip(mosaic / reference, 0.0, 1.0).astype(np.float32)


def load_raw_u16_mosaic(
    path: str | Path,
    *,
    width: int,
    height: int,
    black_level: int = 64,
    white_level: int = 1023,
    byte_order: str = "little-endian",
) -> np.ndarray:
    dtype = "<u2" if byte_order == "little-endian" else ">u2"
    values = np.fromfile(path, dtype=dtype)
    expected = int(width) * int(height)
    if values.size < expected:
        raise ValueError("RAW file is smaller than metadata expects.")
    values = values[:expected].reshape(int(height), int(width)).astype(np.float32)
    scale = max(1.0, float(white_level) - float(black_level))
    return np.clip((values - float(black_level)) / scale, 0.0, 1.0).astype(np.float32)


def save_raw_u16(path: str | Path, image: np.ndarray) -> None:
    np.asarray(image, dtype="<u2").tofile(path)


def save_pgm_u16(path: str | Path, image: np.ndarray, valid_max: int | None = None) -> None:
    arr = np.asarray(image, dtype=np.uint16)
    max_value = int(valid_max if valid_max is not None else max(1, int(arr.max(initial=0))))
    header = f"P5\n{arr.shape[1]} {arr.shape[0]}\n{max_value}\n".encode("ascii")
    with Path(path).open("wb") as handle:
        handle.write(header)
        handle.write(arr.astype(">u2", copy=False).tobytes())
