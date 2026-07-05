import http from "node:http";
import { createReadStream, existsSync, statSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("./public/", import.meta.url));
const port = Number(process.env.PORT || 5173);

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};

function resolvePath(urlPath) {
  const pathname = decodeURIComponent(new URL(urlPath, "http://localhost").pathname);
  const requested = pathname === "/" ? "/index.html" : pathname;
  const resolved = normalize(join(root, requested));

  if (!resolved.startsWith(root)) {
    return null;
  }

  return resolved;
}

const server = http.createServer((req, res) => {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405, {
      "content-type": "text/plain; charset=utf-8",
      allow: "GET, HEAD",
    });
    res.end("This example server only serves static files.");
    return;
  }

  const filePath = resolvePath(req.url || "/");

  if (!filePath || !existsSync(filePath) || !statSync(filePath).isFile()) {
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    res.end("Not found");
    return;
  }

  res.writeHead(200, {
    "content-type": contentTypes[extname(filePath)] || "application/octet-stream",
    "cache-control": "no-store",
  });
  if (req.method === "HEAD") {
    res.end();
    return;
  }
  createReadStream(filePath).pipe(res);
});

server.listen(port, () => {
  console.log(`NoiseSimulator hosted viewer: http://localhost:${port}`);
  console.log("Server only serves static files; WebGPU processing runs in the browser.");
});
