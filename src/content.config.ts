import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const post = defineCollection({
  // Everything under ./content EXCEPT site/ — those are singletons (bio, etc.)
  // with their own schema, not dated posts.
  loader: glob({ pattern: ["**/*.md", "!site/**"], base: "./content" }),
  schema: z
    .object({
      // Coerced from an ISO string so we can sort/format.
      date: z.coerce.date(),
      updated: z.coerce.date().optional(),
      // Filtering flags (see the visibility helpers in src/lib/posts.ts).
      deleted: z.boolean().optional(),
      draft: z.boolean().optional(),
      "post-status": z.string().optional(), // typically 'published' | 'draft'
      visibility: z.string().optional(), // typically 'public' | 'unlisted' | 'private'
      // `category` is translated to `tags`; a single tag is a bare string and
      // several are an array — normalize to an array so templates can `.map()`.
      tags: z
        .preprocess(
          (v) => (v == null ? [] : Array.isArray(v) ? v : [v]),
          z.array(z.string()),
        )
        .default([]),
      // Rendered in the feed. Normalize to an array so templates can always
      // `.map()`: a single photo in frontmatter becomes an array of one.
      photo: z
        .preprocess(
          (v) => (v == null ? [] : Array.isArray(v) ? v : [v]),
          z.array(z.string()),
        )
        .default([]),
    })
    // Everything else (title, in-reply-to, watch-of, like-of, rating, location,
    // rich h-cite objects, …) is kept as-is and read defensively in templates.
    .loose(),
});

// Site singletons: prose blocks (bio, about, …) edited directly in markdown.
// Frontmatter holds discrete fields; the markdown body holds the prose.
const site = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./content/site" }),
  schema: z.object({
    title: z.string().optional(),
    tagline: z.string().optional(),
  }),
});

const webmention = defineCollection({
  // One JSON file per received webmention, committed beside its target post at
  // content/<post-id>/webmentions/<hash>.json by the serverless receiver. The
  // body is webmention.io's jf2 `post` (hyphenated wm-* fields). Read
  // defensively (like the post collection): likes carry no content and a sparse
  // author, and wm-property can be a value not in any fixed list.
  loader: glob({ pattern: "**/webmentions/*.json", base: "./content" }),
  schema: z
    .object({
      "wm-id": z.number().optional(),
      // like-of | repost-of | in-reply-to | mention-of | bookmark-of | rsvp | …
      "wm-property": z.string().optional(),
      "wm-source": z.string().optional(),
      "wm-target": z.string().optional(),
      url: z.string().optional(),
      // jf2 sends null when unknown — normalize null/missing -> undefined.
      published: z.preprocess(
        (v) => (v ? new Date(v as string) : undefined),
        z.date().optional(),
      ),
      author: z
        .object({
          name: z.string().optional(),
          url: z.string().optional(),
          photo: z.string().optional(),
        })
        .loose()
        .optional(),
      content: z
        .object({
          text: z.string().optional(),
          html: z.string().optional(),
        })
        .loose()
        .optional(),
    })
    .loose(),
});

export const collections = { post, site, webmention };
