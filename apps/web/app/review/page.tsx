import type { Metadata } from "next";
import { isTag, tagsWithContent } from "@synapse/core/content";
import { ReviewSession } from "@/components/review/ReviewSession";

export const metadata: Metadata = { title: "Review" };

/**
 * /review (optional ?tag=sliding_window): the iMessage loop in the browser.
 * searchParams is a Promise in Next 16; the session is keyed by tag so
 * switching patterns starts a fresh session.
 */
export default async function ReviewPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const raw = Array.isArray(params.tag) ? params.tag[0] : params.tag;
  const value = raw?.trim() || undefined;
  const tag = value && isTag(value) ? value : undefined;
  const invalidTag = value && !tag ? value : undefined;

  return <ReviewSession key={tag ?? "all"} tag={tag} invalidTag={invalidTag} tagOptions={tagsWithContent()} />;
}
