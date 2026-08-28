import rss from "@astrojs/rss";
import { getFeed } from "../lib/posts";

// Escape post bodies for embedding in the feed's HTML content.
const escapeHtml = (s) =>
  s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");

export async function GET(context) {
  const posts = await getFeed();

  return rss({
    title: "HyperWolfie",
    description: "Posts from hyperwolfie.com",
    site: context.site,
    items: posts.map((post) => ({
      title: post.data.title ?? post.data.name ?? undefined,
      description: (post.body ?? "").slice(0, 280),
      link: `/${post.id}`,
      pubDate: post.data.date,
      content:
        `<div><p>${escapeHtml(post.body ?? "")}</p>` +
        post.data.photo.map((p) => `<img src="${p}" alt="" />`).join("") +
        `<a href="https://fed.brid.gy/"></a></div>`,
    })),
  });
}
