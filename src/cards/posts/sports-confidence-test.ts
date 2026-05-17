import type { Post } from "../types";

const post: Post = {
  slug: "sports-confidence-test",
  title: "Sports confidence test",
  notes: "Mid-season pace — aimed at sports-podcast lurkers",
  slides: [
    {
      type: "hook",
      text: "You probably shouldn't talk sports if you miss these.",
      kicker: "Only 3% get them all right",
    },
    {
      type: "prediction",
      category: "Sports",
      question: "Will the Lakers win their next scheduled game?",
      yesPct: 44,
      noPct: 56,
      source: "n = 1,432",
    },
    {
      type: "prediction",
      category: "Sports",
      question: "Will the Yankees make the World Series this year?",
      yesPct: 38,
      noPct: 62,
    },
    {
      type: "prediction",
      category: "Sports",
      question: "Will LeBron retire after next season?",
      yesPct: 44,
      noPct: 56,
    },
    {
      type: "prediction",
      category: "Sports",
      question: "Will the Premier League leader change this weekend?",
      yesPct: 27,
      noPct: 73,
    },
    {
      type: "prediction",
      category: "Sports",
      question: "Will any NFL coach get fired in the next 14 days?",
      yesPct: 71,
      noPct: 29,
    },
    {
      type: "cta",
      text: "See how wrong you really are.",
      subtext: "Wrong.",
    },
  ],
};

export default post;
