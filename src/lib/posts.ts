import { getCollection, type CollectionEntry } from 'astro:content';

// A post plus its derived type (the folder it lives in: 'note', 'photo', …).
export type Post = CollectionEntry<'post'> & { postType: string };

// The post type is the first path segment of the id, e.g. "note/1782317087".
const postType = (id: string) => id.split('/')[0];

// Routable: the post gets its own page. Excludes deleted posts, drafts, and
// `private` posts (a static site can't truly gate "private", so we just don't
// publish it). `unlisted` posts ARE routable — they get a page.
const isPublished = (post: Post) =>
  !post.data.deleted &&
  !post.data.draft &&
  post.data['post-status'] !== 'draft' &&
  post.data.visibility !== 'private';

// Listed: shows up in feeds and index pages. Published AND not `unlisted`.
// (Posts with no visibility set are treated as public.)
const isListed = (post: Post) =>
  isPublished(post) && post.data.visibility !== 'unlisted';

const byNewest = (a: Post, b: Post) =>
  b.data.date.getTime() - a.data.date.getTime();

// Every post, tagged with its derived type.
async function allPosts(): Promise<Post[]> {
  const entries = await getCollection('post');
  return entries.map((entry) => ({ ...entry, postType: postType(entry.id) }));
}

/** The unified public feed — every type merged, newest first. */
export async function getFeed(): Promise<Post[]> {
  return (await allPosts()).filter(isListed).sort(byNewest);
}

/** Posts of a single type for a public index/listing — newest first. */
export async function getPosts(type: string): Promise<Post[]> {
  return (await allPosts())
    .filter((post) => post.postType === type && isListed(post))
    .sort(byNewest);
}

/**
 * Every routable post of a type (INCLUDING unlisted), newest first — use this in
 * getStaticPaths so unlisted posts still get a page. Excludes deleted/draft/private.
 */
export async function getRoutablePosts(type: string): Promise<Post[]> {
  return (await allPosts())
    .filter((post) => post.postType === type && isPublished(post))
    .sort(byNewest);
}

/** A `photo` value is one URL or an array of URLs — always return an array. */
export function getPhotos(photo: string | string[] | undefined): string[] {
  return photo == null ? [] : Array.isArray(photo) ? photo : [photo];
}
