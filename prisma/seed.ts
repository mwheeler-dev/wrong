import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function daysFromNow(days: number) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return d;
}

const questions = [
  {
    text: "Will the S&P 500 close higher than it opened today?",
    category: "Business",
    resolutionCriteria: "Compares official S&P 500 open vs close on the U.S. trading day matching publish date.",
    sourceUrl: "https://www.google.com/finance/quote/.INX:INDEXSP",
  },
  {
    text: "Will SpaceX complete a successful orbital launch in the next 7 days?",
    category: "Science",
    resolutionCriteria: "Any SpaceX orbital launch reaching nominal orbit between publish and resolution date.",
    sourceUrl: "https://www.spacex.com/launches/",
  },
  {
    text: "Will OpenAI announce a new model before the end of this month?",
    category: "Tech",
    resolutionCriteria: "Public announcement of a new model on openai.com or official social channels by month-end.",
  },
  {
    text: "Will the top movie at the domestic box office this weekend earn over $50M?",
    category: "Entertainment",
    resolutionCriteria: "Weekend domestic gross of #1 film as reported by Box Office Mojo.",
    sourceUrl: "https://www.boxofficemojo.com/",
  },
  {
    text: "Will the New York Yankees win their next scheduled MLB game?",
    category: "Sports",
    resolutionCriteria: "Final score of the next regular-season Yankees game.",
  },
  {
    text: "Will Bitcoin close above $70,000 USD seven days from now?",
    category: "Business",
    resolutionCriteria: "BTC/USD daily close on Coinbase on the resolution date.",
    sourceUrl: "https://www.coinbase.com/price/bitcoin",
  },
  {
    text: "Will a major U.S. political party leader make news on cable TV today?",
    category: "Politics",
    resolutionCriteria: "Any segment featuring a top-four congressional leader on CNN, Fox News, or MSNBC during U.S. evening prime time.",
  },
  {
    text: "Will Apple's stock close higher than its previous close today?",
    category: "Business",
    resolutionCriteria: "AAPL daily close vs previous close on Nasdaq.",
    sourceUrl: "https://www.google.com/finance/quote/AAPL:NASDAQ",
  },
  {
    text: "Will Taylor Swift post on Instagram in the next 48 hours?",
    category: "Culture",
    resolutionCriteria: "Any new public post on @taylorswift Instagram within 48 hours of publish.",
  },
  {
    text: "Will the UN Secretary-General make a public statement this week?",
    category: "World",
    resolutionCriteria: "Any official press release or remarks from the UN Secretary-General between publish and resolution date.",
    sourceUrl: "https://www.un.org/sg/en",
  },
  {
    text: "Will a new peer-reviewed paper on CRISPR be published this week?",
    category: "Science",
    resolutionCriteria: "Any indexed peer-reviewed publication mentioning CRISPR appearing on PubMed in the resolution window.",
    sourceUrl: "https://pubmed.ncbi.nlm.nih.gov/",
  },
  {
    text: "Will Tesla announce any product update or event before the end of next week?",
    category: "Tech",
    resolutionCriteria: "Any official Tesla announcement on tesla.com or @tesla account about a product or event.",
  },
  {
    text: "Will the LA Lakers win their next scheduled game?",
    category: "Sports",
    resolutionCriteria: "Final score of the next regular-season Lakers game.",
  },
  {
    text: "Will a major streaming service announce a price change this month?",
    category: "Business",
    resolutionCriteria: "Any official price-change announcement from Netflix, Disney+, Hulu, Max, or Prime Video.",
  },
  {
    text: "Will a top-10 Billboard Hot 100 song change its #1 spot this week?",
    category: "Entertainment",
    resolutionCriteria: "Compare Billboard Hot 100 #1 between publish and resolution date.",
    sourceUrl: "https://www.billboard.com/charts/hot-100/",
  },
  {
    text: "Will a U.S. Supreme Court ruling be issued in the next 14 days?",
    category: "Politics",
    resolutionCriteria: "Any opinion or order issued via supremecourt.gov in the resolution window.",
    sourceUrl: "https://www.supremecourt.gov/",
  },
  {
    text: "Will Google announce anything related to Gemini in the next 7 days?",
    category: "Tech",
    resolutionCriteria: "Any official Google blog or @Google announcement mentioning Gemini.",
    sourceUrl: "https://blog.google/",
  },
  {
    text: "Will the Premier League leader change in the next match round?",
    category: "Sports",
    resolutionCriteria: "Compare league table top spot before and after the next round of fixtures.",
    sourceUrl: "https://www.premierleague.com/tables",
  },
  {
    text: "Will any country hold a national election in the next 30 days?",
    category: "World",
    resolutionCriteria: "Any sovereign national-level election held within 30 days of publish.",
  },
  {
    text: "Will a viral meme involving an AI image trend on X this week?",
    category: "Culture",
    resolutionCriteria: "An AI-generated image post reaching 1M+ views on X between publish and resolution date.",
  },
  {
    text: "Will a Fortune 500 company announce layoffs this week?",
    category: "Business",
    resolutionCriteria: "Any Fortune 500 firm publicly announcing workforce reductions in the resolution window.",
  },
  {
    text: "Will NASA share a new image or video from a current mission this week?",
    category: "Science",
    resolutionCriteria: "Any official NASA post about ongoing mission imagery on nasa.gov or @NASA.",
    sourceUrl: "https://www.nasa.gov/",
  },
];

async function main() {
  // For demo purposes: publish today, resolve in 3 days
  const publishDate = daysFromNow(0);
  const resolutionDate = daysFromNow(3);

  for (const q of questions) {
    await prisma.question.create({
      data: {
        text: q.text,
        category: q.category,
        resolutionCriteria: q.resolutionCriteria,
        sourceUrl: q.sourceUrl ?? null,
        status: "PENDING",
        correctAnswer: null,
        publishDate,
        resolutionDate,
      },
    });
  }

  console.log(`Seeded ${questions.length} questions.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
