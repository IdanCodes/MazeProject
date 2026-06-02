// electron.vite.config.js
import { resolve } from "path";
import { defineConfig } from "electron-vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import * as path from "node:path";
var __electron_vite_injected_dirname = "/Users/idan/Dev/Projects/School/MazeProject-new/frontend";
var electron_vite_config_default = defineConfig({
  main: {
    build: {
      lib: {
        entry: resolve(__electron_vite_injected_dirname, "electron/main.ts")
      }
    }
  },
  renderer: {
    root: ".",
    plugins: [react(), tailwindcss()],
    base: "./",
    resolve: {
      alias: {
        "@src": path.resolve(__electron_vite_injected_dirname, "./src")
      }
    },
    build: {
      base: "./",
      outDir: "dist",
      rollupOptions: {
        input: resolve(__electron_vite_injected_dirname, "index.html")
      }
    }
  }
});
export {
  electron_vite_config_default as default
};
