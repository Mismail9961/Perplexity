export type Source = {
  id: number;
  title: string;
  url: string;
  domain: string;
  snippet: string;
};

export type Answer = {
  query: string;
  summary: string;
  sections: { heading: string; body: string }[];
  sources: Source[];
  related: string[];
};

export const trendingTopics = [
  { tag: "Tech & Science", title: "GPT-5 reportedly enters limited preview", image: "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=800&q=60" },
  { tag: "Finance", title: "Markets close mixed as Fed signals patience", image: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&q=60" },
  { tag: "Sports", title: "Champions League: surprise upsets in quarterfinals", image: "https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=800&q=60" },
  { tag: "Travel", title: "The 12 most underrated cities to visit in 2026", image: "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=800&q=60" },
  { tag: "Health", title: "New study links sleep regularity to longevity", image: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800&q=60" },
  { tag: "Culture", title: "A quiet revival of analog photography", image: "https://images.unsplash.com/photo-1495121605193-b116b5b9c5fe?w=800&q=60" },
];

export const suggestedQueries = [
  "Explain quantum entanglement simply",
  "Best espresso machines under $500",
  "How does a transformer model work?",
  "Plan a 7-day trip to Japan in spring",
  "Compare React Server Components vs SSR",
  "What is the carbon footprint of LLMs?",
];

export const mockAnswer = (query: string): Answer => ({
  query,
  summary:
    "Based on multiple sources, here is a concise synthesis of what is currently known. The information below is drawn from reputable publications and primary references, organized for clarity. Key facts and nuances are highlighted, with citations provided inline.",
  sections: [
    {
      heading: "Overview",
      body:
        "This topic sits at the intersection of several rapidly evolving fields. Recent developments have shifted the landscape considerably, especially over the past 12 months [1][2]. Most experts agree on the general direction, though specifics remain debated.",
    },
    {
      heading: "Key points",
      body:
        "• A clear set of trade-offs governs the practical decisions teams make today [3].\n• The leading approach has matured to the point of being production-ready for most use cases [1].\n• Costs continue to fall, while quality improves quarter over quarter [4].\n• Edge cases still benefit from a domain expert in the loop [2].",
    },
    {
      heading: "What to watch",
      body:
        "Expect further consolidation among major providers, additional open alternatives, and new tooling that abstracts much of the underlying complexity [5]. Regulation is the wild card and could reshape best practices within a year.",
    },
  ],
  sources: [
    { id: 1, title: "An overview of the current landscape", url: "https://example.com/overview", domain: "wired.com", snippet: "A concise primer on the state of the art and where it is headed next." },
    { id: 2, title: "Expert perspectives and nuances", url: "https://example.com/experts", domain: "nytimes.com", snippet: "Practitioners weigh in on the practical realities behind the headlines." },
    { id: 3, title: "Trade-offs in modern systems", url: "https://example.com/tradeoffs", domain: "acm.org", snippet: "A technical deep dive into the design choices and their implications." },
    { id: 4, title: "Cost and quality benchmarks", url: "https://example.com/benchmarks", domain: "arxiv.org", snippet: "Empirical results from a multi-quarter benchmark across providers." },
    { id: 5, title: "Outlook for the next 12 months", url: "https://example.com/outlook", domain: "economist.com", snippet: "Forecasts, risks and the regulatory backdrop shaping what comes next." },
  ],
  related: [
    `What are the best alternatives related to "${query}"?`,
    `How is "${query}" expected to change by 2030?`,
    `What are common misconceptions about "${query}"?`,
    `Who are the leading experts on "${query}"?`,
  ],
});

export const recentThreads = [
  { id: "t1", title: "Best practices for React Server Components", time: "2h ago" },
  { id: "t2", title: "How does CRISPR base editing work?", time: "Yesterday" },
  { id: "t3", title: "Compare Rust vs Go for backend services", time: "2d ago" },
  { id: "t4", title: "Itinerary: 10 days in Portugal", time: "Last week" },
  { id: "t5", title: "Explain the Mamba architecture", time: "Last week" },
];

export const spaces = [
  { id: "s1", name: "Research – LLM Agents", description: "Papers, posts and notes on agentic systems.", threads: 14, color: "from-cyan-500/30 to-teal-500/10" },
  { id: "s2", name: "Travel Planning", description: "Trips, itineraries and recommendations.", threads: 6, color: "from-fuchsia-500/30 to-rose-500/10" },
  { id: "s3", name: "Investing Notes", description: "Macro, equities and personal finance.", threads: 22, color: "from-emerald-500/30 to-lime-500/10" },
  { id: "s4", name: "Cooking Ideas", description: "Recipes and technique deep-dives.", threads: 9, color: "from-amber-500/30 to-orange-500/10" },
];