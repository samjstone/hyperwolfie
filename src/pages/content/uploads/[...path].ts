import type { APIRoute } from "astro";

// Proxy committed Micropub uploads through the canonical domain.
//
// The Micropub receiver commits images into content/uploads/ and writes
// absolute photo URLs like https://<domain>/content/uploads/<file>. Astro's
// build only publishes dist/, so content/ is never deployed and those URLs
// would 404 for external consumers (RSS/h-feed readers, Bridgy Fed ->
// Mastodon/Bluesky). Serve the file straight from the GitHub repo the
// receiver commits to, with the URL staying on this domain.
export const prerender = false;

const UPSTREAM =
  "https://raw.githubusercontent.com/samjstone/personal-site/main/content/uploads";

export const GET: APIRoute = async ({ params }) => {
  const path = params.path;
  if (!path) return new Response("Not found", { status: 404 });

  const upstream = await fetch(`${UPSTREAM}/${path}`);
  if (!upstream.ok) return new Response("Not found", { status: 404 });

  return new Response(upstream.body, {
    status: 200,
    headers: {
      "Content-Type":
        upstream.headers.get("Content-Type") ?? "application/octet-stream",
      "Cache-Control": "public, max-age=3600",
    },
  });
};
