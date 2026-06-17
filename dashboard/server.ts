import { serve } from "bun";
import { file } from "bun";
import { resolve } from "path";

const port = Number(process.env.PORT) || 4173;
const root = resolve(import.meta.dir, "dist");

const mimeTypes: Record<string, string> = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".mjs": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
};

serve({
  hostname: "0.0.0.0",
  port,
  async fetch(req) {
    const url = new URL(req.url);
    let path = decodeURIComponent(url.pathname);
    
    if (path === "/") {
      path = "/index.html";
    }

    let filePath = `${root}${path}`;
    let f = file(filePath);

    if (!(await f.exists())) {
      // Fallback for SPA routing
      filePath = `${root}/index.html`;
      f = file(filePath);
    }

    const extMatch = filePath.match(/\.[^.]+$/);
    const ext = extMatch ? extMatch[0] : ".html";

    return new Response(f, {
      headers: {
        "Content-Type": mimeTypes[ext] || "application/octet-stream",
      },
    });
  },
});

console.log(`Serving dashboard + widget on 0.0.0.0:${port}`);
