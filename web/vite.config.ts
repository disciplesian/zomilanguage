import { createHash } from "crypto";
import fs from "fs";
import path from "path";

import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

/**
 * Writes dist/site-manifest.json: every published file with its SHA-256, so the
 * zomitranslator.com cPanel mirror (public/zomi-sync.php) can copy new versions
 * automatically. cpanel-htaccess.txt is installed there as .htaccess and
 * cpanel-index.txt as index.html.
 */
function siteManifest(): Plugin {
  let outDir = "dist";
  return {
    name: "zomi-site-manifest",
    apply: "build",
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir);
    },
    closeBundle() {
      const files: { path: string; sha256: string; size: number; as?: string }[] = [];
      const walk = (dir: string): void => {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
          const full = path.join(dir, entry.name);
          const rel = path.relative(outDir, full).split(path.sep).join("/");
          if (entry.isDirectory()) {
            if (rel !== "downloads") walk(full);
            continue;
          }
          if (rel === "site-manifest.json") continue;
          const data = fs.readFileSync(full);
          files.push({
            path: rel,
            sha256: createHash("sha256").update(data).digest("hex"),
            size: data.length,
            ...(rel === "cpanel-htaccess.txt" ? { as: ".htaccess" } : {}),
          });
        }
      };
      // Rork hosting injects its own scripts into served HTML; the mirror gets the
      // untouched page from a plain-text copy instead.
      fs.copyFileSync(path.join(outDir, "index.html"), path.join(outDir, "cpanel-index.txt"));
      walk(outDir);
      for (const f of files) {
        if (f.path === "cpanel-index.txt") f.as = "index.html";
      }
      files.splice(
        files.findIndex((f) => f.path === "index.html"),
        1
      );
      files.sort((a, b) => a.path.localeCompare(b.path));
      const version = createHash("sha256")
        .update(files.map((f) => `${f.path}:${f.sha256}`).join("\n"))
        .digest("hex")
        .slice(0, 12);
      fs.writeFileSync(
        path.join(outDir, "site-manifest.json"),
        JSON.stringify({ version, builtAt: new Date().toISOString(), files }, null, 2)
      );
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), siteManifest()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // Expose both VITE_* (Vite default) and EXPO_PUBLIC_* (Rork's cross-platform
  // public-env convention, written by tools like getOrCreateAuthConfig).
  envPrefix: ["VITE_"],
}));
