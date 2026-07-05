(() => {
function getState(state, path) {
  return path.split(".").reduce((value, key) => value?.[key], state);
}

function setState(state, path, value) {
  const keys = path.split(".");
  let target = state;
  for (const key of keys.slice(0, -1)) {
    target = target[key];
  }
  target[keys.at(-1)] = value;
}

function clippedNumber(value, min = -Infinity, max = Infinity) {
  const number = Number(value);
  if (!Number.isFinite(number)) return min === -Infinity ? 0 : min;
  return Math.min(max, Math.max(min, number));
}

function formatScaleInput(value) {
  return Number(value.toFixed(4)).toString();
}

function readControlValue(schema) {
  if (schema.type === "number" || schema.type === "number-select") return Number(schema.control.value);
  if (schema.type === "log-number") return clippedNumber(schema.input.value, schema.min, schema.max);
  return schema.control.value;
}

function writeControlValue(schema, value) {
  if (schema.type === "log-number") {
    const clipped = clippedNumber(value, schema.min, schema.max);
    schema.slider.value = String(Math.log2(clipped));
    if (document.activeElement !== schema.input) schema.input.value = formatScaleInput(clipped);
    return;
  }
  schema.control.value = String(value);
}

function syncStateFromControl(state, parameterSchema, path) {
  const schema = parameterSchema[path];
  setState(state, path, readControlValue(schema));
}

function syncControlFromState(state, parameterSchema, path) {
  const schema = parameterSchema[path];
  writeControlValue(schema, getState(state, path));
}

function syncStateFromControls(state, parameterSchema, paths = Object.keys(parameterSchema)) {
  for (const path of paths) syncStateFromControl(state, parameterSchema, path);
}

function syncControlsFromState(state, parameterSchema, paths = Object.keys(parameterSchema)) {
  for (const path of paths) syncControlFromState(state, parameterSchema, path);
}

function setLogStateFromSlider(state, parameterSchema, path) {
  const schema = parameterSchema[path];
  setState(state, path, 2 ** Number(schema.slider.value));
  syncControlFromState(state, parameterSchema, path);
}

function setLogStateFromText(state, parameterSchema, path) {
  const schema = parameterSchema[path];
  setState(state, path, clippedNumber(schema.input.value, schema.min, schema.max));
  syncControlFromState(state, parameterSchema, path);
}

globalThis.NoiseState = {
  clippedNumber,
  formatScaleInput,
  getState,
  readControlValue,
  setLogStateFromSlider,
  setLogStateFromText,
  setState,
  syncControlFromState,
  syncControlsFromState,
  syncStateFromControl,
  syncStateFromControls,
  writeControlValue,
};
})();
