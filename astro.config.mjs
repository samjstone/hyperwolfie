// @ts-check
import { defineConfig } from "astro/config";

import tailwindcss from "@tailwindcss/vite";

import netlify from "@astrojs/netlify";

// https://astro.build/config
export default defineConfig({
  // `photo` URLs in posts can come from any host (syndicated feeds, etc.), so
  // allow Astro's <Image> to optimize any https remote image.
  image: {
    remotePatterns: [{ protocol: "https" }],
  },

  vite: {
    plugins: [tailwindcss()],
  },

  adapter: netlify(),
});