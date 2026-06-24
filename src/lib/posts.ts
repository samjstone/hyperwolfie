import { getCollection, type CollectionEntry } from 'astro:content';

export const POST_TYPES = [
  'note',
  'article',
  'reply',
  'rsvp',
  'repost',
  'like',
  'bookmark',
  'photo',
  'watch',
  'read',
  'listen',
  'play',
] as const;
export type PostType = (typeof POST_TYPES)[number];

export type FeedEntry = {
  [T in PostType]: CollectionEntry<T> & { postType: T };
}[PostType];

type AnyEntry = CollectionEntry<PostType>;

// Routable: the post gets its own page. Excludes soft-deleted posts, drafts, and
// `private` posts (a static site can't truly gate "private", so we just don't
// publish it). `unlisted` posts ARE routable — they get a page.
const isPublished = (entry: AnyEntry) =>
  !entry.data.deleted &&
  entry.data['post-status'] !== 'draft' &&
  entry.data.visibility !== 'private';

// Listed: the post shows up in feeds and index pages. Published AND not
// `unlisted`. (Posts with no visibility set are treated as public.)
const isListed = (entry: AnyEntry) =>
  isPublished(entry) && entry.data.visibility !== 'unlisted';

const byNewest = (a: AnyEntry, b: AnyEntry) =>
  b.data.date.getTime() - a.data.date.getTime();

/** A photo post's `photo` is one URL or an array of URLs — always return an array. */
export function getPhotos(photo: string | string[]): string[] {
  return Array.isArray(photo) ? photo : [photo];
}

/**
 * Posts of a single type for a public index/listing — newest first. Excludes
 * deleted, drafts, private, and unlisted posts.
 */
export async function getPosts<T extends PostType>(type: T) {
  return (await getCollection(type, (e) => isListed(e))).sort((a, b) =>
    byNewest(a, b),
  );
}

/**
 * The unified public feed: every post type merged, newest first. Same listing
 * rules as getPosts (no drafts/private/unlisted).
 */
export async function getFeed(): Promise<FeedEntry[]> {
  const byType = await Promise.all(
    POST_TYPES.map(async (type) => {
      const entries = await getCollection(type, (e) => isListed(e));
      return entries.map((entry) => ({ ...entry, postType: type }));
    }),
  );

  return (byType.flat() as FeedEntry[]).sort((a, b) => byNewest(a, b));
}

/**
 * Every routable post of a type (INCLUDING unlisted), newest first — use this in
 * getStaticPaths so unlisted posts still get a page even though they're hidden
 * from feeds. Excludes deleted, drafts, and private posts.
 */
export async function getRoutablePosts<T extends PostType>(type: T) {
  return (await getCollection(type, (e) => isPublished(e))).sort((a, b) =>
    byNewest(a, b),
  );
}
