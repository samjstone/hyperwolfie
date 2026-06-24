import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const post = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './content' }),
  schema: z
    .object({
      // Coerced from an ISO string so we can sort/format.
      date: z.coerce.date(),
      updated: z.coerce.date().optional(),
      // Filtering flags (see the visibility helpers in src/lib/posts.ts).
      deleted: z.boolean().optional(),
      draft: z.boolean().optional(),
      'post-status': z.string().optional(), // typically 'published' | 'draft'
      visibility: z.string().optional(), // typically 'public' | 'unlisted' | 'private'
      // `category` is translated to `tags`; a single tag is a bare string and
      // several are an array — normalize to an array so templates can `.map()`.
      tags: z
        .preprocess(
          (v) => (v == null ? [] : Array.isArray(v) ? v : [v]),
          z.array(z.string()),
        )
        .default([]),
      // Rendered in the feed, so worth a typed shape: one URL or many.
      photo: z.union([z.string(), z.array(z.string())]).optional(),
    })
    // Everything else (title, in-reply-to, watch-of, like-of, rating, location,
    // rich h-cite objects, …) is kept as-is and read defensively in templates.
    .loose(),
});

export const collections = { post };
