export const prerender = false;

import type { APIRoute } from "astro";
import { getWebmentions } from "../../server/getWebmentions";

export const GET: APIRoute = async ({ url }) => {
  const target = url.searchParams.get("target");
  if (!target?.startsWith("https://hyperwolfie.com/")) {
    return new Response("[]", {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const webmentions = await getWebmentions(target);
  return new Response(JSON.stringify(webmentions), {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=300",
    },
  });
};
