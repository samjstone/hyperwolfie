import rss from "@astrojs/rss";
import { getFeed } from "../lib/posts";

// Strip tags for the plain-text description.
const stripHtml = (s) =>
  s.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

export async function GET(context) {
  const posts = await getFeed();

  return rss({
    title: "HyperWolfie",
    description: "Posts from hyperwolfie.com",
    site: context.site,
    items: posts.map((post) => {
      const body = post.body ?? "";
      return {
        title: post.data.title ?? post.data.name ?? undefined,
        description: stripHtml(body).slice(0, 280),
        link: `/${post.id}`,
        pubDate: post.data.date,
        content:
          `<div>${body}` +
          (post.data.photo ?? []).map((p) => `<img src="${p}" alt="" />`).join("") +
          `<a href="https://fed.brid.gy/"></a></div>`,
      };
    }),
  });
}