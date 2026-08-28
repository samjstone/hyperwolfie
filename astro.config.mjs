// @ts-check
import { defineConfig } from "astro/config";

import tailwindcss from "@tailwindcss/vite";

import cloudflare from "@astrojs/cloudflare";

// https://astro.build/config
export default defineConfig({
  site: "https://hyperwolfie.com",
  // `photo` URLs in posts can come from any host (syndicated feeds, etc.), so
  // allow Astro's <Image> to optimize any https remote image.
  image: {
    remotePatterns: [{ protocol: "https" }],
  },

  vite: {
    plugins: [tailwindcss()],
  },

  adapter: cloudflare(),
});