const {
  hdrPixelCountFromBuffer,
  parseHdrDirectToSensorMosaic: parseHdrDirectToSensorMosaicInput,
  parseHdrToRgbFloat,
  parseRawU16ToFloat,
  sampleHdrRgbToSensorMosaic: sampleHdrRgbToSensorMosaicInput,
} = globalThis.NoiseInputs;
const { ispShader } = globalThis.NoiseShaders;
const {
  formatScaleInput,
  setLogStateFromSlider: setLogStateFromSliderValue,
  setLogStateFromText: setLogStateFromTextValue,
  syncControlFromState: syncControlFromStateValue,
  syncControlsFromState: syncControlsFromStateValue,
  syncStateFromControl: syncStateFromControlValue,
  syncStateFromControls: syncStateFromControlsValue,
} = globalThis.NoiseState;

globalThis.__noiseBoot = "main script loaded";

const canvas = document.querySelector("#viewer");
const previewCanvas = document.querySelector("#viewer2d");
const previewContext = previewCanvas.getContext("2d", { alpha: false });
const canvasB = document.querySelector("#viewerB");
const previewCanvasB = document.querySelector("#viewer2dB");
const previewContextB = previewCanvasB.getContext("2d", { alpha: false });
const viewport = document.querySelector("#viewport");
const histogramCanvas = document.querySelector("#histogram");
const histogramContext = histogramCanvas.getContext("2d");
const histLogButton = document.querySelector("#histLog");
const histLinearButton = document.querySelector("#histLinear");
const histSnrButton = document.querySelector("#histSnr");
const statusEl = document.querySelector("#status");
const backendBadge = document.querySelector("#backendBadge");
const diagnosticsEl = document.querySelector("#diagnostics");
const readoutLabelA = document.querySelector("#readoutLabelA");
const readoutLabelB = document.querySelector("#readoutLabelB");
const shellEl = document.querySelector(".shell");
const panelResizer = document.querySelector("#panelResizer");
const bayerViewerTab = document.querySelector("#bayerViewerTab");
const rgbViewerTab = document.querySelector("#rgbViewerTab");
const settingsTabs = {
  input: document.querySelector("#inputSettingsTab"),
  sensor: document.querySelector("#sensorSettingsTab"),
  sensorControl: document.querySelector("#sensorControlSettingsTab"),
  isp: document.querySelector("#ispSettingsTab"),
};
const settingsPanels = {
  input: document.querySelector("#inputSettingsPanel"),
  sensor: document.querySelector("#sensorSettingsPanel"),
  sensorControl: document.querySelector("#sensorControlSettingsPanel"),
  isp: document.querySelector("#ispSettingsPanel"),
};
const sampleSelect = document.querySelector("#sample");
const localFileInput = document.querySelector("#localFile");
const pixelTypeSelect = document.querySelector("#pixelType");
const pixelOrderSelect = document.querySelector("#pixelOrder");
const sensorProfileSelect = document.querySelector("#sensorProfile");
const sensorCgModeSelect = document.querySelector("#sensorCgMode");
const localSensorProfileInput = document.querySelector("#localSensorProfile");
const saveSensorProfileButton = document.querySelector("#saveSensorProfile");
const saveSimulationResultButton = document.querySelector("#saveSimulationResult");
const acquisitionModeSelect = document.querySelector("#acquisitionMode");
const idcgModeASelect = document.querySelector("#idcgModeA");
const idcgModeBSelect = document.querySelector("#idcgModeB");
const adcBitsSelect = document.querySelector("#adcBits");
const idcgShotAdcBitsSelect = document.querySelector("#idcgShotAdcBits");
const idcgLongAdcBitsSelect = document.querySelector("#idcgLongAdcBits");
const viewModeSelect = document.querySelector("#viewMode");
const sensorEffectiveEl = document.querySelector("#sensorEffective");
const sensorInputs = {
  SensorFWC: document.querySelector("#sensorFWC"),
  SensorCG: document.querySelector("#sensorCG"),
  SensorRN: document.querySelector("#sensorRN"),
  SensorPRNU: document.querySelector("#sensorPRNU"),
  SensorPFPN: document.querySelector("#sensorPFPN"),
  SensorDark: document.querySelector("#sensorDark"),
  Pedestal: document.querySelector("#sensorPedestal"),
  ADCFullScale: document.querySelector("#sensorADCFullScale"),
};
const sensorSliders = {
  SensorFWC: document.querySelector("#sensorFWCSlider"),
  SensorCG: document.querySelector("#sensorCGSlider"),
  SensorRN: document.querySelector("#sensorRNSlider"),
  SensorPRNU: document.querySelector("#sensorPRNUSlider"),
  SensorPFPN: document.querySelector("#sensorPFPNSlider"),
  SensorDark: document.querySelector("#sensorDarkSlider"),
  Pedestal: document.querySelector("#sensorPedestalSlider"),
  ADCFullScale: document.querySelector("#sensorADCFullScaleSlider"),
};
const sensorSliderSchema = {
  SensorFWC: { scale: "log10", min: 100, max: 1000000, precision: 0 },
  SensorCG: { scale: "log10", min: 0.01, max: 1000, precision: 4 },
  SensorRN: { scale: "linear", min: 0, max: 200, precision: 3 },
  SensorPRNU: { scale: "linear", min: 0, max: 0.2, precision: 4 },
  SensorPFPN: { scale: "linear", min: 0, max: 1000, precision: 3 },
  SensorDark: { scale: "linear", min: 0, max: 1000, precision: 3 },
  Pedestal: { scale: "linear", min: 0, max: 4096, precision: 0 },
  ADCFullScale: { scale: "log10", min: 100, max: 1000000, precision: 0 },
};
const controls = {
  eit: document.querySelector("#eit"),
  analogGain: document.querySelector("#analogGain"),
  digitalGain: document.querySelector("#digitalGain"),
  idcgShotAnalogGain: document.querySelector("#idcgShotAnalogGain"),
  idcgShotDigitalGain: document.querySelector("#idcgShotDigitalGain"),
  idcgLongAnalogGain: document.querySelector("#idcgLongAnalogGain"),
  idcgLongDigitalGain: document.querySelector("#idcgLongDigitalGain"),
  black: document.querySelector("#black"),
};
const outputs = {
  eit: document.querySelector("#eitValue"),
  analogGain: document.querySelector("#analogGainValue"),
  digitalGain: document.querySelector("#digitalGainValue"),
  idcgShotAnalogGain: document.querySelector("#idcgShotAnalogGainValue"),
  idcgShotDigitalGain: document.querySelector("#idcgShotDigitalGainValue"),
  idcgLongAnalogGain: document.querySelector("#idcgLongAnalogGainValue"),
  idcgLongDigitalGain: document.querySelector("#idcgLongDigitalGainValue"),
  black: document.querySelector("#blackValue"),
};
const scaleTextInputs = {
  eit: document.querySelector("#eitText"),
  analogGain: document.querySelector("#analogGainText"),
  digitalGain: document.querySelector("#digitalGainText"),
  idcgShotAnalogGain: document.querySelector("#idcgShotAnalogGainText"),
  idcgShotDigitalGain: document.querySelector("#idcgShotDigitalGainText"),
  idcgLongAnalogGain: document.querySelector("#idcgLongAnalogGainText"),
  idcgLongDigitalGain: document.querySelector("#idcgLongDigitalGainText"),
};
const ispInputs = {
  wbR: document.querySelector("#wbR"),
  wbB: document.querySelector("#wbB"),
  gamma: document.querySelector("#gamma"),
};

const parameterSchema = {
  "input.pixelType": { label: "Pixel type", control: pixelTypeSelect, type: "select" },
  "input.pixelOrder": { label: "Pixel order", control: pixelOrderSelect, type: "number-select" },
  "simulation.eit": { label: "EIT", unit: "x", type: "log-number", min: 1 / 64, max: 64, slider: controls.eit, input: scaleTextInputs.eit },
  "simulation.analogGain": { label: "Analog gain", unit: "x", type: "log-number", min: 1, max: 32, slider: controls.analogGain, input: scaleTextInputs.analogGain },
  "simulation.digitalGain": { label: "Digital gain", unit: "x", type: "log-number", min: 1, max: 32, slider: controls.digitalGain, input: scaleTextInputs.digitalGain },
  "simulation.idcgShotAnalogGain": { label: "Shot analog gain", unit: "x", type: "log-number", min: 1, max: 32, slider: controls.idcgShotAnalogGain, input: scaleTextInputs.idcgShotAnalogGain },
  "simulation.idcgShotDigitalGain": { label: "Shot digital gain", unit: "x", type: "log-number", min: 1, max: 32, slider: controls.idcgShotDigitalGain, input: scaleTextInputs.idcgShotDigitalGain },
  "simulation.idcgLongAnalogGain": { label: "Long analog gain", unit: "x", type: "log-number", min: 1, max: 32, slider: controls.idcgLongAnalogGain, input: scaleTextInputs.idcgLongAnalogGain },
  "simulation.idcgLongDigitalGain": { label: "Long digital gain", unit: "x", type: "log-number", min: 1, max: 32, slider: controls.idcgLongDigitalGain, input: scaleTextInputs.idcgLongDigitalGain },
  "simulation.black": { label: "Black level", type: "number", control: controls.black },
  "simulation.adcBits": { label: "ADC bit depth", unit: "bit", type: "number-select", control: adcBitsSelect },
  "simulation.idcgShotAdcBits": { label: "Shot ADC bit depth", unit: "bit", type: "number-select", control: idcgShotAdcBitsSelect },
  "simulation.idcgLongAdcBits": { label: "Long ADC bit depth", unit: "bit", type: "number-select", control: idcgLongAdcBitsSelect },
  "simpleIsp.wbR": { label: "WB R", type: "number", control: ispInputs.wbR },
  "simpleIsp.wbB": { label: "WB B", type: "number", control: ispInputs.wbB },
  "simpleIsp.gamma": { label: "Gamma", type: "number", control: ispInputs.gamma },
  "view.mode": { label: "View mode", type: "number-select", control: viewModeSelect },
  "sensor.SensorFWC": { label: "FWC", unit: "e-", type: "number", control: sensorInputs.SensorFWC },
  "sensor.SensorCG": { label: "CG", unit: "uV/e-", type: "number", control: sensorInputs.SensorCG },
  "sensor.SensorRN": { label: "RN", unit: "e-", type: "number", control: sensorInputs.SensorRN },
  "sensor.SensorPRNU": { label: "PRNU", unit: "ratio", type: "number", control: sensorInputs.SensorPRNU },
  "sensor.SensorPFPN": { label: "PFPN", unit: "uV", type: "number", control: sensorInputs.SensorPFPN },
  "sensor.SensorDark": { label: "Dark", unit: "e-/s", type: "number", control: sensorInputs.SensorDark },
  "sensor.Pedestal": { label: "Pedestal", unit: "LSB", type: "number", control: sensorInputs.Pedestal },
  "sensor.ADCFullScale": { label: "ADC full-scale", unit: "uV", type: "number", control: sensorInputs.ADCFullScale },
};

const appState = {
  input: {
    pixelType: "Bayer",
    pixelOrder: 0,
  },
  sensor: {
    SensorName: "FallbackSensor",
    SensorFWC: 10000,
    SensorRN: 0,
    SensorCG: 1,
    SensorPRNU: 0,
    SensorPFPN: 0,
    SensorDark: 0,
    Pedestal: 64,
    ADCFullScale: 10000,
    Seeds: { ReadNoise: 3001 },
  },
  simulation: {
    acquisitionMode: "single",
    idcgModeA: 0,
    idcgModeB: 1,
    eit: 1,
    analogGain: 1,
    digitalGain: 1,
    idcgShotAnalogGain: 1,
    idcgShotDigitalGain: 1,
    idcgLongAnalogGain: 1,
    idcgLongDigitalGain: 1,
    black: 0,
    adcBits: 10,
    idcgShotAdcBits: 10,
    idcgLongAdcBits: 10,
    seed: Math.random() * 1000,
  },
  simpleIsp: {
    wbR: 1,
    wbB: 1,
    gamma: 2.2,
  },
  view: {
    mode: 0,
  },
};

let seed = appState.simulation.seed;
let activeInputLabel = "No input";
let activeSource = null;
let inputMeta = { width: 1, height: 1 };
let activeMosaic = new Float32Array([0]);
let histogramScale = "log";
let renderCount = 0;
let histogramCount = 0;
let lastHistogramEit = 1;
let lastDrawMs = 0;
let lastHistogramMs = 0;
let sensorProfiles = [];
let activeSensor = appState.sensor;
let activeCgModeIndex = 0;
let view = { scale: 1, x: 0, y: 0 };
let panStart = null;
let zoomFrame = 0;
let debugDigestToken = 0;
const debugDigestsEnabled = new URLSearchParams(window.location.search).has("debugDigests");

function syncStateFromControl(path) {
  syncStateFromControlValue(appState, parameterSchema, path);
}

function syncControlFromState(path) {
  syncControlFromStateValue(appState, parameterSchema, path);
}

function syncStateFromControls(paths = Object.keys(parameterSchema)) {
  syncStateFromControlsValue(appState, parameterSchema, paths);
}

function syncControlsFromState(paths = Object.keys(parameterSchema)) {
  syncControlsFromStateValue(appState, parameterSchema, paths);
}

function setLogStateFromSlider(path) {
  setLogStateFromSliderValue(appState, parameterSchema, path);
}

function setLogStateFromText(path) {
  setLogStateFromTextValue(appState, parameterSchema, path);
}

function setGpuVisible(enabled) {
  canvas.classList.toggle("is-active", enabled);
  canvasB.classList.toggle("is-active", enabled && isIdcgMode());
  previewCanvas.classList.toggle("is-hidden", enabled);
  previewCanvasB.classList.toggle("is-hidden", enabled);
}

function setBackendBadge(backend) {
  backendBadge.textContent = `Render: ${backend}`;
  backendBadge.classList.toggle("is-gpu", backend === "WebGPU");
  backendBadge.classList.toggle("is-fallback", backend !== "WebGPU");
}

function updateViewerTabs() {
  bayerViewerTab.classList.toggle("is-active", appState.view.mode === 0);
  rgbViewerTab.classList.toggle("is-active", appState.view.mode === 4);
}

function showSettingsPanel(activePanel) {
  for (const [name, tab] of Object.entries(settingsTabs)) {
    tab.classList.toggle("is-active", name === activePanel);
  }
  for (const [name, panel] of Object.entries(settingsPanels)) {
    panel.classList.toggle("is-active", name === activePanel);
  }
}

function setPanelWidth(width) {
  const maxWidth = Math.max(320, Math.min(620, window.innerWidth - 420));
  const nextWidth = Math.max(320, Math.min(maxWidth, width));
  document.documentElement.style.setProperty("--panel-width", `${nextWidth}px`);
  localStorage.setItem("ispViewerPanelWidth", String(Math.round(nextWidth)));
  return nextWidth;
}

function restorePanelWidth() {
  const storedWidth = Number(localStorage.getItem("ispViewerPanelWidth"));
  if (Number.isFinite(storedWidth) && storedWidth > 0) setPanelWidth(storedWidth);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => {
    if (char === "&") return "&amp;";
    if (char === "<") return "&lt;";
    if (char === ">") return "&gt;";
    if (char === '"') return "&quot;";
    return "&#39;";
  });
}

function updateDiagnostics(backend, detail = "") {
  diagnosticsEl.innerHTML =
    `<strong>${backend}</strong>` +
    ` | EIT ${formatScaleInput(appState.simulation.eit)}x` +
    ` | render #${renderCount} ${lastDrawMs.toFixed(1)}ms` +
    ` | hist #${histogramCount} @ ${formatScaleInput(lastHistogramEit)}x ${lastHistogramMs.toFixed(1)}ms` +
    `<br>${escapeHtml(detail || "No WebGPU detail yet.")}`;
}

function shortGpuError(error) {
  if (!error) return "unknown error";
  return String(error.message || error).replace(/\s+/g, " ").slice(0, 180);
}

function updateOutputs() {
  const eit = appState.simulation.eit;
  const analog = appState.simulation.analogGain;
  const digital = appState.simulation.digitalGain;
  updateViewerTabs();
  outputs.eit.value = `${eit.toFixed(2)}x`;
  outputs.analogGain.value = `${analog.toFixed(2)}x`;
  outputs.digitalGain.value = `${digital.toFixed(2)}x`;
  outputs.idcgShotAnalogGain.value = `${appState.simulation.idcgShotAnalogGain.toFixed(2)}x`;
  outputs.idcgShotDigitalGain.value = `${appState.simulation.idcgShotDigitalGain.toFixed(2)}x`;
  outputs.idcgLongAnalogGain.value = `${appState.simulation.idcgLongAnalogGain.toFixed(2)}x`;
  outputs.idcgLongDigitalGain.value = `${appState.simulation.idcgLongDigitalGain.toFixed(2)}x`;
  syncControlFromState("simulation.eit");
  syncControlFromState("simulation.analogGain");
  syncControlFromState("simulation.digitalGain");
  syncControlFromState("simulation.idcgShotAnalogGain");
  syncControlFromState("simulation.idcgShotDigitalGain");
  syncControlFromState("simulation.idcgLongAnalogGain");
  syncControlFromState("simulation.idcgLongDigitalGain");
  syncControlFromState("simulation.adcBits");
  syncControlFromState("simulation.idcgShotAdcBits");
  syncControlFromState("simulation.idcgLongAdcBits");
  outputs.black.value = Number(appState.simulation.black).toFixed(3);
}

function eitScale() {
  return appState.simulation.eit;
}

function analogGainScale() {
  return appState.simulation.analogGain;
}

function digitalGainScale() {
  return appState.simulation.digitalGain;
}

function setLogSliderFromScale(slider, value, min, max) {
  const clipped = Math.min(max, Math.max(min, Number(value)));
  slider.value = String(Math.log2(clipped));
}

function pixelTypeId() {
  if (appState.input.pixelType === "Bayer") return 0;
  if (appState.input.pixelType === "Tetra") return 1;
  if (appState.input.pixelType === "TetraSquare") return 2;
  return 0;
}

function adcLevels(bits = appState.simulation.adcBits) {
  return 2 ** Number(bits) - 1;
}

function pedestalForAdcBits(bits = appState.simulation.adcBits) {
  return 2 ** Math.max(0, Number(bits) - 4);
}

function viewModeId() {
  return Number(appState.view.mode);
}

function sensorValue(key, fallback = 0) {
  return Number(appState.sensor?.[key] ?? fallback);
}

function adcFullScaleUv() {
  return Math.max(1, sensorValue("SensorFWC", 10000));
}

function sensorSeed(key, fallback = 0) {
  return Number(appState.sensor?.Seeds?.[key] ?? fallback);
}

function activeCgMode() {
  const modes = appState.sensor.CGModes || [];
  return modes[Math.min(Math.max(0, activeCgModeIndex), Math.max(0, modes.length - 1))] || null;
}

function sensorDisplayValue(key, fallback = 0) {
  const mode = activeCgMode();
  if ((key === "SensorCG" || key === "SensorRN") && mode && mode[key] != null) {
    return Number(mode[key]);
  }
  return sensorValue(key, fallback);
}

function isIdcgMode() {
  return appState.simulation.acquisitionMode === "idcg";
}

function renderWidth() {
  return inputMeta.width * (isIdcgMode() ? 2 : 1);
}

function readoutGainConfig(branch = "single") {
  if (!isIdcgMode()) {
    return {
      analogGain: analogGainScale(),
      digitalGain: digitalGainScale(),
      adcBits: Number(appState.simulation.adcBits),
    };
  }
  if (branch === "long") {
    return {
      analogGain: appState.simulation.idcgLongAnalogGain,
      digitalGain: appState.simulation.idcgLongDigitalGain,
      adcBits: Number(appState.simulation.idcgLongAdcBits),
    };
  }
  return {
    analogGain: appState.simulation.idcgShotAnalogGain,
    digitalGain: appState.simulation.idcgShotDigitalGain,
    adcBits: Number(appState.simulation.idcgShotAdcBits),
  };
}

function readoutConfig(modeIndex = activeCgModeIndex, branch = "single") {
  const modes = appState.sensor.CGModes || [];
  const mode = modes[Math.min(Math.max(0, modeIndex), Math.max(0, modes.length - 1))] || {};
  const gains = readoutGainConfig(branch);
  return {
    name: mode.Name || appState.sensor.ActiveCGMode || "CG",
    sensorCG: Number(mode.SensorCG ?? appState.sensor.SensorCG ?? 1),
    sensorRN: Number(mode.SensorRN ?? appState.sensor.SensorRN ?? 0),
    readNoiseSeed: Number(mode.Seeds?.ReadNoise ?? appState.sensor.Seeds?.ReadNoise ?? 3001),
    branch,
    analogGain: gains.analogGain,
    digitalGain: gains.digitalGain,
    adcBits: gains.adcBits,
  };
}

function activeReadoutConfigs() {
  if (!isIdcgMode()) return [readoutConfig(activeCgModeIndex)];
  return [
    readoutConfig(appState.simulation.idcgModeA, "shot"),
    readoutConfig(appState.simulation.idcgModeB, "long"),
  ];
}

function renderIdcgModeSelects() {
  const modes = appState.sensor.CGModes || [];
  const options = modes.map((mode, index) => {
    const option = document.createElement("option");
    option.value = String(index);
    option.textContent = mode.Name || `CG${index}`;
    return option;
  });
  idcgModeASelect.replaceChildren(...options.map((option) => option.cloneNode(true)));
  idcgModeBSelect.replaceChildren(...options.map((option) => option.cloneNode(true)));
  appState.simulation.idcgModeA = Math.min(appState.simulation.idcgModeA, Math.max(0, modes.length - 1));
  appState.simulation.idcgModeB = Math.min(Math.max(1, appState.simulation.idcgModeB), Math.max(0, modes.length - 1));
  idcgModeASelect.value = String(appState.simulation.idcgModeA);
  idcgModeBSelect.value = String(appState.simulation.idcgModeB);
}

function updateReadoutLabels() {
  const readouts = activeReadoutConfigs();
  acquisitionModeSelect.value = appState.simulation.acquisitionMode;
  readoutLabelA.textContent = readouts[0]?.name || "";
  readoutLabelB.textContent = readouts[1]?.name || "";
  readoutLabelA.classList.toggle("is-active", isIdcgMode());
  readoutLabelB.classList.toggle("is-active", isIdcgMode());
  viewport.classList.toggle("is-idcg", isIdcgMode());
  document.querySelector("#sensorControlSettingsPanel").classList.toggle("is-idcg", isIdcgMode());
}

function buildGpuParams({ readouts = activeReadoutConfigs(), outputWidth = renderWidth(), acquisitionMode = isIdcgMode() ? 1 : 0 } = {}) {
  const primary = readouts[0] || readoutConfig();
  const secondary = readouts[1] || primary;
  return new Float32Array([
    outputWidth,
    inputMeta.height,
    appState.simulation.eit,
    primary.analogGain,
    primary.digitalGain,
    appState.simulation.black,
    seed,
    pixelTypeId(),
    adcLevels(primary.adcBits),
    viewModeId(),
    sensorValue("SensorFWC", 10000),
    primary.sensorRN,
    primary.sensorCG,
    sensorValue("SensorPRNU", 0),
    sensorValue("SensorPFPN", 0),
    pedestalForAdcBits(primary.adcBits),
    adcFullScaleUv(),
    appState.simpleIsp.wbR || 1,
    appState.simpleIsp.wbB || 1,
    appState.simpleIsp.gamma || 2.2,
    inputMeta.width,
    acquisitionMode,
    secondary.sensorRN,
    secondary.sensorCG,
    primary.readNoiseSeed,
    secondary.readNoiseSeed,
    sensorValue("SensorDark", 0),
    sensorSeed("Dark", 1003),
    sensorSeed("PRNU", 1001),
    sensorSeed("PFPN", 1002),
    sensorSeed("ShotNoise", 2001),
    0,
  ]);
}

function ditherForPixel(x, y) {
  const raw = Math.sin(x * 419.2 + y * 173.7 + seed + 991.13) * 32719.917;
  return raw - Math.floor(raw) - 0.5;
}

function gaussianLike(x, y, noiseSeed) {
  let sum = 0;
  for (let i = 0; i < 6; i += 1) {
    const raw = Math.sin(x * (127.1 + i * 31.7) + y * (311.7 + i * 17.3) + noiseSeed + i * 101.9) * 43758.5453;
    sum += raw - Math.floor(raw);
  }
  return (sum - 3) / Math.sqrt(0.5);
}

function sensorNoiseTerms(x, y, signalElectron, readout = readoutConfig(), eit = eitScale()) {
  const prnu = sensorValue("SensorPRNU", 0);
  const rn = readout.sensorRN;
  const cg = Math.max(readout.sensorCG, 1e-9);
  const pfpn = sensorValue("SensorPFPN", 0);
  const dark = sensorValue("SensorDark", 0);

  const prnuElectron = signalElectron * prnu * gaussianLike(x, y, sensorSeed("PRNU", 1001));
  const shotElectron = Math.sqrt(Math.max(signalElectron, 0)) * gaussianLike(x, y, sensorSeed("ShotNoise", 2001));
  const readElectron = rn * gaussianLike(x, y, readout.readNoiseSeed);
  const pfpnElectron = (pfpn / cg) * gaussianLike(x, y, sensorSeed("PFPN", 1002));
  const darkElectron = dark * Math.max(0, eit) * gaussianLike(x, y, sensorSeed("Dark", 1003));

  return {
    prnuElectron,
    shotElectron,
    readElectron,
    pfpnElectron,
    darkElectron,
    totalElectron: prnuElectron + shotElectron + readElectron + pfpnElectron + darkElectron,
  };
}

function clampSensorValue(key, value) {
  const schema = sensorSliderSchema[key];
  const number = Number(value);
  if (!schema || !Number.isFinite(number)) return 0;
  return Math.min(schema.max, Math.max(schema.min, number));
}

function sensorValueToSlider(key, value) {
  const schema = sensorSliderSchema[key];
  const clipped = clampSensorValue(key, value);
  if (schema.scale === "log10") return Math.log10(Math.max(schema.min, clipped));
  return clipped;
}

function sensorSliderToValue(key, sliderValue) {
  const schema = sensorSliderSchema[key];
  const number = Number(sliderValue);
  const value = schema.scale === "log10" ? 10 ** number : number;
  return clampSensorValue(key, value);
}

function formatSensorValue(key, value) {
  const schema = sensorSliderSchema[key];
  const clipped = clampSensorValue(key, value);
  if (schema.precision === 0) return String(Math.round(clipped));
  return Number(clipped.toFixed(schema.precision)).toString();
}

function syncSensorSliderFromInput(key) {
  sensorSliders[key].value = String(sensorValueToSlider(key, sensorInputs[key].value));
}

function syncSensorInputFromSlider(key) {
  const value = sensorSliderToValue(key, sensorSliders[key].value);
  sensorInputs[key].value = formatSensorValue(key, value);
}

function updateSensorEditor() {
  activeSensor = appState.sensor;
  appState.sensor.ADCFullScale = adcFullScaleUv();
  appState.sensor.Pedestal = pedestalForAdcBits(activeReadoutConfigs()[0]?.adcBits);
  for (const [key, input] of Object.entries(sensorInputs)) {
    input.value = String(sensorDisplayValue(key, 0));
    syncSensorSliderFromInput(key);
  }
  updateSensorEffective();
}

function readSensorEditor() {
  appState.sensor = { ...appState.sensor };
  for (const [key, input] of Object.entries(sensorInputs)) {
    if (key === "Pedestal") continue;
    appState.sensor[key] = Number(input.value);
  }
  const modes = Array.isArray(appState.sensor.CGModes) ? appState.sensor.CGModes.slice() : [];
  const mode = modes[activeCgModeIndex];
  if (mode) {
    modes[activeCgModeIndex] = {
      ...mode,
      SensorCG: Number(sensorInputs.SensorCG.value),
      SensorRN: Number(sensorInputs.SensorRN.value),
    };
    appState.sensor.CGModes = modes;
  }
  appState.sensor.Pedestal = pedestalForAdcBits(activeReadoutConfigs()[0]?.adcBits);
  appState.sensor.ADCFullScale = adcFullScaleUv();
  sensorInputs.ADCFullScale.value = formatSensorValue("ADCFullScale", appState.sensor.ADCFullScale);
  syncSensorSliderFromInput("ADCFullScale");
  activeSensor = appState.sensor;
  updateSensorEffective();
  updateActiveCgModeLabel();
}

function updatePedestalDisplay(bits = activeReadoutConfigs()[0]?.adcBits) {
  const pedestal = pedestalForAdcBits(bits);
  appState.sensor.Pedestal = pedestal;
  sensorInputs.Pedestal.value = formatSensorValue("Pedestal", pedestal);
  syncSensorSliderFromInput("Pedestal");
}

function updateSensorEffective() {
  const primary = activeReadoutConfigs()[0] || readoutConfig();
  const adcMax = adcLevels(primary.adcBits);
  const fwc = sensorValue("SensorFWC", 0);
  const cg = primary.sensorCG;
  const pedestal = pedestalForAdcBits(primary.adcBits);
  const adcFullScale = adcFullScaleUv();
  const fwcVoltage = fwc * cg;
  const fwcCode = pedestal + (fwcVoltage / Math.max(adcFullScale, 1e-9)) * Math.max(0, adcMax - pedestal);
  const mode = appState.sensor.ActiveCGMode ? `${appState.sensor.ActiveCGMode}: ` : "";
  updatePedestalDisplay(primary.adcBits);
  sensorEffectiveEl.textContent = `${mode}photon 1.0 maps to ${fwc.toFixed(1)} e- / ${fwcVoltage.toFixed(1)} uV. ADC full-scale ${adcFullScale.toFixed(1)} uV, pedestal ${pedestal.toFixed(0)} LSB (${primary.adcBits}b), FWC maps to ${fwcCode.toFixed(1)} LSB.`;
}

function cgModeOptionText(mode) {
  return `${mode.Name} - CG ${formatSensorValue("SensorCG", mode.SensorCG)} uV/e-, RN ${formatSensorValue("SensorRN", mode.SensorRN)} e-`;
}

function updateActiveCgModeLabel() {
  const mode = activeCgMode();
  const option = sensorCgModeSelect.options[activeCgModeIndex];
  if (mode && option) option.textContent = cgModeOptionText(mode);
}

function updateCanvasZoom() {
  for (const target of [canvas, previewCanvas, canvasB, previewCanvasB]) {
    target.style.width = `${inputMeta.width}px`;
    target.style.height = `${inputMeta.height}px`;
    target.style.transform = `translate(${view.x}px, ${view.y}px) scale(${view.scale})`;
  }
}

function scheduleCanvasZoom() {
  if (zoomFrame) return;
  zoomFrame = requestAnimationFrame(() => {
    zoomFrame = 0;
    updateCanvasZoom();
  });
}

function panGain() {
  return Math.max(1, Math.min(12, Math.sqrt(Math.max(1, view.scale)) * 2));
}

function sensorMaskCpu(x, y) {
  const channel = sensorChannelCpu(x, y);
  if (channel === "r") return [1, 0, 0];
  if (channel === "b") return [0, 0, 1];
  return [0, 1, 0];
}

function sensorChannelCpu(x, y) {
  const pixelType = appState.input.pixelType;
  if (pixelType === "Bayer") {
    const evenX = x % 2 === 0;
    const evenY = y % 2 === 0;
    if (evenY && evenX) return "g";
    if (evenY && !evenX) return "r";
    if (!evenY && evenX) return "b";
    return "g";
  }

  const xx = x % 4;
  const yy = y % 4;
  if (yy < 2 && xx < 2) return "g";
  if (yy < 2 && xx >= 2) return "r";
  if (yy >= 2 && xx < 2) return "b";
  return "g";
}

function computeAdcCodeAt(x, y, index, params) {
  const signalElectron = Math.max(0, activeMosaic[index] * params.sensorFWC * params.eit);
  const noiseTerms = sensorNoiseTerms(x, y, signalElectron, params.readout, params.eit);
  const electron = signalElectron + noiseTerms.totalElectron;
  const voltage = electron * params.readout.sensorCG * params.analogGain;
  const normalizedSignal = voltage / Math.max(params.adcFullScale, 1e-9) - params.black;
  const codeFloat = params.pedestal + normalizedSignal * Math.max(0, params.levels - params.pedestal);
  let adcCode = Math.min(params.levels, Math.max(0, Math.floor(codeFloat)));
  if (Math.abs(params.digitalGain - 1) > 1e-6) {
    const signalCode = adcCode - params.pedestal;
    adcCode = Math.min(params.levels, Math.max(0, Math.round(params.pedestal + signalCode * params.digitalGain + ditherForPixel(x, y))));
  }
  return { adcCode, codeFloat, signalElectron, noiseTerms };
}

function adcCodeToSignalFloat(adcCode, params) {
  return Math.min(1, Math.max(0, (adcCode - params.pedestal) / Math.max(1, params.levels - params.pedestal)));
}

function simulationParams(readout = readoutConfig()) {
  return {
    levels: adcLevels(readout.adcBits),
    eit: eitScale(),
    analogGain: readout.analogGain ?? analogGainScale(),
    digitalGain: readout.digitalGain ?? digitalGainScale(),
    black: appState.simulation.black,
    sensorFWC: sensorValue("SensorFWC", 10000),
    readout,
    pedestal: pedestalForAdcBits(readout.adcBits),
    adcFullScale: adcFullScaleUv(),
  };
}

function safeFileStem(value) {
  return String(value || "simulation")
    .replace(/^Server sample:\s*/i, "")
    .replace(/^Local file:\s*/i, "")
    .replace(/\.[^.]+$/g, "")
    .replace(/[^a-z0-9_-]+/gi, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80) || "simulation";
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function saveBlobLocally(blob, filename, typeDescription = "File") {
  if (window.showSaveFilePicker) {
    const extension = filename.includes(".") ? `.${filename.split(".").pop()}` : "";
    const handle = await window.showSaveFilePicker({
      suggestedName: filename,
      types: [
        {
          description: typeDescription,
          accept: {
            [blob.type || "application/octet-stream"]: extension ? [extension] : [],
          },
        },
      ],
    });
    const writable = await handle.createWritable();
    await writable.write(blob);
    await writable.close();
    return { filename: handle.name || filename, picker: true };
  }

  downloadBlob(blob, filename);
  return { filename, picker: false };
}

function adcRawBufferForReadout(readout) {
  const params = simulationParams(readout);
  const buffer = new ArrayBuffer(activeMosaic.length * Uint16Array.BYTES_PER_ELEMENT);
  const output = new DataView(buffer);
  for (let index = 0; index < activeMosaic.length; index += 1) {
    const x = index % inputMeta.width;
    const y = Math.floor(index / inputMeta.width);
    output.setUint16(index * Uint16Array.BYTES_PER_ELEMENT, computeAdcCodeAt(x, y, index, params).adcCode, true);
  }
  return { buffer, params };
}

async function sha256Hex(buffer) {
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function adcRawDigestsForCurrentReadouts() {
  const readouts = activeReadoutConfigs();
  const results = [];
  for (const readout of readouts) {
    const { buffer, params } = adcRawBufferForReadout(readout);
    const values = new Uint16Array(buffer);
    let min = Number.POSITIVE_INFINITY;
    let max = Number.NEGATIVE_INFINITY;
    let sum = 0;
    for (const value of values) {
      min = Math.min(min, value);
      max = Math.max(max, value);
      sum += value;
    }
    results.push({
      name: readout.name,
      branch: readout.branch,
      adcBits: readout.adcBits,
      levels: params.levels,
      pedestal: params.pedestal,
      width: inputMeta.width,
      height: inputMeta.height,
      bytes: buffer.byteLength,
      min,
      max,
      sum,
      first16: Array.from(values.slice(0, 16)),
      sha256: await sha256Hex(buffer),
    });
  }
  return results;
}

function ensureDebugDigestElement() {
  let element = document.querySelector("#debugAdcDigests");
  if (!element) {
    element = document.createElement("pre");
    element.id = "debugAdcDigests";
    element.hidden = true;
    document.body.append(element);
  }
  return element;
}

function scheduleDebugDigests() {
  if (!debugDigestsEnabled) return;
  const token = ++debugDigestToken;
  setTimeout(async () => {
    try {
      const digests = await adcRawDigestsForCurrentReadouts();
      if (token !== debugDigestToken) return;
      ensureDebugDigestElement().textContent = JSON.stringify({
        input: activeInputLabel,
        sensor: appState.sensor.SensorName,
        acquisitionMode: appState.simulation.acquisitionMode,
        digests,
      });
    } catch (error) {
      ensureDebugDigestElement().textContent = JSON.stringify({ error: String(error.message || error) });
    }
  }, 0);
}

function currentSensorPrs() {
  readSensorEditor();
  return {
    schema: "SensorPRS",
    version: appState.sensor.version || 1,
    SensorName: appState.sensor.SensorName || "EditedSensorPRS",
    Description: appState.sensor.Description || "Saved from client-side ISP Viewer.",
    Units: {
      SensorFWC: "e-",
      SensorRN: "e-",
      SensorPRNU: "ratio",
      SensorCG: "uV/e-",
      SensorPFPN: "uV",
      SensorDark: "e-/s",
      Pedestal: "LSB",
      ADCFullScale: "uV",
    },
    SensorFWC: sensorValue("SensorFWC", 10000),
    SensorRN: sensorValue("SensorRN", 0),
    SensorPRNU: sensorValue("SensorPRNU", 0),
    SensorCG: sensorValue("SensorCG", 1),
    SensorPFPN: sensorValue("SensorPFPN", 0),
    SensorDark: sensorValue("SensorDark", 0),
    Pedestal: pedestalForAdcBits(activeReadoutConfigs()[0]?.adcBits),
    ADCFullScale: adcFullScaleUv(),
    CGModes: (appState.sensor.CGModes || []).slice(0, 4),
    ActiveCGMode: appState.sensor.ActiveCGMode || null,
    AcquisitionMode: appState.simulation.acquisitionMode,
    IDCGPair: {
      A: readoutConfig(appState.simulation.idcgModeA).name,
      B: readoutConfig(appState.simulation.idcgModeB).name,
      AIndex: appState.simulation.idcgModeA,
      BIndex: appState.simulation.idcgModeB,
    },
    IDCGGains: {
      ShotAnalogGain: appState.simulation.idcgShotAnalogGain,
      ShotDigitalGain: appState.simulation.idcgShotDigitalGain,
      LongAnalogGain: appState.simulation.idcgLongAnalogGain,
      LongDigitalGain: appState.simulation.idcgLongDigitalGain,
    },
    IDCGADCBits: {
      Shot: appState.simulation.idcgShotAdcBits,
      Long: appState.simulation.idcgLongAdcBits,
    },
    Seeds: { ...(appState.sensor.Seeds || {}) },
    Notes: appState.sensor.Notes || [],
  };
}

function saveSensorPrs() {
  const prs = currentSensorPrs();
  const filename = `${safeFileStem(prs.SensorName)}.sensor-prs.json`;
  downloadBlob(new Blob([JSON.stringify(prs, null, 2)], { type: "application/json" }), filename);
  statusEl.textContent = `Saved Sensor PRS locally: ${filename}`;
}

async function saveAdcRawForReadout(readout) {
  const adcBits = Number(readout.adcBits ?? appState.simulation.adcBits);
  const { buffer, params } = adcRawBufferForReadout(readout);

  const modeSuffix = isIdcgMode() && readout?.name ? `_${safeFileStem(readout.name)}` : "";
  const filename = `${safeFileStem(activeInputLabel)}${modeSuffix}_${adcBits}b.raw`;
  const saved = await saveBlobLocally(new Blob([buffer], { type: "application/octet-stream" }), filename, "16-bit RAW image");
  return { filename: saved.filename, params, picker: saved.picker };
}

async function saveAdcRawResult() {
  const readouts = activeReadoutConfigs();
  const saved = [];
  for (const readout of readouts) {
    saved.push(await saveAdcRawForReadout(readout));
  }
  const files = saved.map((item) => item.filename).join(", ");
  const ranges = saved.map((item) => `${item.filename}: 0-${item.params.levels}`).join(" / ");
  const method = saved.every((item) => item.picker) ? "via save dialog" : "via browser download";
  statusEl.textContent = `Saved ADC RAW ${method}: ${files}. ${inputMeta.width}x${inputMeta.height}, uint16 little-endian, valid ranges ${ranges}.`;
}

function demosaicChannel(adcMap, x, y, targetChannel, width = inputMeta.width) {
  const radius = appState.input.pixelType === "Bayer" ? 1 : 2;
  const paneStart = width > inputMeta.width && x >= inputMeta.width ? inputMeta.width : 0;
  const paneEnd = paneStart + inputMeta.width - 1;
  let sum = 0;
  let weightSum = 0;
  for (let dy = -radius; dy <= radius; dy += 1) {
    const yy = Math.min(inputMeta.height - 1, Math.max(0, y + dy));
    for (let dx = -radius; dx <= radius; dx += 1) {
      const xx = Math.min(paneEnd, Math.max(paneStart, x + dx));
      const sourceX = xx % inputMeta.width;
      if (sensorChannelCpu(sourceX, yy) !== targetChannel) continue;
      const distance = Math.max(1, Math.abs(dx) + Math.abs(dy));
      const weight = 1 / distance;
      sum += adcMap[yy * width + xx] * weight;
      weightSum += weight;
    }
  }
  if (weightSum > 0) return sum / weightSum;
  return adcMap[y * width + x];
}

function drawCpuPreview(targetContext = previewContext, readout = readoutConfig()) {
  const outputWidth = inputMeta.width;
  const image = targetContext.createImageData(outputWidth, inputMeta.height);
  const params = {
    levels: adcLevels(readout.adcBits),
    eit: eitScale(),
    analogGain: readout.analogGain ?? analogGainScale(),
    digitalGain: readout.digitalGain ?? digitalGainScale(),
    black: appState.simulation.black,
    sensorFWC: sensorValue("SensorFWC", 10000),
    readout,
    pedestal: pedestalForAdcBits(readout.adcBits),
    adcFullScale: adcFullScaleUv(),
  };
  const errorMode = viewModeId() === 1;
  const shaderTest = viewModeId() === 2;
  const noiseOnly = viewModeId() === 3;
  const simpleIsp = viewModeId() === 4;
  params.readout = readout;
  const adcMap = simpleIsp ? new Float32Array(outputWidth * inputMeta.height) : null;

  if (simpleIsp) {
    for (let y = 0; y < inputMeta.height; y += 1) {
      for (let x = 0; x < outputWidth; x += 1) {
        const sourceIndex = y * inputMeta.width + x;
        const outputIndex = y * outputWidth + x;
        adcMap[outputIndex] = adcCodeToSignalFloat(computeAdcCodeAt(x, y, sourceIndex, params).adcCode, params);
      }
    }
  }

  for (let y = 0; y < inputMeta.height; y += 1) {
    for (let x = 0; x < outputWidth; x += 1) {
      const index = y * inputMeta.width + x;
      const out = (y * outputWidth + x) * 4;

      if (shaderTest) {
        image.data[out] = Math.round((x / Math.max(1, inputMeta.width - 1)) * 255);
        image.data[out + 1] = Math.round((y / Math.max(1, inputMeta.height - 1)) * 255);
        image.data[out + 2] = 64;
        image.data[out + 3] = 255;
        continue;
      }

      if (simpleIsp) {
        const wbR = appState.simpleIsp.wbR;
        const wbB = appState.simpleIsp.wbB;
        const gamma = appState.simpleIsp.gamma;
        const r = Math.min(1, Math.max(0, demosaicChannel(adcMap, x, y, "r", outputWidth) * wbR));
        const g = Math.min(1, Math.max(0, demosaicChannel(adcMap, x, y, "g", outputWidth)));
        const b = Math.min(1, Math.max(0, demosaicChannel(adcMap, x, y, "b", outputWidth) * wbB));
        image.data[out] = Math.round(Math.pow(r, 1 / gamma) * 255);
        image.data[out + 1] = Math.round(Math.pow(g, 1 / gamma) * 255);
        image.data[out + 2] = Math.round(Math.pow(b, 1 / gamma) * 255);
        image.data[out + 3] = 255;
        continue;
      }

      const { adcCode, codeFloat, signalElectron, noiseTerms } = computeAdcCodeAt(x, y, index, params);
      if (noiseOnly) {
        const sigma = Math.max(
          1e-9,
          Math.sqrt(
              Math.max(signalElectron, 0) +
              params.readout.sensorRN ** 2 +
              (sensorValue("SensorPRNU", 0) * signalElectron) ** 2 +
              (sensorValue("SensorPFPN", 0) / Math.max(params.readout.sensorCG, 1e-9)) ** 2 +
              (sensorValue("SensorDark", 0) * Math.max(0, params.eit)) ** 2,
          ),
        );
        const noiseDisplay = Math.min(1, Math.max(0, 0.5 + noiseTerms.totalElectron / (6 * sigma)));
        const value = Math.round(noiseDisplay * 255);
        image.data[out] = value;
        image.data[out + 1] = value;
        image.data[out + 2] = value;
        image.data[out + 3] = 255;
        continue;
      }
      const adc = adcCode / params.levels;
      const sample = errorMode ? Math.min(1, Math.abs(codeFloat - Math.floor(codeFloat)) * 8) : adc;
      const display = Math.round(Math.pow(sample, 1 / 2.2) * 255);
      const mask = sensorMaskCpu(x, y);

      image.data[out] = display * mask[0];
      image.data[out + 1] = display * mask[1];
      image.data[out + 2] = display * mask[2];
      image.data[out + 3] = 255;
    }
  }

  targetContext.putImageData(image, 0, 0);
}

function prepareHistogramCanvas() {
  const rect = histogramCanvas.getBoundingClientRect();
  const cssWidth = Math.max(1, Math.round(rect.width || histogramCanvas.clientWidth || 512));
  const cssHeight = Math.max(1, Math.round(rect.height || histogramCanvas.clientHeight || 120));
  const dpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
  const backingWidth = Math.round(cssWidth * dpr);
  const backingHeight = Math.round(cssHeight * dpr);

  if (histogramCanvas.width !== backingWidth || histogramCanvas.height !== backingHeight) {
    histogramCanvas.width = backingWidth;
    histogramCanvas.height = backingHeight;
  }
  histogramContext.setTransform(dpr, 0, 0, dpr, 0, 0);

  return {
    width: cssWidth,
    height: cssHeight,
    bodyFont: Math.max(8, Math.min(12, cssHeight * 0.09, cssWidth / 58)),
    smallFont: Math.max(7, Math.min(11, cssHeight * 0.082, cssWidth / 64)),
  };
}

function setCanvasFont(size) {
  histogramContext.font = `${size.toFixed(1)}px system-ui, sans-serif`;
}

function drawFittedText(text, x, y, maxWidth, preferredSize, color = "#d8dfdc", minSize = 7) {
  let size = preferredSize;
  setCanvasFont(size);
  while (size > minSize && histogramContext.measureText(text).width > maxWidth) {
    size -= 0.5;
    setCanvasFont(size);
  }
  histogramContext.fillStyle = color;
  histogramContext.fillText(text, x, y);
}

function drawHistogram() {
  const histogramStart = performance.now();
  if (histogramScale === "snr") {
    drawSnrGraph();
    histogramCount += 1;
    lastHistogramEit = eitScale();
    lastHistogramMs = performance.now() - histogramStart;
    return;
  }

  const { width, height, bodyFont } = prepareHistogramCanvas();
  const bins = 256;
  const readouts = activeReadoutConfigs();
  const countSets = readouts.map((readout) => ({ readout, counts: new Uint32Array(bins) }));
  const step = Math.max(1, Math.floor(activeMosaic.length / 250000));

  for (const countSet of countSets) {
    const params = simulationParams(countSet.readout);
    for (let index = 0; index < activeMosaic.length; index += step) {
      const x = index % inputMeta.width;
      const y = Math.floor(index / inputMeta.width);
      const adc = computeAdcCodeAt(x, y, index, params).adcCode / params.levels;
      const bin = Math.min(bins - 1, Math.max(0, Math.floor(adc * (bins - 1))));
      countSet.counts[bin] += 1;
    }
  }

  const maxCount = Math.max(1, ...countSets.flatMap((countSet) => Array.from(countSet.counts)));
  const maxLog = Math.log1p(maxCount);
  const saturatedText = countSets
    .map((countSet) => {
      const saturatedCount = countSet.counts[bins - 1];
      const totalCount = countSet.counts.reduce((sum, count) => sum + count, 0);
      const pct = totalCount > 0 ? (saturatedCount / totalCount) * 100 : 0;
      return `${countSet.readout.name} ${pct.toFixed(2)}%`;
    })
    .join(" / ");

  histogramContext.clearRect(0, 0, width, height);
  histogramContext.fillStyle = "#050606";
  histogramContext.fillRect(0, 0, width, height);
  histogramContext.strokeStyle = "#2b3030";
  histogramContext.beginPath();
  for (let i = 1; i < 4; i += 1) {
    const x = Math.round((width * i) / 4) + 0.5;
    histogramContext.moveTo(x, 0);
    histogramContext.lineTo(x, height);
  }
  histogramContext.stroke();

  const barWidth = width / bins;
  const colors = ["#9fd3bd", "#f0a15d"];
  countSets.forEach((countSet, setIndex) => {
    const offset = isIdcgMode() ? (setIndex - 0.5) * Math.max(1, barWidth * 0.5) : 0;
    const drawWidth = isIdcgMode() ? Math.max(1, Math.ceil(barWidth * 0.65)) : Math.ceil(barWidth);
    for (let bin = 0; bin < bins; bin += 1) {
      const value =
        histogramScale === "log" ? Math.log1p(countSet.counts[bin]) / maxLog : countSet.counts[bin] / maxCount;
      const barHeight = Math.max(1, value * (height - bodyFont * 2));
      histogramContext.fillStyle = bin === bins - 1 ? "#f08a5d" : colors[setIndex] || "#9fd3bd";
      histogramContext.globalAlpha = isIdcgMode() ? 0.72 : 1;
      histogramContext.fillRect(bin * barWidth + offset, height - barHeight - bodyFont * 1.5, drawWidth, barHeight);
    }
  });
  histogramContext.globalAlpha = 1;

  if (isIdcgMode()) {
    setCanvasFont(bodyFont);
    histogramContext.fillStyle = "#9fd3bd";
    histogramContext.fillText(readouts[0]?.name || "CG A", 10, bodyFont + 2);
    histogramContext.fillStyle = "#f0a15d";
    histogramContext.fillText(readouts[1]?.name || "CG B", 72, bodyFont + 2);
  }

  drawFittedText(
    `ADC histogram - ${histogramScale} - ${readouts.map((readout) => `${readout.name} ${readout.adcBits}b`).join(" / ")}, saturated ${saturatedText}`,
    10,
    height - 6,
    width - 20,
    bodyFont,
  );
  histogramCount += 1;
  lastHistogramEit = eitScale();
  lastHistogramMs = performance.now() - histogramStart;
}

function formatElectron(value) {
  if (value >= 1000) return `${Math.round(value)}e-`;
  if (value >= 10) return `${value.toFixed(1)}e-`;
  return `${value.toFixed(3)}e-`;
}

function drawSnrGraph() {
  const { width, height, bodyFont, smallFont } = prepareHistogramCanvas();
  const padding = {
    left: Math.max(38, smallFont * 4.2),
    right: 10,
    top: Math.max(28, bodyFont * 2.8),
    bottom: Math.max(22, smallFont * 2.2),
  };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  const fwc = Math.max(1, sensorValue("SensorFWC", 10000));
  const prnu = Math.max(0, sensorValue("SensorPRNU", 0));
  const dark = Math.max(0, sensorValue("SensorDark", 0));
  const adcFullScale = Math.max(1e-9, adcFullScaleUv());
  const eit = Math.max(1e-9, eitScale());
  const black = Math.max(0, appState.simulation.black || 0);
  const readouts = activeReadoutConfigs();
  const colors = ["#9fd3bd", "#f0a15d"];

  const models = readouts.map((readout) => {
    const cg = Math.max(1e-9, readout.sensorCG);
    const rn = Math.max(0, readout.sensorRN);
    const analogGain = Math.max(1e-9, readout.analogGain ?? analogGainScale());
    const digitalGain = Math.max(1e-9, readout.digitalGain ?? digitalGainScale());
    const levels = adcLevels(readout.adcBits);
    const pedestal = pedestalForAdcBits(readout.adcBits);
    const usableCodes = Math.max(1, levels - pedestal);
    const quantStepElectron = adcFullScale / Math.max(cg * analogGain * usableCodes, 1e-9);
    const digitalQuantStepElectron = quantStepElectron / Math.max(digitalGain, 1e-9);
    const quantNoiseElectron = Math.sqrt(quantStepElectron ** 2 + digitalQuantStepElectron ** 2) / Math.sqrt(12);
    const clipCodeBeforeDigital = pedestal + usableCodes / Math.max(digitalGain, 1e-9);
    const normalizedClip = Math.max(0, (clipCodeBeforeDigital - pedestal) / usableCodes + black);
    const adcClipElectron = normalizedClip * adcFullScale / Math.max(cg * analogGain, 1e-9);
    const effectiveCollectedFwc = Math.max(1e-9, Math.min(fwc, adcClipElectron));
    const effectiveInputFwc = Math.max(1e-9, effectiveCollectedFwc / eit);
    const darkNoiseElectron = dark * eit;
    return { readout, cg, rn, quantNoiseElectron, darkNoiseElectron, effectiveCollectedFwc, effectiveInputFwc };
  });

  const maxEffectiveInputFwc = Math.max(...models.map((model) => model.effectiveInputFwc), 1);
  const minElectron = Math.max(1e-3, Math.min(1, maxEffectiveInputFwc / 1000));
  const maxElectron = Math.max(minElectron * 10, maxEffectiveInputFwc);
  const minLog = Math.log10(minElectron);
  const maxLog = Math.log10(maxElectron);
  const clippedDb = -60;

  function snrDb(inputElectron, model) {
    if (inputElectron > model.effectiveInputFwc) {
      return clippedDb;
    }
    const collectedElectron = Math.max(0, inputElectron * eit);
    const shotVariance = collectedElectron;
    const rnVariance = model.rn * model.rn;
    const prnuVariance = (prnu * collectedElectron) ** 2;
    const quantVariance = model.quantNoiseElectron * model.quantNoiseElectron;
    const darkVariance = model.darkNoiseElectron * model.darkNoiseElectron;
    const noise = Math.sqrt(shotVariance + rnVariance + prnuVariance + quantVariance + darkVariance);
    const snr = collectedElectron / Math.max(noise, 1e-12);
    return 20 * Math.log10(Math.max(snr, 1e-12));
  }

  let minDb = 0;
  let maxDb = 1;
  const curves = models.map((model) => {
    const points = [];
    let snrOneElectron = null;
    let previousPoint = null;
    let insertedClipWall = false;
    for (let i = 0; i < plotWidth; i += 1) {
      const t = i / Math.max(1, plotWidth - 1);
      const electron = 10 ** (minLog + t * (maxLog - minLog));
      if (!insertedClipWall && previousPoint && previousPoint.electron < model.effectiveInputFwc && electron > model.effectiveInputFwc) {
        const peakDb = snrDb(model.effectiveInputFwc, model);
        points.push({ electron: model.effectiveInputFwc, db: peakDb });
        points.push({ electron: model.effectiveInputFwc * 1.000001, db: clippedDb });
        minDb = Math.min(minDb, clippedDb);
        maxDb = Math.max(maxDb, peakDb);
        insertedClipWall = true;
      }
      const db = snrDb(electron, model);
      points.push({ electron, db });
      if (previousPoint && snrOneElectron == null && previousPoint.db <= 0 && db >= 0) {
        const ratio = (0 - previousPoint.db) / Math.max(1e-9, db - previousPoint.db);
        const logE = Math.log10(previousPoint.electron) + ratio * (Math.log10(electron) - Math.log10(previousPoint.electron));
        snrOneElectron = 10 ** logE;
      }
      previousPoint = { electron, db };
      minDb = Math.min(minDb, db);
      maxDb = Math.max(maxDb, db);
    }
    return { ...model, points, snrOneElectron };
  });
  minDb = Math.floor(minDb / 10) * 10;
  maxDb = Math.ceil(maxDb / 10) * 10;

  function xForElectron(electron) {
    return padding.left + ((Math.log10(electron) - minLog) / (maxLog - minLog)) * plotWidth;
  }

  function yForDb(db) {
    return padding.top + (1 - (db - minDb) / Math.max(1e-9, maxDb - minDb)) * plotHeight;
  }

  histogramContext.clearRect(0, 0, width, height);
  histogramContext.fillStyle = "#050606";
  histogramContext.fillRect(0, 0, width, height);

  histogramContext.strokeStyle = "#2b3030";
  histogramContext.lineWidth = 1;
  histogramContext.beginPath();
  for (const e of [1, 10, 100, 1000, 10000, 100000]) {
    if (e < minElectron || e > maxElectron) continue;
    const x = Math.round(xForElectron(e)) + 0.5;
    histogramContext.moveTo(x, padding.top);
    histogramContext.lineTo(x, padding.top + plotHeight);
  }
  for (let db = minDb; db <= maxDb; db += 10) {
    const y = Math.round(yForDb(db)) + 0.5;
    histogramContext.moveTo(padding.left, y);
    histogramContext.lineTo(padding.left + plotWidth, y);
  }
  histogramContext.stroke();

  setCanvasFont(smallFont);
  const zeroY = yForDb(0);
  if (zeroY >= padding.top && zeroY <= padding.top + plotHeight) {
    histogramContext.strokeStyle = "#f08a5d";
    histogramContext.setLineDash([4, 4]);
    histogramContext.beginPath();
    histogramContext.moveTo(padding.left, zeroY);
    histogramContext.lineTo(padding.left + plotWidth, zeroY);
    histogramContext.stroke();
    histogramContext.setLineDash([]);
    histogramContext.fillStyle = "#f08a5d";
    histogramContext.fillText("SNR=1 / 0 dB", padding.left + 6, Math.max(padding.top + smallFont, zeroY - 4));
  }

  curves.forEach((curve, curveIndex) => {
    const color = colors[curveIndex] || "#9fd3bd";
    histogramContext.strokeStyle = color;
    histogramContext.lineWidth = 2;
    histogramContext.beginPath();
    curve.points.forEach((point, index) => {
      const x = xForElectron(point.electron);
      const y = yForDb(point.db);
      if (index === 0) histogramContext.moveTo(x, y);
      else histogramContext.lineTo(x, y);
    });
    histogramContext.stroke();

    const clipX = xForElectron(curve.effectiveInputFwc);
    if (clipX >= padding.left && clipX <= padding.left + plotWidth) {
      histogramContext.strokeStyle = color;
      histogramContext.setLineDash([3, 3]);
      histogramContext.beginPath();
      histogramContext.moveTo(clipX, padding.top);
      histogramContext.lineTo(clipX, padding.top + plotHeight);
      histogramContext.stroke();
      histogramContext.setLineDash([]);
      drawFittedText(
        `${curve.readout.name} sat`,
        Math.min(clipX + 4, padding.left + plotWidth - width * 0.16),
        padding.top + smallFont,
        width * 0.16,
        smallFont,
        color,
      );
    }

    if (curve.snrOneElectron != null) {
      const markerX = xForElectron(curve.snrOneElectron);
      const markerY = yForDb(0);
      histogramContext.fillStyle = color;
      histogramContext.beginPath();
      histogramContext.arc(markerX, markerY, Math.max(2.5, smallFont * 0.35), 0, Math.PI * 2);
      histogramContext.fill();
      histogramContext.strokeStyle = color;
      histogramContext.beginPath();
      histogramContext.moveTo(markerX, markerY);
      histogramContext.lineTo(markerX, padding.top + plotHeight);
      histogramContext.stroke();
    }
  });

  const leftLabelWidth = Math.max(30, padding.left - 8);
  drawFittedText(`${maxDb} dB`, 6, yForDb(maxDb) + smallFont * 0.35, leftLabelWidth, smallFont);
  drawFittedText(`${minDb} dB`, 6, yForDb(minDb), leftLabelWidth, smallFont);
  drawFittedText(`${formatElectron(minElectron)}`, xForElectron(minElectron) - 4, height - 8, width * 0.24, smallFont);
  drawFittedText(`${formatElectron(maxEffectiveInputFwc)}`, Math.max(padding.left, xForElectron(maxEffectiveInputFwc) - width * 0.12), height - 8, width * 0.22, smallFont);
  const modelText = curves
    .map((curve) => `${curve.readout.name} EFWC ${formatElectron(curve.effectiveInputFwc)}`)
    .join(" / ");
  const drText = curves
    .map((curve) => {
      if (curve.snrOneElectron == null) return `${curve.readout.name}: SNR=1 below range`;
      const dr = curve.effectiveInputFwc / curve.snrOneElectron;
      return `${curve.readout.name}: SNR=1 ${curve.snrOneElectron.toFixed(2)} e-, DR ${dr.toFixed(0)}:1`;
    })
    .join(" / ");
  drawFittedText(`SNR model: shot + RN + PRNU + ADC, ${modelText}`, padding.left, bodyFont + 2, width - padding.left - padding.right, bodyFont);
  drawFittedText(drText, padding.left, bodyFont * 2.2 + 4, width - padding.left - padding.right, bodyFont, "#f08a5d");
}

function resetView() {
  const rect = viewport.getBoundingClientRect();
  view.scale = fitScale();
  const paneWidth = isIdcgMode() ? Math.max(1, (rect.width - 8) / 2) : rect.width;
  view.x = Math.max(12, (paneWidth - inputMeta.width * view.scale) / 2);
  view.y = 12;
  updateCanvasZoom();
}

function fitScale() {
  const rect = viewport.getBoundingClientRect();
  const paneWidth = isIdcgMode() ? Math.max(1, (rect.width - 8) / 2) : rect.width;
  return Math.max(0.01, Math.min(8, Math.min(paneWidth / inputMeta.width, rect.height / inputMeta.height) * 0.96));
}

function zoomAt(clientX, clientY, deltaY) {
  const rect = viewport.getBoundingClientRect();
  const pointerXInViewport = clientX - rect.left;
  const paneWidth = isIdcgMode() ? Math.max(1, (rect.width - 8) / 2) : rect.width;
  const rightPaneLeft = paneWidth + 8;
  const pointerX = isIdcgMode() && pointerXInViewport >= rightPaneLeft ? pointerXInViewport - rightPaneLeft : pointerXInViewport;
  const pointerY = clientY - rect.top;
  const imageX = (pointerX - view.x) / view.scale;
  const imageY = (pointerY - view.y) / view.scale;
  const factor = deltaY < 0 ? 1.25 : 0.8;
  const minScale = fitScale();
  const nextScale = Math.max(minScale, Math.min(64, view.scale * factor));

  view.x = pointerX - imageX * nextScale;
  view.y = pointerY - imageY * nextScale;
  view.scale = nextScale;
  updateCanvasZoom();
}

function sampleHdrRgbToSensorMosaic(hdr) {
  return sampleHdrRgbToSensorMosaicInput(hdr, {
    pixelType: appState.input.pixelType,
    pixelOrder: appState.input.pixelOrder,
  });
}

function parseHdrDirectToSensorMosaic(buffer, metadata = {}) {
  return parseHdrDirectToSensorMosaicInput(buffer, metadata, {
    pixelType: appState.input.pixelType,
    pixelOrder: appState.input.pixelOrder,
  });
}

globalThis.NoiseDebug = {
  adcRawDigestsForCurrentReadouts,
  activeReadoutConfigs,
};

async function loadSampleManifest() {
  const [hdrManifest, rawManifest] = await Promise.all([
    fetch("./assets/test-inputs/manifest.json").then((res) => res.json()),
    fetch("./assets/test-inputs/raw/manifest.json").then((res) => res.json()),
  ]);

  return [
    ...hdrManifest.inputs.map((input) => ({ ...input, source: "server-sample" })),
    ...rawManifest.inputs.map((input) => ({ ...input, source: "server-sample" })),
  ];
}

function normalizeCgModes(profile) {
  const modes = Array.isArray(profile.CGModes) ? profile.CGModes.slice(0, 4) : [];
  const fallbackMode = {
    Name: profile.role || "CG0",
    SensorCG: profile.SensorCG,
    SensorRN: profile.SensorRN,
    Seeds: profile.Seeds || {},
  };
  return (modes.length > 0 ? modes : [fallbackMode]).map((mode, index) => ({
    Name: String(mode.Name || mode.name || `CG${index}`),
    SensorCG: Number(mode.SensorCG),
    SensorRN: Number(mode.SensorRN ?? profile.SensorRN),
    Seeds: { ...(mode.Seeds || {}) },
  }));
}

function normalizeSensorProfile(profile, metadata = {}) {
  if (!profile || typeof profile !== "object") {
    throw new Error("Sensor PRS must be a JSON object.");
  }
  if (profile.schema && profile.schema !== "SensorPRS") {
    throw new Error(`Unsupported Sensor PRS schema: ${profile.schema}`);
  }

  const cgModes = normalizeCgModes(profile);
  const base = {
    ...appState.sensor,
    ...profile,
    schema: "SensorPRS",
    SensorName: String(profile.SensorName || metadata.name || "LocalSensorPRS"),
    role: metadata.role || profile.role || "custom",
    source: metadata.source || profile.source || "local",
    uri: metadata.uri || profile.uri || null,
    Seeds: {
      ...(appState.sensor?.Seeds || {}),
      ...(profile.Seeds || {}),
    },
    CGModes: cgModes,
  };

  if (cgModes.length > 0) {
    base.SensorCG = Number(profile.SensorCG ?? cgModes[0].SensorCG);
    base.SensorRN = Number(profile.SensorRN ?? cgModes[0].SensorRN);
  }
  base.ADCFullScale = Math.max(1, Number(base.SensorFWC ?? profile.SensorFWC ?? 10000));

  for (const key of Object.keys(sensorInputs)) {
    const value = Number(base[key]);
    if (!Number.isFinite(value)) {
      throw new Error(`Sensor PRS field ${key} must be numeric.`);
    }
    base[key] = value;
  }
  return base;
}

function applySensorProfile(index, cgModeIndex = 0) {
  const profile = sensorProfiles[index] || appState.sensor;
  const modes = profile.CGModes || [];
  const mode = modes[Math.min(Math.max(0, cgModeIndex), Math.max(0, modes.length - 1))] || {};
  activeCgModeIndex = modes.indexOf(mode);
  if (activeCgModeIndex < 0) activeCgModeIndex = 0;

  appState.sensor = {
    ...profile,
    SensorCG: Number(mode.SensorCG ?? profile.SensorCG),
    SensorRN: Number(mode.SensorRN ?? profile.SensorRN),
    ADCFullScale: Math.max(1, Number(profile.SensorFWC ?? 10000)),
    Seeds: {
      ...(profile.Seeds || {}),
      ...(mode.Seeds || {}),
    },
    ActiveCGMode: mode.Name || "CG0",
  };
  if (profile.AcquisitionMode === "idcg" || profile.AcquisitionMode === "single") {
    appState.simulation.acquisitionMode = profile.AcquisitionMode;
  }
  if (profile.IDCGPair) {
    const indexForName = (name, fallback) => {
      const matched = modes.findIndex((cgMode) => cgMode.Name === name);
      return matched >= 0 ? matched : fallback;
    };
    const aIndex = Number.isFinite(Number(profile.IDCGPair.AIndex))
      ? Number(profile.IDCGPair.AIndex)
      : indexForName(profile.IDCGPair.A, appState.simulation.idcgModeA);
    const bIndex = Number.isFinite(Number(profile.IDCGPair.BIndex))
      ? Number(profile.IDCGPair.BIndex)
      : indexForName(profile.IDCGPair.B, appState.simulation.idcgModeB);
    appState.simulation.idcgModeA = Math.min(Math.max(0, aIndex), Math.max(0, modes.length - 1));
    appState.simulation.idcgModeB = Math.min(Math.max(0, bIndex), Math.max(0, modes.length - 1));
  }
  if (profile.IDCGGains) {
    appState.simulation.idcgShotAnalogGain = Math.min(32, Math.max(1, Number(profile.IDCGGains.ShotAnalogGain ?? appState.simulation.idcgShotAnalogGain)));
    appState.simulation.idcgShotDigitalGain = Math.min(32, Math.max(1, Number(profile.IDCGGains.ShotDigitalGain ?? appState.simulation.idcgShotDigitalGain)));
    appState.simulation.idcgLongAnalogGain = Math.min(32, Math.max(1, Number(profile.IDCGGains.LongAnalogGain ?? appState.simulation.idcgLongAnalogGain)));
    appState.simulation.idcgLongDigitalGain = Math.min(32, Math.max(1, Number(profile.IDCGGains.LongDigitalGain ?? appState.simulation.idcgLongDigitalGain)));
  }
  if (profile.IDCGADCBits) {
    appState.simulation.idcgShotAdcBits = Math.min(16, Math.max(8, Number(profile.IDCGADCBits.Shot ?? appState.simulation.idcgShotAdcBits)));
    appState.simulation.idcgLongAdcBits = Math.min(16, Math.max(8, Number(profile.IDCGADCBits.Long ?? appState.simulation.idcgLongAdcBits)));
  }
  activeSensor = appState.sensor;
  renderCgModeSelect(appState.sensor, activeCgModeIndex);
  renderIdcgModeSelects();
  updateReadoutLabels();
  updateSensorEditor();
}

function renderSensorProfileSelect(selectedIndex = 0) {
  sensorProfileSelect.replaceChildren(
    ...sensorProfiles.map((profile, index) => {
      const option = document.createElement("option");
      option.value = String(index);
      const prefix = profile.source === "local" ? "Local: " : "";
      option.textContent = `${prefix}${profile.SensorName} (${profile.role || "custom"})`;
      return option;
    }),
  );
  sensorProfileSelect.value = String(Math.min(Math.max(0, selectedIndex), Math.max(0, sensorProfiles.length - 1)));
}

function renderCgModeSelect(profile, selectedIndex = 0) {
  const modes = profile.CGModes || [];
  sensorCgModeSelect.replaceChildren(
    ...modes.map((mode, index) => {
      const option = document.createElement("option");
      option.value = String(index);
      option.textContent = cgModeOptionText(mode);
      return option;
    }),
  );
  sensorCgModeSelect.disabled = modes.length <= 1;
  sensorCgModeSelect.value = String(Math.min(Math.max(0, selectedIndex), Math.max(0, modes.length - 1)));
}

async function loadSensorProfiles() {
  const manifest = await fetch("./sensors/manifest.json").then((res) => res.json());
  sensorProfiles = await Promise.all(
    manifest.sensors.map(async (entry) => {
      const profile = await fetch(entry.uri).then((res) => res.json());
      return normalizeSensorProfile(profile, { role: entry.role, uri: entry.uri, source: "server" });
    }),
  );

  renderSensorProfileSelect(0);
  applySensorProfile(0, 0);
}

async function loadLocalSensorProfile(file) {
  const text = await file.text();
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Local Sensor PRS must be JSON. YAML is not enabled in this static viewer yet.");
  }
  const profile = normalizeSensorProfile(parsed, {
    name: file.name.replace(/\.sensor-prs\.json$|\.json$/i, ""),
    role: parsed.role || "local",
    source: "local",
  });
  sensorProfiles.push(profile);
  const index = sensorProfiles.length - 1;
  renderSensorProfileSelect(index);
  applySensorProfile(index, 0);
  return profile;
}

async function main() {
  syncControlsFromState();
  restorePanelWidth();
  let device = null;
  let context = null;
  let contextB = null;
  let format = null;
  let paramsBuffer = null;
  let pipeline = null;
  let rawTexture;
  let bindGroup;
  let renderBackend = "2D fallback";
  let webGpuDetail = "WebGPU init has not completed.";
  let histogramTimer = null;
  setBackendBadge(renderBackend);
  statusEl.textContent = "Initializing viewer state and WebGPU...";

  if (navigator.gpu) {
    try {
      webGpuDetail = "WebGPU API exists; requesting adapter.";
      statusEl.textContent = webGpuDetail;
      const adapter = await Promise.race([
        navigator.gpu.requestAdapter({ powerPreference: "high-performance" }),
        new Promise((resolve) => setTimeout(() => resolve(null), 5000)),
      ]);
      if (adapter) {
        webGpuDetail = "WebGPU adapter acquired; requesting device.";
        statusEl.textContent = webGpuDetail;
        device = await adapter.requestDevice();
        renderBackend = "WebGPU";
        webGpuDetail = "WebGPU device and pipeline ready.";
        statusEl.textContent = webGpuDetail;
        setBackendBadge(renderBackend);
        device.addEventListener("uncapturederror", (event) => {
          console.warn("WebGPU validation error; using client-side 2D fallback.", event.error);
          device = null;
          context = null;
          contextB = null;
          pipeline = null;
          paramsBuffer = null;
          bindGroup = null;
          renderBackend = "2D fallback";
          webGpuDetail = `WebGPU validation error: ${shortGpuError(event.error)}`;
          setBackendBadge(renderBackend);
          setGpuVisible(false);
          drawCpuPreview();
        });
        context = canvas.getContext("webgpu");
        contextB = canvasB.getContext("webgpu");
        format = navigator.gpu.getPreferredCanvasFormat();
        context.configure({ device, format, alphaMode: "opaque" });
        contextB.configure({ device, format, alphaMode: "opaque" });
        paramsBuffer = device.createBuffer({
          size: 28 * Float32Array.BYTES_PER_ELEMENT,
          usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });
        const module = device.createShaderModule({ code: ispShader });
        if (typeof module.getCompilationInfo === "function") {
          const compileInfo = await module.getCompilationInfo();
          const compileError = compileInfo.messages.find((message) => message.type === "error");
          if (compileError) {
            webGpuDetail = `Shader compile failed: ${shortGpuError(compileError.message)}`;
            throw new Error(`WebGPU shader compile failed: ${compileError.message}`);
          }
        }
        device.pushErrorScope("validation");
        pipeline = await device.createRenderPipelineAsync({
          layout: "auto",
          vertex: { module, entryPoint: "vs" },
          fragment: { module, entryPoint: "fs", targets: [{ format }] },
          primitive: { topology: "triangle-list" },
        });
        const pipelineError = await device.popErrorScope();
        if (pipelineError) {
          webGpuDetail = `Pipeline failed: ${shortGpuError(pipelineError.message)}`;
          throw new Error(`WebGPU pipeline failed: ${pipelineError.message}`);
        }
        webGpuDetail = "WebGPU device and pipeline ready.";
      } else {
        webGpuDetail = "requestAdapter returned null or timed out. Chrome/GPU driver did not expose a usable WebGPU adapter.";
      }
    } catch (error) {
      console.warn("WebGPU setup failed; using client-side 2D fallback.", error);
      webGpuDetail = `WebGPU setup failed: ${shortGpuError(error)}`;
      device = null;
      context = null;
      contextB = null;
      pipeline = null;
      paramsBuffer = null;
      bindGroup = null;
      renderBackend = "2D fallback";
      setBackendBadge(renderBackend);
      setGpuVisible(false);
    }
  } else {
    webGpuDetail = "navigator.gpu is missing. WebGPU is disabled in this browser/context.";
  }

  function scheduleHistogram() {
    if (histogramTimer) clearTimeout(histogramTimer);
    histogramTimer = setTimeout(() => {
      histogramTimer = null;
      drawHistogram();
      updateDiagnostics(renderBackend, webGpuDetail);
    }, 120);
  }

  function uploadInput(input) {
    inputMeta = { width: input.width, height: input.height };
    activeMosaic = input.data;
    canvas.width = input.width;
    canvas.height = input.height;
    canvasB.width = input.width;
    canvasB.height = input.height;
    previewCanvas.width = input.width;
    previewCanvas.height = input.height;
    previewCanvasB.width = input.width;
    previewCanvasB.height = input.height;
    resetView();
    if (!device || !context || !pipeline || !paramsBuffer) {
      bindGroup = null;
      renderBackend = "2D fallback";
      setBackendBadge(renderBackend);
      setGpuVisible(false);
      drawHistogram();
      const readouts = activeReadoutConfigs();
      drawCpuPreview(previewContext, readouts[0] || readoutConfig());
      if (isIdcgMode()) drawCpuPreview(previewContextB, readouts[1] || readouts[0] || readoutConfig());
      return;
    }
    setGpuVisible(true);
    context.configure({ device, format, alphaMode: "opaque" });
    contextB.configure({ device, format, alphaMode: "opaque" });
    rawTexture?.destroy();
    rawTexture = device.createTexture({
      size: [input.width, input.height],
      format: "r32float",
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
    });
    const bytesPerRow = Math.ceil((input.width * Float32Array.BYTES_PER_ELEMENT) / 256) * 256;
    const floatsPerRow = bytesPerRow / Float32Array.BYTES_PER_ELEMENT;
    const textureData = new Float32Array(floatsPerRow * input.height);
    for (let y = 0; y < input.height; y += 1) {
      const rowOffset = y * floatsPerRow;
      const inputOffset = y * input.width;
      for (let x = 0; x < input.width; x += 1) {
        textureData[rowOffset + x] = Math.max(0, Math.min(1, input.data[inputOffset + x]));
      }
    }
    device.queue.writeTexture(
      { texture: rawTexture },
      textureData,
      { bytesPerRow },
      [input.width, input.height],
    );
    bindGroup = device.createBindGroup({
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: rawTexture.createView() },
        { binding: 1, resource: { buffer: paramsBuffer } },
      ],
    });
    drawHistogram();
    const readouts = activeReadoutConfigs();
    drawCpuPreview(previewContext, readouts[0] || readoutConfig());
    if (isIdcgMode()) drawCpuPreview(previewContextB, readouts[1] || readouts[0] || readoutConfig());
  }

  function draw({ updateHistogram = true } = {}) {
    const drawStart = performance.now();
    updateOutputs();
    updateReadoutLabels();
    const outputWidth = inputMeta.width;
    const resized =
      canvas.width !== outputWidth ||
      canvasB.width !== outputWidth ||
      previewCanvas.width !== outputWidth ||
      previewCanvasB.width !== outputWidth;
    if (canvas.width !== outputWidth) canvas.width = outputWidth;
    if (canvasB.width !== outputWidth) canvasB.width = outputWidth;
    if (previewCanvas.width !== outputWidth) previewCanvas.width = outputWidth;
    if (previewCanvasB.width !== outputWidth) previewCanvasB.width = outputWidth;
    if (resized) updateCanvasZoom();
    renderCount += 1;
    if (bindGroup && device && context && paramsBuffer) {
      setGpuVisible(true);
      if (resized) context.configure({ device, format, alphaMode: "opaque" });
      if (resized && contextB) contextB.configure({ device, format, alphaMode: "opaque" });
      const readouts = activeReadoutConfigs();
      const renderGpuReadout = (targetContext, readout) => {
        device.queue.writeBuffer(
          paramsBuffer,
          0,
          buildGpuParams({ readouts: [readout], outputWidth: inputMeta.width, acquisitionMode: 0 }),
        );
        const encoder = device.createCommandEncoder();
        const pass = encoder.beginRenderPass({
          colorAttachments: [
            {
              view: targetContext.getCurrentTexture().createView(),
              clearValue: { r: 0, g: 0, b: 0, a: 1 },
              loadOp: "clear",
              storeOp: "store",
            },
          ],
        });
        pass.setPipeline(pipeline);
        pass.setBindGroup(0, bindGroup);
        pass.draw(3);
        pass.end();
        device.queue.submit([encoder.finish()]);
      };
      renderGpuReadout(context, readouts[0] || readoutConfig());
      if (isIdcgMode() && contextB) renderGpuReadout(contextB, readouts[1] || readouts[0] || readoutConfig());
    } else {
      setGpuVisible(false);
    }
    if (!bindGroup || !device || !context || !paramsBuffer) {
      const readouts = activeReadoutConfigs();
      drawCpuPreview(previewContext, readouts[0] || readoutConfig());
      if (isIdcgMode()) drawCpuPreview(previewContextB, readouts[1] || readouts[0] || readoutConfig());
    }
    setBackendBadge(renderBackend);
    if (updateHistogram) {
      drawHistogram();
    } else {
      scheduleHistogram();
    }
    lastDrawMs = performance.now() - drawStart;
    updateDiagnostics(renderBackend, webGpuDetail);
    const readoutBitsText = activeReadoutConfigs().map((readout) => `${readout.name} ${readout.adcBits}-bit`).join(" / ");
    statusEl.textContent = `${activeInputLabel}. ${appState.sensor.SensorName}. ADC ${readoutBitsText}. ${renderBackend}. ${webGpuDetail} Processing is client-side only.`;
    scheduleDebugDigests();
  }

  async function loadServerSample(input) {
    statusEl.textContent = `Loading server sample: ${input.label}...`;
    await new Promise((resolve) => requestAnimationFrame(resolve));
    const buffer = await fetch(input.uri).then((res) => res.arrayBuffer());
    if (input.kind === "hdr_scene_rgb") {
      if (hdrPixelCountFromBuffer(buffer) > 8_000_000) {
        statusEl.textContent = `Decoding large HDR directly to sensor mosaic: ${input.label}...`;
        await new Promise((resolve) => requestAnimationFrame(resolve));
        activeSource = { kind: "hdr_scene_rgb_large", uri: input.uri, metadata: input };
        uploadInput(parseHdrDirectToSensorMosaic(buffer, input));
      } else {
        activeSource = { kind: "hdr_scene_rgb", hdr: parseHdrToRgbFloat(buffer, input) };
        uploadInput(sampleHdrRgbToSensorMosaic(activeSource.hdr));
      }
    } else if (input.kind === "bayer_raw_u16") {
      activeSource = { kind: "bayer_raw_u16" };
      appState.input.pixelType = input.pixelType || "Bayer";
      appState.input.pixelOrder = Number(input.pixelOrder?.id ?? 0);
      syncControlsFromState(["input.pixelType", "input.pixelOrder"]);
      uploadInput(parseRawU16ToFloat(buffer, input));
    } else {
      throw new Error(`Unsupported server sample kind: ${input.kind}`);
    }
    activeInputLabel = `Server sample: ${input.label}`;
    draw();
  }

  async function loadLocalFile(file) {
    statusEl.textContent = `Loading local file: ${file.name}...`;
    await new Promise((resolve) => requestAnimationFrame(resolve));
    const buffer = await file.arrayBuffer();
    if (file.name.toLowerCase().endsWith(".hdr")) {
      if (hdrPixelCountFromBuffer(buffer) > 8_000_000) {
        statusEl.textContent = `Decoding large local HDR directly to sensor mosaic: ${file.name}...`;
        await new Promise((resolve) => requestAnimationFrame(resolve));
        activeSource = { kind: "hdr_scene_rgb_large", buffer };
        uploadInput(parseHdrDirectToSensorMosaic(buffer));
      } else {
        activeSource = { kind: "hdr_scene_rgb", hdr: parseHdrToRgbFloat(buffer) };
        uploadInput(sampleHdrRgbToSensorMosaic(activeSource.hdr));
      }
      activeInputLabel = `Local-only upload: ${file.name}`;
    } else if (file.name.toLowerCase().endsWith(".raw")) {
      activeSource = { kind: "bayer_raw_u16" };
      uploadInput(
        parseRawU16ToFloat(buffer, {
          width: 512,
          height: 256,
          blackLevel: 64,
          whiteLevel: 1023,
        }),
      );
      activeInputLabel = `Local-only upload: ${file.name} with default 512x256 u16 metadata`;
    } else {
      throw new Error("Unsupported local file extension.");
    }
    draw();
  }

  for (const path of [
    "simulation.eit",
    "simulation.analogGain",
    "simulation.digitalGain",
    "simulation.idcgShotAnalogGain",
    "simulation.idcgShotDigitalGain",
    "simulation.idcgLongAnalogGain",
    "simulation.idcgLongDigitalGain",
  ]) {
    const schema = parameterSchema[path];
    schema.slider.addEventListener("input", () => {
      setLogStateFromSlider(path);
      draw({ updateHistogram: false });
    });
    schema.input.addEventListener("input", () => {
      setLogStateFromText(path);
      draw({ updateHistogram: false });
    });
  }
  parameterSchema["simulation.black"].control.addEventListener("input", () => {
    syncStateFromControl("simulation.black");
    draw({ updateHistogram: false });
  });
  for (const path of ["simpleIsp.wbR", "simpleIsp.wbB", "simpleIsp.gamma"]) {
    parameterSchema[path].control.addEventListener("input", () => {
      syncStateFromControl(path);
      draw({ updateHistogram: false });
    });
  }
  viewport.addEventListener(
    "wheel",
    (event) => {
      event.preventDefault();
      zoomAt(event.clientX, event.clientY, event.deltaY);
    },
    { passive: false },
  );
  viewport.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    viewport.setPointerCapture(event.pointerId);
    viewport.classList.add("is-panning");
    panStart = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, viewX: view.x, viewY: view.y };
  });
  viewport.addEventListener("pointermove", (event) => {
    if (!panStart || panStart.pointerId !== event.pointerId) return;
    const gain = panGain();
    view.x = panStart.viewX + (event.clientX - panStart.x) * gain;
    view.y = panStart.viewY + (event.clientY - panStart.y) * gain;
    scheduleCanvasZoom();
  });
  viewport.addEventListener("pointerup", (event) => {
    if (panStart?.pointerId === event.pointerId) {
      panStart = null;
      viewport.classList.remove("is-panning");
    }
  });
  viewport.addEventListener("pointercancel", () => {
    panStart = null;
    viewport.classList.remove("is-panning");
  });
  bayerViewerTab.addEventListener("click", () => {
    appState.view.mode = 0;
    syncControlFromState("view.mode");
    draw({ updateHistogram: false });
  });
  rgbViewerTab.addEventListener("click", () => {
    appState.view.mode = 4;
    syncControlFromState("view.mode");
    draw({ updateHistogram: false });
  });
  for (const [name, tab] of Object.entries(settingsTabs)) {
    tab.addEventListener("click", () => showSettingsPanel(name));
  }
  panelResizer.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    panelResizer.setPointerCapture(event.pointerId);
    shellEl.classList.add("is-resizing-panel");
  });
  panelResizer.addEventListener("pointermove", (event) => {
    if (!panelResizer.hasPointerCapture(event.pointerId)) return;
    const width = window.innerWidth - event.clientX;
    setPanelWidth(width);
    resetView();
    draw({ updateHistogram: false });
  });
  const stopPanelResize = (event) => {
    if (panelResizer.hasPointerCapture(event.pointerId)) {
      panelResizer.releasePointerCapture(event.pointerId);
    }
    shellEl.classList.remove("is-resizing-panel");
    draw();
  };
  panelResizer.addEventListener("pointerup", stopPanelResize);
  panelResizer.addEventListener("pointercancel", stopPanelResize);
  [pixelTypeSelect, pixelOrderSelect, adcBitsSelect, idcgShotAdcBitsSelect, idcgLongAdcBitsSelect, viewModeSelect].forEach((control) => {
    control.addEventListener("change", async () => {
      syncStateFromControls([
        "input.pixelType",
        "input.pixelOrder",
        "simulation.adcBits",
        "simulation.idcgShotAdcBits",
        "simulation.idcgLongAdcBits",
        "view.mode",
      ]);
      updateSensorEffective();
      if (activeSource?.kind === "hdr_scene_rgb") {
        uploadInput(sampleHdrRgbToSensorMosaic(activeSource.hdr));
        draw();
      } else if (activeSource?.kind === "hdr_scene_rgb_large") {
        const buffer =
          activeSource.buffer ??
          (await fetch(activeSource.uri).then((res) => res.arrayBuffer()));
        uploadInput(parseHdrDirectToSensorMosaic(buffer, activeSource.metadata ?? {}));
        draw();
      } else {
        draw();
      }
    });
  });
  sensorProfileSelect.addEventListener("change", () => {
    applySensorProfile(Number(sensorProfileSelect.value), 0);
    resetView();
    draw();
  });
  sensorCgModeSelect.addEventListener("change", () => {
    applySensorProfile(Number(sensorProfileSelect.value), Number(sensorCgModeSelect.value));
    draw();
  });
  acquisitionModeSelect.addEventListener("change", () => {
    appState.simulation.acquisitionMode = acquisitionModeSelect.value === "idcg" ? "idcg" : "single";
    updateReadoutLabels();
    resetView();
    draw();
  });
  idcgModeASelect.addEventListener("change", () => {
    appState.simulation.idcgModeA = Number(idcgModeASelect.value);
    updateReadoutLabels();
    draw();
  });
  idcgModeBSelect.addEventListener("change", () => {
    appState.simulation.idcgModeB = Number(idcgModeBSelect.value);
    updateReadoutLabels();
    draw();
  });
  localSensorProfileInput.addEventListener("change", () => {
    const file = localSensorProfileInput.files?.[0];
    if (!file) return;
    loadLocalSensorProfile(file)
      .then((profile) => {
        draw();
        statusEl.textContent = `Loaded local Sensor PRS: ${profile.SensorName}. File stayed in this browser session only.`;
      })
      .catch((error) => {
        console.error(error);
        statusEl.textContent = `Failed to load local Sensor PRS: ${error.message}`;
      });
  });
  saveSensorProfileButton.addEventListener("click", () => {
    try {
      saveSensorPrs();
    } catch (error) {
      console.error(error);
      statusEl.textContent = `Failed to save Sensor PRS: ${error.message}`;
    }
  });
  saveSimulationResultButton.addEventListener("click", async () => {
    const readoutBitsText = activeReadoutConfigs().map((readout) => `${readout.name} ${readout.adcBits}-bit`).join(" / ");
    statusEl.textContent = `Saving ADC RAW locally: ${inputMeta.width}x${inputMeta.height}, ${readoutBitsText} into uint16 raw...`;
    try {
      await saveAdcRawResult();
    } catch (error) {
      if (error?.name === "AbortError") {
        statusEl.textContent = "ADC RAW save cancelled.";
        return;
      }
      console.error(error);
      statusEl.textContent = `Failed to save ADC RAW: ${error.message}`;
    }
  });
  document.querySelector("#seed").addEventListener("click", () => {
    seed = Math.random() * 1000;
    appState.simulation.seed = seed;
    draw();
  });
  document.querySelector("#resetView").addEventListener("click", resetView);
  histLogButton.addEventListener("click", () => {
    histogramScale = "log";
    histLogButton.classList.add("is-active");
    histLinearButton.classList.remove("is-active");
    histSnrButton.classList.remove("is-active");
    drawHistogram();
    updateDiagnostics(renderBackend, webGpuDetail);
  });
  histLinearButton.addEventListener("click", () => {
    histogramScale = "linear";
    histLinearButton.classList.add("is-active");
    histLogButton.classList.remove("is-active");
    histSnrButton.classList.remove("is-active");
    drawHistogram();
    updateDiagnostics(renderBackend, webGpuDetail);
  });
  histSnrButton.addEventListener("click", () => {
    histogramScale = "snr";
    histSnrButton.classList.add("is-active");
    histLogButton.classList.remove("is-active");
    histLinearButton.classList.remove("is-active");
    drawHistogram();
    updateDiagnostics(renderBackend, webGpuDetail);
  });
  window.addEventListener("resize", () => {
    resetView();
    draw();
  });
  for (const key of Object.keys(sensorInputs)) {
    sensorInputs[key].addEventListener("input", () => {
      syncSensorSliderFromInput(key);
      readSensorEditor();
      draw();
    });
    sensorSliders[key].addEventListener("input", () => {
      syncSensorInputFromSlider(key);
      readSensorEditor();
      draw();
    });
  }

  await loadSensorProfiles();
  const samples = await loadSampleManifest();
  sampleSelect.replaceChildren(
    ...samples.map((input, index) => {
      const option = document.createElement("option");
      option.value = String(index);
      option.textContent = input.label;
      return option;
    }),
  );
  sampleSelect.addEventListener("change", () => {
    loadServerSample(samples[Number(sampleSelect.value)]).catch((error) => {
      console.error(error);
      statusEl.textContent = `Failed to load server sample: ${error.message}`;
    });
  });
  localFileInput.addEventListener("change", () => {
    const file = localFileInput.files?.[0];
    if (!file) return;
    loadLocalFile(file).catch((error) => {
      console.error(error);
      statusEl.textContent = `Failed to load local file: ${error.message}`;
    });
  });

  await loadServerSample(samples[0]);
}

main().catch((error) => {
  console.error(error);
  statusEl.textContent = `Failed to start viewer: ${error.message}`;
});
