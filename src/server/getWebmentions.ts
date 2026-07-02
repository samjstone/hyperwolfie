import { WebmentionListSchema, type Webmention } from "../types/webmentions";

export async function getWebmentions(pageUrl: string): Promise<Webmention[]> {
  try {
    console.log("Fetching webmentions for:", pageUrl);
    const response = await fetch(
      `https://webmention.io/api/mentions.jf2?target=${pageUrl}/`
    );
    if (!response.ok) {
      throw new Error(`Response status: ${response.status}`);
    }

    const result = await response.json();
    return WebmentionListSchema.parse(result).children;
  } catch (error) {
    console.error(
      `Failed to load webmentions for ${pageUrl}:`,
      error instanceof Error ? error.message : error
    );
    return [];
  }
}
