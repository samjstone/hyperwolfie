import { getCollection, type CollectionEntry } from "astro:content";

// A received webmention plus its derived target post id and coarse display kind.
export type Webmention = CollectionEntry<"webmention"> & {
  postId: string;
  kind: "like" | "repost" | "reply" | "mention";
};

// The target post id is the entry id minus the trailing "/webmentions/<hash>",
// e.g. "note/1782757437/webmentions/ab12cd…" -> "note/1782757437" (== post.id).
const postId = (id: string) => id.split("/webmentions/")[0];

// Collapse the IndieWeb wm-property down to the kinds the UI renders.
const kindOf = (wm?: string): Webmention["kind"] => {
  switch (wm) {
    case "like-of":
      return "like";
    case "repost-of":
      return "repost";
    case "in-reply-to":
      return "reply";
    default:
      return "mention"; // mention-of, bookmark-of, rsvp, …
  }
};

const byOldest = (a: Webmention, b: Webmention) =>
  (a.data.published?.getTime() ?? 0) - (b.data.published?.getTime() ?? 0);

// Every received webmention, tagged with its target post id and kind.
async function allMentions(): Promise<Webmention[]> {
  const entries = await getCollection("webmention");
  return entries.map((entry) => ({
    ...entry,
    postId: postId(entry.id),
    kind: kindOf(entry.data["wm-property"]),
  }));
}

/** Every received webmention, newest target first is irrelevant — unsorted. */
export function getWebmentions(): Promise<Webmention[]> {
  return allMentions();
}

// One person can leave several like files — Bridgy Fed never tells us about an
// un-like, so like/unlike/re-like piles up. Collapse by author (url, then name).
const dedupeByAuthor = (list: Webmention[]): Webmention[] => {
  const seen = new Map<string, Webmention>();
  for (const m of list) {
    const key = m.data.author?.url || m.data.author?.name || m.id;
    if (!seen.has(key)) seen.set(key, m);
  }
  return [...seen.values()];
};

/** All webmentions targeting one post (pass the post's `id`), oldest first. */
export async function getWebmentionsForPost(id: string): Promise<Webmention[]> {
  return (await allMentions()).filter((m) => m.postId === id).sort(byOldest);
}

/**
 * Webmentions for a single post, grouped for display. Likes/reposts are deduped
 * by author; replies/mentions shown in full, oldest first.
 */
export async function getGroupedWebmentions(id: string) {
  const mine = await getWebmentionsForPost(id);
  const of = (kind: Webmention["kind"]) => mine.filter((m) => m.kind === kind);
  return {
    likes: dedupeByAuthor(of("like")),
    reposts: dedupeByAuthor(of("repost")),
    replies: of("reply"),
    mentions: of("mention"),
  };
}
