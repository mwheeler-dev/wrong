import type { Post } from "../types";

const post: Post = {
  slug: "tech-the-internet-is-split",
  title: "Tech — the internet is split",
  notes: "Aimed at the dev / AI / gaming side. Tension-heavy.",
  slides: [
    {
      type: "hook",
      text: "The internet is split on these predictions.",
      kicker: "All within 10 points",
    },
    {
      type: "prediction",
      category: "Tech",
      question: "Will GTA 6 get delayed again?",
      yesPct: 61,
      noPct: 39,
    },
    {
      type: "prediction",
      category: "Tech",
      question: "Will OpenAI announce a new model before month-end?",
      yesPct: 54,
      noPct: 46,
    },
    {
      type: "prediction",
      category: "Tech",
      question: "Will Apple ship a Vision-style headset under $1,500 this year?",
      yesPct: 22,
      noPct: 78,
    },
    {
      type: "prediction",
      category: "Tech",
      question: "Will a major US bank ban an AI tool internally this year?",
      yesPct: 49,
      noPct: 51,
    },
    {
      type: "prediction",
      category: "Tech",
      question: "Will Tesla announce a new vehicle in the next 30 days?",
      yesPct: 33,
      noPct: 67,
    },
    {
      type: "cta",
      text: "Predict the future on Wrong.",
      subtext: "Wrong.",
    },
  ],
};

export default post;
