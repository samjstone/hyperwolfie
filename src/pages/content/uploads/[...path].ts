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

// Uploads are committed without file extensions, so GitHub serves them as
// application/octet-stream. Consumers like Bridgy Fed propagate that mime type
// to Bluesky, whose clients then refuse to show the post — sniff the real
// image type from the magic bytes instead.
const sniffImageType = (bytes: Uint8Array): string | null => {
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46)
    return "image/gif";
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return "image/jpeg";
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e)
    return "image/png";
  if (
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  )
    return "image/webp";
  return null;
};

export const GET: APIRoute = async ({ params }) => {
  const path = params.path;
  if (!path) return new Response("Not found", { status: 404 });

  const upstream = await fetch(`${UPSTREAM}/${path}`);
  if (!upstream.ok) return new Response("Not found", { status: 404 });

  const body = await upstream.arrayBuffer();
  const contentType =
    sniffImageType(new Uint8Array(body.slice(0, 12))) ??
    upstream.headers.get("Content-Type") ??
    "application/octet-stream";

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=3600",
    },
  });
};
