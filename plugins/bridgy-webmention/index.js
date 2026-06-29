import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

const SITE = "https://hyperwolfie.com";
const TARGET = "https://fed.brid.gy/";
const TELEGRAPH = "https://telegraph.p3k.io/webmention";

// Netlify build plugin: when a post is ADDED under content/ and the author
// flagged it for syndication (mp-syndicate-to: https://fed.brid.gy/), ask
// Telegraph to send a webmention from the post URL to Bridgy Fed, which then
// federates it to the fediverse + Bluesky. One webmention per newly added post.
//
// Bridgy Fed one-way door: the first webmention it receives makes it STOP
// polling the RSS/Atom feed and expect webmentions for all future posts — so
// only the opted-in (mp-syndicate-to) posts will federate from then on.
export const onSuccess = async () => {
  const token = process.env.TELEGRAPH_TOKEN;
  if (!token) return console.log("bridgy: no TELEGRAPH_TOKEN, skipping");

  const { CACHED_COMMIT_REF, COMMIT_REF } = process.env;
  let added = [];
  try {
    const range = CACHED_COMMIT_REF ? `${CACHED_COMMIT_REF} ${COMMIT_REF}` : COMMIT_REF;
    added = execSync(`git diff --name-only --diff-filter=A ${range} -- content`)
      .toString().trim().split("\n")
      .filter((f) =>
        f.endsWith(".md") &&
        !f.startsWith("content/site/") &&  // bio singletons aren't posts
        !f.includes("/webmentions/")       // incoming-mention sidecars
      );
  } catch {
    return console.log("bridgy: no git range, skipping");
  }
  if (!added.length) return console.log("bridgy: no new posts");

  for (const file of added) {
    const fm = frontmatter(readFileSync(file, "utf8"));
    if (!/fed\.brid\.gy/.test(fm["mp-syndicate-to"] || "")) continue; // opt-in only
    if (fm.deleted === "true" || fm.draft === "true" ||
        fm["post-status"] === "draft" || fm.visibility === "private") continue;

    const source = `${SITE}/${file.replace(/^content\//, "").replace(/\.md$/, "")}`;
    const res = await fetch(TELEGRAPH, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ token, source, target: TARGET }),
    });
    console.log(`bridgy: ${source} -> ${res.status}${res.ok ? "" : " " + (await res.text())}`);
  }
};

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
