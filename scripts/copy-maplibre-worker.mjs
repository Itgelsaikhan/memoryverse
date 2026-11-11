// Copies MapLibre's web worker into /public so the browser can load it.
// (Turbopack does not bundle MapLibre's module worker automatically.)
import { copyFileSync, mkdirSync } from "node:fs";

mkdirSync("public/vendor", { recursive: true });
copyFileSync("node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs", "public/vendor/maplibre-gl-worker.mjs");
console.log("Copied maplibre-gl-worker.mjs → public/vendor/");
