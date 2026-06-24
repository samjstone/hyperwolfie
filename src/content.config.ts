import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const base = z.object({
  // Always 'entry' (h-entry). Optional so hand-authored posts can omit it.
  type: z.literal('entry').optional(),
  // Emitted as an ISO string; coerce to a Date for easy sorting/formatting.
  date: z.coerce.date(),
  updated: z.coerce.date().optional(),
  // The Micropub client that created the post.
  client_id: z.string().optional(),
  // Soft-delete flag: the `delete` action sets this to true rather than
  // removing the file. Filter these out when rendering (see src/lib/posts.ts).
  deleted: z.boolean().optional(),
  // `category` is translated to `tags`. The library writes a bare string for a
  // single tag and an array for several — normalize to an array so templates
  // can always `.map()` over it.
  tags: z
    .preprocess(
      (v) => (v == null ? [] : Array.isArray(v) ? v : [v]),
      z.array(z.string()),
    )
    .default([]),
  // Where the post was syndicated to, if any.
  syndication: z
    .preprocess(
      (v) => (v == null ? [] : Array.isArray(v) ? v : [v]),
      z.array(z.string()),
    )
    .optional(),

  name: z.string().optional(), // raw mf2 `name` (clients usually send title)
  summary: z.string().optional(),
  url: z.string().optional(), // permalink, if the client sets one
  uid: z.string().optional(),
  author: z.union([z.string(), z.object({}).passthrough()]).optional(),
  // Location: plaintext, a `geo:` URI, or an embedded h-card/h-adr/h-geo object.
  location: z.union([z.string(), z.object({}).passthrough()]).optional(),
  // Media that can ride along on any post (photo has its own typed field below).
  featured: z.string().optional(),
  audio: z.union([z.string(), z.array(z.string())]).optional(),
  video: z.union([z.string(), z.array(z.string())]).optional(),
  // Micropub publishing controls (indieweb.org/Micropub-extensions). Kept as
  // open strings rather than enums so a server using a custom status/visibility
  // won't fail validation. Common values:
  //   post-status: 'published' | 'draft'
  //   visibility:  'public' | 'unlisted' | 'private'
  'post-status': z.string().optional(),
  visibility: z.string().optional(),
})
  // Keep ANY field a client sends that isn't modeled above, instead of
  // silently dropping it. This keeps the schema client-agnostic: Sparkles (or a
  // future client) can add fields and they'll show up on `entry.data` (typed as
  // `unknown` — narrow before use). `.extend()` on this base preserves it.
  .passthrough();

// A referenced thing (an article being replied to, a movie, a song, ...). The
// `*-of` / `in-reply-to` properties are either a bare URL string or a nested
// h-cite object; the library leaves extra keys in, so allow passthrough.
const citation = z
  .object({
    name: z.string().optional(),
    url: z.string().optional(),
    published: z.string().optional(),
  })
  .passthrough();
const reference = z.union([z.string(), citation]);

// One or more image URLs.
const photo = z.union([z.string(), z.array(z.string())]);

// watch/read/listen/play clients commonly attach a rating.
const rating = z.union([z.string(), z.number()]).optional();

// Helper: a collection backed by `content/<type>/`. Generic over the schema so
// each collection keeps its inferred `data` type (a non-generic `z.ZodTypeAny`
// param would erase it and make every `entry.data` `unknown`).
const postCollection = <S extends z.ZodTypeAny>(type: string, schema: S) =>
  defineCollection({
    loader: glob({ pattern: '**/*.md', base: `./content/${type}` }),
    schema,
  });

export const collections = {
  // Plain note — no extra fields beyond the base.
  note: postCollection('note', base),

  // Long-form post: `name` is translated to `title`.
  article: postCollection(
    'article',
    base.extend({ title: z.string(), summary: z.string().optional() }),
  ),

  // Replies and RSVPs both point at what they respond to.
  reply: postCollection('reply', base.extend({ 'in-reply-to': reference })),
  rsvp: postCollection(
    'rsvp',
    base.extend({
      rsvp: z.enum(['yes', 'no', 'maybe', 'interested']),
      'in-reply-to': reference,
    }),
  ),

  // Reposts.
  repost: postCollection('repost', base.extend({ 'repost-of': reference })),

  // Likes and bookmarks: the library fetches the target's page title into
  // `name` (-> `title`) when the client didn't supply one.
  like: postCollection(
    'like',
    base.extend({ 'like-of': reference, title: z.string().optional() }),
  ),
  bookmark: postCollection(
    'bookmark',
    base.extend({ 'bookmark-of': reference, title: z.string().optional() }),
  ),

  // Photo post: one or more image URLs.
  photo: postCollection('photo', base.extend({ photo })),

  // "Consumed media" posts. `watch` is your movie recs.
  watch: postCollection('watch', base.extend({ 'watch-of': reference, rating })),
  read: postCollection(
    'read',
    base.extend({
      'read-of': reference,
      'read-status': z.string().optional(),
      rating,
    }),
  ),
  listen: postCollection('listen', base.extend({ 'listen-of': reference })),
  // `play-of` posts (the config's "game" label maps to this `play/` folder).
  play: postCollection('play', base.extend({ 'play-of': reference, rating })),
};
