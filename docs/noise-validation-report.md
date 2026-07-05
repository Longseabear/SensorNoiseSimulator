# Noise Pipeline Validation Report

Sensor: `BasicSensor`
Input: `examples\hosted-viewer\public\assets\test-inputs\linear_photon_ramp_512x256.hdr`
Summary: **16/16 PASS**, 0 FAIL

## Checks

### 01_idcg_shot_noise_shared: PASS

LCG/HCG shot arrays are bit-identical for the same photon input.

```json
{
  "hcg_shot_std": 31.644989624175693,
  "lcg_shot_std": 31.644989624175693,
  "max_abs_delta": 0.0
}
```

### 02_idcg_read_noise_independent: PASS

Read noise differs per CG mode seed and is effectively uncorrelated.

```json
{
  "correlation": 0.000897491335194745,
  "hcg_std": 0.9998826257057134,
  "lcg_std": 63.87904697488306
}
```

### 03_prnu_signal_proportional_fixed_pattern: PASS

PRNU is zero at zero signal and approximately signal*PRNU at 1000 e-.

```json
{
  "expected_std": 10.0,
  "std_at_1000e": 10.005709416347589,
  "zero_max_abs": 0.0
}
```

### 04_shot_noise_poisson_level: PASS

Shot noise sample std is close to sqrt(signal electron).

```json
{
  "expected": 31.622776601683793,
  "std": 31.644989624175693
}
```

### 05_read_noise_level_sampling: PASS

Read noise std follows per-readout RN.

```json
{
  "hcg_expected": 1.0,
  "hcg_std": 0.9998826257057134,
  "lcg_expected": 64.0,
  "lcg_std": 63.87904697488306
}
```

### 06_pfpn_cg_scaling: PASS

PFPN electron-domain amplitude scales as 1/CG.

```json
{
  "expected": 64.0,
  "std_ratio_lcg_over_hcg": 64.0
}
```

### 07_dark_pattern_eit_scaling: PASS

Dark pattern is shared between readouts and scales with EIT.

```json
{
  "ratio": 4.0,
  "std_eit1": 0.09990694407963177,
  "std_eit4": 0.3996277763185271
}
```

### 08_triple_cg_modes: PASS

Triple-CG sensor can simulate three modes and saturation rises with CG.

```json
{
  "HCG": {
    "cg": 64.0,
    "max": 4095,
    "min": 194,
    "rn": 1.0,
    "saturated": 129029
  },
  "LCG": {
    "cg": 1.0,
    "max": 4095,
    "min": 185,
    "rn": 64.0,
    "saturated": 816
  },
  "MCG": {
    "cg": 8.0,
    "max": 4095,
    "min": 207,
    "rn": 8.0,
    "saturated": 114675
  }
}
```

### 09_saved_raw_format_and_range: PASS

Saved RAW files are uint16-sized and remain in 10-bit valid code range.

```json
{
  "hcg_bytes": 262144,
  "hcg_max": 1023,
  "hcg_min": 43,
  "hcg_sha256": "a3ab31883d6ad6d89fbffadffb109071395edd5af7025e32434a7b7e6a5a98f8",
  "lcg_bytes": 262144,
  "lcg_max": 1023,
  "lcg_min": 46,
  "lcg_sha256": "4c2dea465e58531ce4e8901d0b2bc9455dafb05c221728962569b795878cf513"
}
```

### 10_saved_noise_level_sampling: PASS

Saved ADC sample noise level recovers the configured RN within quantization tolerance.

```json
{
  "expected_std_e": 32.0,
  "measured_std_e": 31.939610083881224
}
```

### 11_digital_gain_dither_path: PASS

Digital gain changes ADC output and still clips to ADC full scale.

```json
{
  "base_sha256": "cfe0336007baa1f4b053a775b985bc5c4e6feaf3fd6eccc35129c9da67501d17",
  "dg_max": 1023,
  "dg_sha256": "554265b5915caa61cf5afc660918d0d6efa7c9ac1e97ae783d9f4993a6a07545"
}
```

### 12_adc_pedestal_by_bit_depth: PASS

Pedestal follows 2^(bits-4).

```json
{
  "10": 64,
  "11": 128,
  "12": 256,
  "13": 512,
  "14": 1024,
  "15": 2048,
  "16": 4096,
  "8": 16,
  "9": 32
}
```

### 13_hdr_default_photon_white_point: PASS

Python HDR default matches web photonWhitePoint=1 behavior.

```json
{
  "max": 1.0,
  "mean": 0.49951171875
}
```

### 14_snr_graph_model_vs_empirical_noise: PASS

Analytic SNR graph model matches empirical component sampling at 1000 e-.

```json
{
  "analytic_db": 22.82797137257802,
  "analytic_snr": 13.848367134951788,
  "empirical_db": 22.852225215545698,
  "empirical_snr": 13.887090341278935
}
```

### 15_snr_one_marker: PASS

SNR=1 root is near the RN-dominated LCG threshold.

```json
{
  "rn": 64.0,
  "snr_one_electron": 64.64865681054056
}
```

### 16_idcg_saturation_points: PASS

IDCG saturation points differ by CG as expected, giving an SNR dip point for HCG.

```json
{
  "hcg_effective_fwc_e": 156.25,
  "lcg_effective_fwc_e": 10000.0
}
```

## Artifacts

- Output directory: `.codex\noise-validation`
- Saved RAW: `.codex\noise-validation\validation_LCG_10b.raw`
- Saved RAW: `.codex\noise-validation\validation_HCG_10b.raw`
