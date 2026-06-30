import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

const SITE = "https://hyperwolfie.com";
const TARGET = "https://fed.brid.gy/";
const BRIDGY_WEBMENTION = "https://fed.brid.gy/webmention";
const TELEGRAPH = "https://telegraph.p3k.io/webmention";

// Netlify build plugin. For every syndication-flagged post (mp-syndicate-to:
// https://fed.brid.gy/) added or modified in this deploy, ping Bridgy Fed with a
// webmention (source = post URL, target = fed.brid.gy). Bridgy refetches the
// source and decides what to do from the HTTP response:
//   - 200 + h-entry  -> federate / update the post on the fediverse + Bluesky
//   - 404 / 410      -> delete the bridged copy everywhere
//
// So one rule — "ping when a syndicated post changes" — covers add, edit, and
// delete. To delete, mark a post `deleted: true` (don't remove the file): the
// route stops building it, so it 404s, which is the delete signal.
//
// Live posts go through Telegraph (it validates + relays the 200 source).
// Deletes can't: Telegraph fetches the source first, and a 404 fails its
// validation — so deletes are sent straight to Bridgy Fed, which needs no token.
//
// Bridgy Fed one-way door: the first webmention it receives makes it STOP
// polling the RSS/Atom feed and expect webmentions for all future posts.
export const onSuccess = async () => {
  const { CACHED_COMMIT_REF, COMMIT_REF } = process.env;
  if (!COMMIT_REF) return console.log("bridgy: no COMMIT_REF, skipping");
  const range = CACHED_COMMIT_REF ? `${CACHED_COMMIT_REF} ${COMMIT_REF}` : COMMIT_REF;

  // Added or modified posts; the file still exists, so read current frontmatter.
  // `deleted: true` (or draft/private) reads as gone -> delete ping.
  for (const file of diff(range, "AM")) {
    const fm = frontmatter(readFileSync(file, "utf8"));
    if (!isSyndicated(fm)) continue;
    await ping(toSource(file), isGone(fm) ? "delete" : "live");
  }
};

const isPost = (f) =>
  f.endsWith(".md") &&
  !f.startsWith("content/site/") && // bio singletons aren't posts
  !f.includes("/webmentions/"); // incoming-mention sidecars

// Trailing slash to match the canonical URL Bridgy federates (bridgyOriginalUrl).
const toSource = (f) =>
  `${SITE}/${f.replace(/^content\//, "").replace(/\.md$/, "")}/`;

const isSyndicated = (fm) => /fed\.brid\.gy/.test(fm["mp-syndicate-to"] || "");

// Not routable -> the page 404s -> Bridgy should delete (mirrors isPublished()).
const isGone = (fm) =>
  fm.deleted === "true" ||
  fm.draft === "true" ||
  fm["post-status"] === "draft" ||
  fm.visibility === "private";

function diff(range, filter) {
  try {
    return execSync(`git diff --name-only --diff-filter=${filter} ${range} -- content`)
      .toString().trim().split("\n").filter(Boolean).filter(isPost);
  } catch {
    return [];
  }
}

async function ping(source, mode) {
  if (mode === "delete") {
    const res = await fetch(BRIDGY_WEBMENTION, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ source, target: TARGET }),
    });
    console.log(`bridgy(delete): ${source} -> ${res.status}`);
    return;
  }

  const token = process.env.TELEGRAPH_TOKEN;
  if (!token) return console.log(`bridgy(live): no TELEGRAPH_TOKEN, skip ${source}`);
  const res = await fetch(TELEGRAPH, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ token, source, target: TARGET }),
  });
  console.log(`bridgy(live): ${source} -> ${res.status}${res.ok ? "" : " " + (await res.text())}`);
}

// minimal "key: value" frontmatter scan — enough for the flags above
function frontmatter(raw) {
  const m = raw.match(/^---\n([\s\S]*?)\n---/);
  const out = {};
  if (m) for (const line of m[1].split("\n")) {
    const kv = line.match(/^([\w-]+):\s*['"]?(.*?)['"]?\s*$/);
    if (kv) out[kv[1]] = kv[2];
  }
  return out;
}
