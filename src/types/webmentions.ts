import z from "zod";

export const WebmentionProperties = z.enum([
  "in-reply-to",
  "like-of",
  "repost-of",
  "bookmark-of",
  "mention-of",
  "rsvp",
]);

export const WebmentionSchema = z.object({
  type: z.string(),
  author: z.object({
    type: z.string(),
    name: z.string(),
    url: z.url().or(z.literal("")).optional(),
    photo: z.url().or(z.literal("")).optional(),
  }),
  url: z.url(),
  published: z.string().nullable().optional(),
  "wm-id": z.number(),
  content: z
    .object({
      text: z.string().optional(),
      html: z.string().optional(),
    })
    .optional(),
  "wm-property": WebmentionProperties,
});

export const WebmentionListSchema = z.object({
  type: z.string(),
  name: z.string(),
  children: z.array(WebmentionSchema),
});

export type Webmention = z.infer<typeof WebmentionSchema>;
