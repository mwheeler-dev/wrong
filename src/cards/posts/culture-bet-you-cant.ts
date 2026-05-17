import type { Post } from "../types";

const post: Post = {
  slug: "culture-bet-you-cant",
  title: "Culture — bet you can't",
  notes: "Pop-culture pace. Aim for the obvious-but-not crowd.",
  slides: [
    {
      type: "hook",
      text: "Bet you can't predict these correctly.",
      kicker: "Most people get 2 of 5",
    },
    {
      type: "prediction",
      category: "Entertainment",
      question: "Will the #1 movie this weekend earn over $50M?",
      yesPct: 41,
      noPct: 59,
    },
    {
      type: "prediction",
      category: "Culture",
      question: "Will Taylor Swift drop new content in the next 48 hours?",
      yesPct: 68,
      noPct: 32,
    },
    {
      type: "prediction",
      category: "Entertainment",
      question: "Will the Billboard #1 song change this week?",
      yesPct: 36,
      noPct: 64,
    },
    {
      type: "prediction",
      category: "Culture",
      question: "Will an AI-generated image trend on X this week?",
      yesPct: 81,
      noPct: 19,
    },
    {
      type: "prediction",
      category: "Entertainment",
      question: "Will any major streaming service announce a price change this month?",
      yesPct: 47,
      noPct: 53,
    },
    {
      type: "cta",
      text: "Your predictions are waiting.",
      subtext: "Wrong.",
    },
  ],
};

export default post;
