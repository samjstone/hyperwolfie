import { execSync } from "node:child_process";

const SITE = "https://hyperwolfie.com";
const TARGET = "https://fed.brid.gy/";
const BRIDGY_WEBMENTION = "https://fed.brid.gy/webmention";

// Netlify build plugin. For every post added, modified, or removed in this
// deploy, send Bridgy Fed a webmention (source = post URL, target = fed.brid.gy).
// Bridgy refetches the source and acts on the HTTP response — so the route is the
// only source of truth and the plugin needs no frontmatter logic:
//   - 200 + h-entry  -> federate / update on the fediverse + Bluesky
//   - 404 / 410      -> delete the bridged copy everywhere
//
// The route (getFeed) builds a page only for public, listed posts; draft /
// deleted / private / unlisted posts 404. So a delete federates whether it's a
// soft delete (frontmatter `deleted: true`, a Modified file) or a hard delete
// (the .md file removed from the repo — a permanent Micropub delete or a manual
// git rm). Both cases send a webmention for the now-404 source:
//   - publish a post           -> 200 -> federates automatically (no flag needed)
//   - mark it `deleted: true`  -> 404 -> Bridgy removes it
//   - remove the .md file      -> 404 -> Bridgy removes it (source derived from
//                                        the deleted path — the file is gone, but
//                                        onSuccess runs post-deploy so it 404s)
// To keep a post OFF Bluesky, keep it from being a public listed page (draft,
// unlisted, private, or deleted).
//
// Bridgy Fed one-way door: the first webmention it receives makes it STOP
// polling the RSS/Atom feed and expect webmentions for all future posts.
export const onSuccess = async () => {
  const { CACHED_COMMIT_REF, COMMIT_REF } = process.env;
  if (!COMMIT_REF) return console.log("bridgy: no COMMIT_REF, skipping");
  const range = CACHED_COMMIT_REF ? `${CACHED_COMMIT_REF} ${COMMIT_REF}` : COMMIT_REF;

  let changed;
  try {
    changed = execSync(`git diff --name-only --diff-filter=AMD ${range} -- content`)
      .toString().trim().split("\n").filter(Boolean).filter(isPost);
  } catch {
    return console.log("bridgy: no git range, skipping");
  }
  if (!changed.length) return console.log("bridgy: no changed posts");

  for (const file of changed) {
    const source = toSource(file);
    const res = await fetch(BRIDGY_WEBMENTION, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ source, target: TARGET }),
    });
    console.log(`bridgy: ${source} -> ${res.status}`);
  }
};

const isPost = (f) =>
  f.endsWith(".md") &&
  !f.startsWith("content/site/") && // bio singletons aren't posts
  !f.includes("/webmentions/"); // incoming-mention sidecars

// Trailing slash to match the canonical URL Bridgy federates (bridgyOriginalUrl).
const toSource = (f) =>
  `${SITE}/${f.replace(/^content\//, "").replace(/\.md$/, "")}/`;
