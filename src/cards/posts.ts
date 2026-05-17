// Registry of all card posts. Add a new post by dropping a TS file in
// src/cards/posts/ that default-exports a Post, then import it here.

import sportsConfidenceTest from "./posts/sports-confidence-test";
import techInternetIsSplit from "./posts/tech-the-internet-is-split";
import cultureBetYouCant from "./posts/culture-bet-you-cant";
import type { Post } from "./types";

export const posts: Post[] = [
  sportsConfidenceTest,
  techInternetIsSplit,
  cultureBetYouCant,
];

export function getPostBySlug(slug: string): Post | undefined {
  return posts.find((p) => p.slug === slug);
}
