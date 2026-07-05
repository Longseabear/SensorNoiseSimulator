# Docker Hosted Viewer

The Docker image serves only the static hosted viewer files. It does not run
Python simulation, ISP, thumbnail generation, uploads, or server-side image
processing. Noise simulation, ADC sampling, Bayer view, Simple ISP, local file
uploads, and SensorPRS editing still run in the browser.

## Build And Run

From the repository root:

```powershell
docker build -t sensor-noise-simulator-viewer .
docker run --rm -p 5173:5173 sensor-noise-simulator-viewer
```

Open:

```text
http://localhost:5173
```

## Docker Compose

```powershell
docker compose up --build
```

Stop it with:

```powershell
docker compose down
```

## Configuration

The container listens on `PORT`, defaulting to `5173`.

```powershell
docker run --rm -e PORT=8080 -p 8080:8080 sensor-noise-simulator-viewer
```

## Health Check

The image includes a health check that fetches `/` from the static server. A
healthy container only proves the static site is being served; image processing
is intentionally client-side and should be verified in a browser with WebGPU
when GPU behavior matters.
