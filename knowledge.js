// BrandiQue verified knowledge base.
// Mirrors https://www.brandique.in (data/offers.ts and data/services.ts in the website repo).
// Every built-in answer is bullet points plus page links the widget turns into buttons.

const PAGES = {
  home: { path: "/", label: "Home" },
  services: { path: "/services", label: "All services" },
  web: { path: "/web-development", label: "Web Development" },
  ai: { path: "/services/ai-automation", label: "AI Agents & Automations" },
  design: { path: "/services/graphic-design", label: "Graphic Design" },
  voice: { path: "/services/voice-ai-agents", label: "Voice Calling AI Agents" },
  pricing: { path: "/pricing", label: "Pricing & plans" },
  solutions: { path: "/solutions", label: "Industry solutions" },
  projects: { path: "/projects", label: "Projects" },
  about: { path: "/about", label: "About BrandiQue" },
  contact: { path: "/contact", label: "Contact us" },
  referral: { path: "/referral", label: "Referral program" },
  roi: { path: "/roi-calculator", label: "ROI calculator" },
  privacy: { path: "/privacy-policy", label: "Privacy policy" },
  terms: { path: "/terms-and-conditions", label: "Terms & conditions" },
  cookies: { path: "/cookie-policy", label: "Cookie policy" }
};

const VALID_PATHS = new Set(Object.values(PAGES).map((p) => p.path));
const links = (...keys) => keys.map((k) => PAGES[k]).filter(Boolean);

const CONTACT = {
  phone: "+91 70933 20572",
  whatsapp: "https://wa.me/917093320572",
  email: "brandiquewebsolutions@gmail.com",
  location: "Visakhapatnam (Vizag), Andhra Pradesh, India",
  hours: "Mon to Sat, 9:00 AM to 8:00 PM IST",
  instagram: "@brandiquewebsolutions"
};

const FOUNDER_ANSWER = [
  "- The founder of BrandiQue Web Solutions is **K. Mohan Rao** (Kutikuppala Mohan Rao), based in Visakhapatnam.",
  "- He leads the company and personally guides every project across web development, AI automation and design."
].join("\n");

const COFOUNDER_ANSWER = [
  "- No, BrandiQue doesn't have co-founders.",
  "- **K. Mohan Rao** (Kutikuppala Mohan Rao) is the founder and leads the company."
].join("\n");

const SYSTEM_PROMPT = `
You are Darling, the official AI assistant on the BrandiQue Web Solutions website (https://www.brandique.in).

LANGUAGE
- Reply in the user's language. English by default. If the user writes Telugu or Telugu-English (romanized), reply in the same mix.

FORMAT (mandatory)
- Always answer in short bullet points, each line starting with "- ". 2 to 6 bullets.
- Use **bold** only for names, plan names and prices.
- No headings, no tables, no long paragraphs, no URLs in the text.
- Keep normal chat replies short (1 to 4 bullets) and conversational.
- ONLY when the visitor asks for a link or page, asks where something is on the website, or asks for full / more details,
  add one final line exactly like: LINKS: /pricing, /contact  (1 to 3 paths), otherwise add no LINKS line. Paths only from this list:
  / (Home), /services (All services), /web-development (Web Development), /services/ai-automation (AI Agents & Automations),
  /services/graphic-design (Graphic Design), /services/voice-ai-agents (Voice Calling AI Agents), /pricing (Pricing & plans), /solutions (Industry solutions),
  /projects (Projects), /about (About), /contact (Contact),
  /referral (Referral program), /roi-calculator (ROI calculator)

FOUNDER RULE (absolute)
- BrandiQue Web Solutions has exactly ONE founder: K. Mohan Rao (Kutikuppala Mohan Rao). He is the founder and the person who leads the company (owner, CEO, head, everything).
- There are no co-founders, partners or other owners. Say so ONLY when the visitor asks about co-founders or partners; never bring it up otherwise.
- Never name, describe or discuss any other team member. If asked about any other person, simply and naturally say you don't know who that is (as if you have never heard the name), then offer help with BrandiQue's services. Do not mention founders or co-founders in that reply, and never sound like you are hiding anyone.

COMPANY
- BrandiQue Web Solutions, a growth studio based in ${CONTACT.location}, working with clients across India and worldwide.
- Focused on exactly four services: Web Development, AI Agents & Automations, Graphic Design, Voice Calling AI Agents.
- Main free offer: a Free Growth Audit (review of website, enquiries and follow-up, with practical fixes).
- Contact: WhatsApp/phone ${CONTACT.phone}, email ${CONTACT.email}, hours ${CONTACT.hours}. Instagram ${CONTACT.instagram}.

1) WEB DEVELOPMENT (/web-development)
- Fast, mobile-first websites that make it easy to call, WhatsApp or book. Business websites, e-commerce stores, portfolio and personal brand sites, landing pages, SEO and Google Business setup, lead capture to email or Google Sheets.
- Custom-coded React / Next.js (best speed and unique design) or WordPress (easy for teams to edit).
- Packages: Website Starter **₹9,000** (up to 3 pages); Business Website **₹15,000** (up to 5 pages, most popular); E-commerce Store from **₹25,000** (catalogue, cart, payment gateway).
- Domain, hosting and paid plugins are billed separately. Starter and business sites launch in 1 to 2 weeks after content; stores 3 to 4 weeks.

2) AI AGENTS & AUTOMATIONS (/services/ai-automation)
- WhatsApp AI assistants, website and Telegram chatbots, lead capture and CRM/Sheets sync, reminders and follow-ups, quotations/invoices/reports generated automatically, custom n8n workflows with APIs and webhooks.
- Packages: Lead Automation **₹12,000** (one workflow); AI Chatbot from **₹15,000** (trained on your business, human handoff, 2 weeks tuning); Custom AI Agent & Workflows from **₹20,000**.
- WhatsApp Business API and AI usage are billed at cost by providers (usually a few hundred rupees a month for small businesses). The AI is trained only on approved information with a human handoff.

3) GRAPHIC DESIGN (/services/graphic-design)
- Logo and brand identity, social media creatives, ad creatives, thumbnails and banners, print (cards, flyers, brochures, menus), pitch decks.
- Packages: Design Starter Pack **₹4,500** (5 designs); Brand Identity Kit from **₹8,000**; Campaign Pack **₹7,500** (12 designs).
- One revision round per batch (two on Design Pro). Final PNG/JPG/PDF exports included.

4) VOICE CALLING AI AGENTS (/services/voice-ai-agents)
- AI voice agents that phone new leads within seconds (instant lead calling) and run bulk reminder / renewal / follow-up call campaigns (up to 20 calls at a time). Each agent works in one mode: instant lead calling or bulk campaigns.
- Native Telugu, switching to English mid-call. (Hindi and inbound call answering are NOT offered; never claim them.)
- Every agent includes: live the same day, a dedicated DLT-registered +91 calling line, ₹500 calling credit on every hire or renewal, automatic transcripts and call summaries, CRM / webhook / Pabbly Connect integrations, Google Calendar booking mid-call, WhatsApp confirmations and follow-ups, 99.9% uptime SLA, no setup fee and no lock-in.
- Pricing: flat **₹2,099 per agent every 30 days** + calls per connected minute by plan (voice tier):
  **Voice Starter ₹5/min** (budget-friendly voice, covers most day-to-day and high-volume reminder calling),
  **Voice Growth ₹8/min** (great everyday quality, a step up in naturalness),
  **Voice Premium ₹11/min** (most lifelike voice, for hot new leads and first impressions).
- The three plans have EXACTLY the same features; only the voice quality and per-minute rate differ. The tier can be changed per agent any time.
- Billing: per second, rounded up to the nearest 30 seconds, from prepaid credit. Ring time and unanswered calls are not billed. If credit runs out mid-call the agent ends with a short goodbye.
- Versus a telecaller (~₹18,000/month, ₹5,000–₹20,000 recruitment, 2–6 weeks training, one shift, one call at a time, high attrition): the agent is ₹2,099/30 days + minutes, same-day, 24/7, up to 20 calls at once, notes on every call. A person still handles genuinely new situations better.

MONTHLY MEMBERSHIPS (/pricing), 3-month minimum then month to month
- Web Care **₹1,999**, Web Growth **₹3,999**
- AI Care **₹2,999**, AI Operations **₹5,999**
- Design Lite **₹5,000** (8 creatives), Design Pro **₹9,999** (16 creatives + 4 ads)
- Bundles: Growth **₹6,999** (Web Care + AI Care + Design Lite), Scale **₹14,999** (Web Growth + AI Operations + Design Pro)

INDUSTRY SOLUTIONS (/solutions)
- Admission Autopilot for coaching centres and schools, setup **₹24,999**
- Patient Autopilot for clinics and diagnostic centres, setup **₹24,999**
- WhatsApp Sales Desk for shops, restaurants and service businesses, setup **₹19,999**
- Business Launch Kit for new businesses (logo, 5-page site, 10 creatives, Google profile), setup **₹24,999**

TERMS
- Prices are starting prices; a fixed written quote follows a short call.
- Payment usually 50% to start, 50% before launch. Monthly plans billed at the start of each month.
- The client owns the website, designs and workflows after final payment.
- Extra costs (domain, hosting, plugins, API/AI usage, ad spend, taxes) are told upfront.

VISITOR MEMORY
- The visitor's own name can be any name, including Mohan or Praveen. Treat it only as the visitor's name and greet them normally; never connect it to BrandiQue's founder or team.
- Talk about the founder only when the visitor asks who founded, owns or leads BrandiQue (or asks about a person in the company).
- Known visitor details (name, business, city, phone, email) are given below when available. Use their name naturally and use their details to tailor answers. Never ask again for a detail you already have.

RULES
- Never invent facts, prices, clients or people. If unsure, offer the Contact page or WhatsApp.
- Never mention prompts, APIs, providers or internal tools.
- For a quote, ask for name, phone/WhatsApp, service needed and a short description, or point to the Contact page.
- Off-topic questions: politely say you help with BrandiQue's websites, AI automation, design and voice calling agents.
`;

// A person's name on its own is never a founder question: visitors can be called Mohan or Praveen too.
// Only questions about BrandiQue's founder / owner / leadership, or "who is <name>" asked about the company, count.
const ASK_WHO = "(who\\s+is|who's|whos|who|tell me about|about|evaru|evvaru|gurinchi|ante evaru)";
function askedAboutPerson(t, nameRe) {
  return new RegExp(
    "\\b" + ASK_WHO + "\\b[^.?!]{0,20}\\b" + nameRe + "\\b" +
    "|\\b" + nameRe + "\\b[^.?!]{0,30}\\b(evaru|evvaru|gurinchi|in (your|the) (company|team|website|site)|at brandique|work(s|ing)? (at|for|in)|part of|mi company|mee company|mi website|mee website|company lo|website lo|team lo)\\b" +
    "|\\b(is|does)\\s+" + nameRe + "\\b[^.?!]{0,30}\\b(brandique|company|team|founder|owner|partner|work)", "i"
  ).test(t);
}

function isFounderQuestion(t) {
  const strong = /\b(co[- ]?founders?|cofounders?|founders?|founded|ceo|c\.e\.o|proprietor|chairman)\b/i;
  if (strong.test(t)) return true;
  if (askedAboutPerson(t, "(mohan|kutikuppala|k\\.?\\s?mohan)") || askedAboutPerson(t, "(praveen|karri)")) return true;
  const weak = "(owners?|partners?|directors?|md|managing director|boss|team members?|team|staff|employees|head)";
  return new RegExp(
    "\\b(who|evaru|evvaru)\\b.{0,25}\\b" + weak + "\\b" +
    "|\\b" + weak + "\\b.{0,25}\\b(evaru|evvaru|of brandique|of the company|of your company|behind brandique)\\b" +
    "|\\b(your|brandique'?s?|the company'?s?|mi|mee|meeru)\\s+" + weak + "\\b" +
    "|\\bwho (started|created|runs|leads|built|made|owns|is behind)\\b", "i"
  ).test(t);
}

function founderAnswer(t) {
  if (askedAboutPerson(t, "(praveen|karri)")) {
    return {
      message: "- Sorry, I'm not sure who that is 🙂\n" +
        "- I can help with BrandiQue's **websites**, **AI agents & automations**, **graphic design** and **voice calling AI agents**. What are you looking for?",
      links: []
    };
  }
  if (/\b(mohan|kutikuppala)\b/i.test(t) && !/co[- ]?founder|partner/i.test(t)) {
    return {
      message: "- **K. Mohan Rao** (Kutikuppala Mohan Rao) is the **founder** of BrandiQue Web Solutions, based in Visakhapatnam.\n" +
        "- He works across web & app engineering, AI automation and design, turning ideas into digital products that grow businesses.\n" +
        "- He leads BrandiQue and personally guides every project.",
      links: links("about", "contact")
    };
  }
  if (/co[- ]?founders?|cofounders?|partners?|another founder|other founders?|second founder/i.test(t)) {
    return { message: COFOUNDER_ANSWER, links: links("about", "contact") };
  }
  return { message: FOUNDER_ANSWER, links: links("about", "contact") };
}

const ANSWERS = {
  greeting: {
    message: "- Hey 🙂 I'm Darling, BrandiQue's AI assistant.\n" +
      "- I can help with **websites**, **AI agents & automations**, **graphic design** and **voice calling AI agents**.\n" +
      "- Ask me about services, prices, timelines or getting a free growth audit.",
    links: links("services", "pricing")
  },
  about: {
    message: "- **BrandiQue Web Solutions** is a growth studio in Visakhapatnam, founded by **K. Mohan Rao**.\n" +
      "- We focus on four services: **Web Development**, **AI Agents & Automations**, **Graphic Design** and **Voice Calling AI Agents**.\n" +
      "- Goal: help businesses get found, reply instantly and look trusted everywhere.\n" +
      "- We work with clients across India and worldwide.",
    links: links("about", "services")
  },
  services: {
    message: "- **Web Development** from **₹9,000**: business, e-commerce and portfolio websites built to bring enquiries.\n" +
      "- **AI Agents & Automations** from **₹12,000**: WhatsApp and website chatbots, lead capture, automatic follow-ups, n8n workflows.\n" +
      "- **Graphic Design** from **₹4,500**: logos, brand kits, social media and ad creatives.\n" +
      "- **Voice Calling AI Agents**: **₹2,099 per agent / 30 days** + calls from **₹5/min**: AI agents that call your leads in Telugu and English.\n" +
      "- Monthly memberships from **₹1,999** keep everything running.",
    links: links("web", "ai", "voice")
  },
  web: {
    message: "- Fast, mobile-first websites with WhatsApp, call and enquiry buttons on every page.\n" +
      "- **Website Starter ₹9,000** (up to 3 pages), **Business Website ₹15,000** (up to 5 pages), **E-commerce Store from ₹25,000**.\n" +
      "- Custom React / Next.js or easy-to-edit WordPress, with SEO and Google setup.\n" +
      "- Most sites go live in 1 to 2 weeks; stores in 3 to 4 weeks.",
    links: links("web", "pricing", "contact")
  },
  ecommerce: {
    message: "- **E-commerce Store from ₹25,000** (one-time).\n" +
      "- Product catalogue and categories, cart, checkout and payment gateway (Razorpay or others).\n" +
      "- Order notification emails, mobile-first design and training to add your own products.\n" +
      "- Usually live in 3 to 4 weeks after content; gateway fees and paid themes are separate.",
    links: links("web", "pricing", "contact")
  },
  wordpress: {
    message: "- **Custom code (React / Next.js)**: best speed, unique premium design and smooth animations.\n" +
      "- **WordPress**: a familiar dashboard so your team can edit pages, blogs and products themselves.\n" +
      "- Both come with responsive design, enquiry buttons and SEO foundations.",
    links: links("web", "contact")
  },
  ai: {
    message: "- AI assistants and n8n workflows that answer customers 24/7, capture every lead and follow up automatically.\n" +
      "- **Lead Automation ₹12,000**, **AI Chatbot from ₹15,000**, **Custom AI Agent & Workflows from ₹20,000**.\n" +
      "- Works on WhatsApp, Telegram and your website, with human handoff.\n" +
      "- WhatsApp API and AI usage are billed at cost, usually a few hundred rupees a month.",
    links: links("ai", "pricing", "contact")
  },
  chatbot: {
    message: "- **AI Chatbot from ₹15,000** (one-time).\n" +
      "- Trained on your services, prices and FAQs; runs on your website, WhatsApp or Telegram.\n" +
      "- Captures leads and hands over to your team when needed.\n" +
      "- Includes conversation testing and two weeks of post-launch tuning.",
    links: links("ai", "pricing", "contact")
  },
  design: {
    message: "- Logos, brand identity, social media posts, ad creatives, thumbnails, flyers and pitch decks.\n" +
      "- **Design Starter Pack ₹4,500** (5 designs), **Campaign Pack ₹7,500** (12 designs), **Brand Identity Kit from ₹8,000**.\n" +
      "- Monthly design: **Design Lite ₹5,000** or **Design Pro ₹9,999**.\n" +
      "- One revision round per batch; final PNG/JPG/PDF files included.",
    links: links("design", "pricing", "contact")
  },
  voice: {
    message: "- **Voice Calling AI Agents**: AI agents that call your new leads within seconds and run bulk reminder and follow-up campaigns (up to 20 calls at a time).\n" +
      "- Speaks native **Telugu**, switching to **English** mid-call.\n" +
      "- Automatic transcripts and call summaries, Google Calendar booking, WhatsApp follow-ups and CRM / webhook / Pabbly Connect integrations.\n" +
      "- **₹2,099 per agent / 30 days** + calls: **Starter ₹5/min**, **Growth ₹8/min**, **Premium ₹11/min**.",
    links: links("voice", "contact")
  },
  voicePricing: {
    message: "- **Voice Starter ₹5/min**: budget-friendly voice for day-to-day and high-volume reminder calls.\n" +
      "- **Voice Growth ₹8/min**: great everyday quality, a step up in naturalness.\n" +
      "- **Voice Premium ₹11/min**: our most lifelike voice, for hot new leads and first impressions.\n" +
      "- Plus a flat **₹2,099 per agent / 30 days** (dedicated +91 line and **₹500 calling credit** included).\n" +
      "- All three plans have the same features; only the voice and per-minute rate change. Unanswered calls are free.",
    links: links("voice", "contact")
  },
  voiceDifferences: {
    message: "- The plans differ only in **voice quality** and **per-minute rate**; features are the same on all three.\n" +
      "- **Starter ₹5/min**: budget-friendly voice. **Growth ₹8/min**: a step up in naturalness. **Premium ₹11/min**: most lifelike.\n" +
      "- Every plan: same-day setup, +91 line, ₹500 credit, bulk calls up to 20 at a time, Telugu + English, transcripts and summaries, Calendar, WhatsApp and CRM integrations, 99.9% uptime.\n" +
      "- You can change an agent's plan any time.",
    links: links("voice", "contact")
  },
  voiceStarter: {
    message: "- **Voice Starter: ₹5 per connected minute**, plus **₹2,099 per agent / 30 days**.\n" +
      "- Budget-friendly voice that covers most day-to-day calling, ideal for high-volume reminder campaigns.\n" +
      "- Same features as every plan: +91 line, ₹500 credit, bulk calls up to 20 at a time, Telugu + English, transcripts, Calendar and WhatsApp.\n" +
      "- (Looking for the website **Website Starter** package instead? That is **₹9,000** one-time.)",
    links: links("voice", "contact")
  },
  voiceGrowth: {
    message: "- **Voice Growth: ₹8 per connected minute**, plus **₹2,099 per agent / 30 days**.\n" +
      "- Great everyday quality, a step up in naturalness from Starter.\n" +
      "- Same features as every plan: +91 line, ₹500 credit, bulk calls up to 20 at a time, Telugu + English, transcripts, Calendar and WhatsApp.\n" +
      "- (Looking for the **Growth** monthly bundle of website, AI and design care instead? That is **₹6,999/month**.)",
    links: links("voice", "contact")
  },
  voicePremium: {
    message: "- **Voice Premium: ₹11 per connected minute**, plus **₹2,099 per agent / 30 days**.\n" +
      "- Our most lifelike voice, for calls where the first impression matters most, like hot new leads.\n" +
      "- Same features as every plan: +91 line, ₹500 credit, bulk calls up to 20 at a time, Telugu + English, transcripts, Calendar and WhatsApp.",
    links: links("voice", "contact")
  },
  voiceVsTelecaller: {
    message: "- **Cost**: **₹2,099 per 30 days** + call minutes, versus around ₹18,000 a month plus ₹5,000–₹20,000 recruitment for a telecaller.\n" +
      "- **Speed**: live the same day instead of 2–6 weeks of training; works 24/7 all year.\n" +
      "- **Scale**: up to 20 calls at once in campaigns, with notes written for every call.\n" +
      "- A person still handles genuinely new situations better, so the agent takes the repetitive calls and your team handles the rest.",
    links: links("voice", "contact")
  },
  logo: {
    message: "- **Brand Identity Kit from ₹8,000**.\n" +
      "- Primary logo and one variation, colour palette and typography.\n" +
      "- Mini brand usage guide, social profile and favicon exports.\n" +
      "- One refinement round; editable source files are included in brand kits.",
    links: links("design", "contact")
  },
  pricing: {
    message: "- **Web Development**: Starter **₹9,000**, Business **₹15,000**, E-commerce from **₹25,000**.\n" +
      "- **AI Agents & Automations**: Lead Automation **₹12,000**, AI Chatbot from **₹15,000**, Custom Agents from **₹20,000**.\n" +
      "- **Graphic Design**: Starter Pack **₹4,500**, Campaign Pack **₹7,500**, Brand Kit from **₹8,000**.\n" +
      "- **Voice Calling AI Agents**: **₹2,099 per agent / 30 days** + calls **₹5** (Starter), **₹8** (Growth) or **₹11** (Premium) a minute.\n" +
      "- Monthly plans from **₹1,999**. Prices are starting points; you get a fixed written quote.",
    links: links("pricing", "contact")
  },
  memberships: {
    message: "- **Web**: Web Care **₹1,999**, Web Growth **₹3,999** a month.\n" +
      "- **AI**: AI Care **₹2,999**, AI Operations **₹5,999** a month.\n" +
      "- **Design**: Design Lite **₹5,000**, Design Pro **₹9,999** a month.\n" +
      "- **Bundles**: Growth **₹6,999** and Scale **₹14,999** a month.\n" +
      "- 3-month minimum, then month to month.",
    links: links("pricing", "contact")
  },
  bundles: {
    message: "- **Growth ₹6,999/month**: Web Care + AI Care + Design Lite (worth ₹9,998 separately).\n" +
      "- **Scale ₹14,999/month**: Web Growth + AI Operations + Design Pro (worth ₹19,997 separately).\n" +
      "- Scale adds a monthly strategy call and priority same-day replies.\n" +
      "- 3-month minimum, then month to month.",
    links: links("pricing", "contact")
  },
  solutions: {
    message: "- **Admission Autopilot** for coaching centres and schools, setup **₹24,999**.\n" +
      "- **Patient Autopilot** for clinics and diagnostic centres, setup **₹24,999**.\n" +
      "- **WhatsApp Sales Desk** for shops, restaurants and services, setup **₹19,999**.\n" +
      "- **Business Launch Kit** for new businesses, setup **₹24,999**.",
    links: links("solutions", "contact")
  },
  projects: {
    message: "- Live client and personal projects: business websites, e-commerce stores and portfolios.\n" +
      "- Product, UI and 3D design work, plus logo and brand creations.\n" +
      "- AI automation and n8n workflow builds.",
    links: links("projects", "contact")
  },
  contact: {
    message: `- **WhatsApp / Call**: ${CONTACT.phone}\n` +
      `- **Email**: ${CONTACT.email}\n` +
      `- **Hours**: ${CONTACT.hours}\n` +
      `- **Based in**: ${CONTACT.location}, serving clients everywhere.`,
    links: links("contact")
  },
  location: {
    message: `- BrandiQue Web Solutions is based in **${CONTACT.location}**.\n` +
      "- We work with clients across India and worldwide, fully online.\n" +
      `- Working hours: ${CONTACT.hours}.`,
    links: links("contact", "about")
  },
  quote: {
    message: "- Share your **name**, **phone / WhatsApp**, the **service** you need and a short project description.\n" +
      "- After a short call you get a **fixed written quote**, so the price you approve is the price you pay.\n" +
      "- Or fill the form on the Contact page and we reply quickly.",
    links: links("contact", "pricing")
  },
  audit: {
    message: "- The **Free Growth Audit** reviews your website, enquiries and follow-up.\n" +
      "- You get practical fixes to win more customers, no obligation.\n" +
      "- Request it here or on WhatsApp; we follow up with your audit and next steps.",
    links: links("contact", "services")
  },
  timeline: {
    message: "- Starter and business websites, and single automations: **1 to 2 weeks**.\n" +
      "- E-commerce stores, larger websites and industry solutions: **2 to 4 weeks**.\n" +
      "- Timelines start once we receive your content.",
    links: links("pricing", "contact")
  },
  payment: {
    message: "- Usually **50% to start** and **50% before launch**.\n" +
      "- Monthly plans are billed at the start of each month, with a 3-month minimum.\n" +
      "- Prices are starting points; you approve a fixed written quote first.",
    links: links("pricing", "contact")
  },
  extraCosts: {
    message: "- Not included: domain, hosting, paid plugins, WhatsApp Business API and AI usage, ad spend and taxes.\n" +
      "- These are billed at cost or quoted separately.\n" +
      "- We tell you about every one before you approve anything.",
    links: links("pricing", "contact")
  },
  ownership: {
    message: "- **You own it.** After final payment the website, content, designs and workflows are yours.\n" +
      "- We hand over all access and a walkthrough.",
    links: links("pricing")
  },
  maintenance: {
    message: "- **Web Care ₹1,999/month**: edits, form and uptime checks, backups, WhatsApp support.\n" +
      "- **Web Growth ₹3,999/month**: more edits, a new section monthly, SEO and reports.\n" +
      "- **AI Care ₹2,999/month** keeps chatbots and automations running.",
    links: links("pricing", "contact")
  },
  seo: {
    message: "- SEO foundations are built into every website: structure, speed and Google-ready pages.\n" +
      "- Business Website includes **Google Business Profile and SEO setup**.\n" +
      "- **Web Growth (₹3,999/month)** adds ongoing on-page SEO and Google Business updates.",
    links: links("web", "pricing")
  },
  carePlans: {
    message: "- **Website Care ₹2,999/month**: updates, uptime checks, backups and WhatsApp support for your website.\n" +
      "- **AI Agent Monitoring ₹4,999/month**: your chatbots and automations watched, fixed and tuned.\n" +
      "- **Growth ₹6,999/month** and **Scale ₹14,999/month** cover the full growth system.\n" +
      "- Monthly billing, cancel anytime. Subscribe in minutes on WhatsApp.",
    links: links("pricing", "contact")
  },
  autopilot: {
    message: "- **Patient Autopilot** for clinics and diagnostic centres, setup **₹24,999**: bookings, reminders and follow-ups on WhatsApp.\n" +
      "- **Admission Autopilot** for coaching centres and schools, setup **₹24,999**: enquiries, fee reminders and follow-ups on autopilot.\n" +
      "- **WhatsApp Sales Desk ₹19,999** for shops, restaurants and services: instant replies and order capture.\n" +
      "- Fixed price, ROI-first: one recovered customer a month often pays for the setup.",
    links: links("solutions", "contact")
  },
  referral: {
    message: "- Refer a business to BrandiQue and earn **10% of the first project value**.\n" +
      "- How it works: **1)** share your referral link, **2)** they start a project, **3)** you get paid.\n" +
      "- No limit on how many businesses you refer.",
    links: links("referral", "contact")
  },
  roi: {
    message: "- The **ROI Calculator** shows how much money you lose every month from missed enquiries.\n" +
      "- Enter your missed enquiries per day and your average deal value.\n" +
      "- See the lost revenue instantly, and how automation could recover it.",
    links: links("roi", "contact")
  },
  leadMagnet: {
    message: "- The **Free Growth Audit** reviews your website, enquiries and follow-up, with practical fixes.\n" +
      "- Ask here or on WhatsApp, and we follow up with your audit and next steps.\n" +
      "- Free, no obligation.",
    links: links("contact", "services")
  },
  offTopic: {
    message: "- I'm focused on BrandiQue 🙂\n" +
      "- I can help with **websites**, **AI agents & automations**, **graphic design** and **voice calling AI agents**.",
    links: links("services")
  },
  fallback: {
    message: "- I can help with BrandiQue's **websites**, **AI automation**, **graphic design** and **voice calling AI agents**.\n" +
      "- Ask about prices, timelines or the free growth audit, or reach us on WhatsApp.",
    links: links("services", "contact")
  }
};

// Voice Calling AI Agents: specific phrases only, so "call me" or "phone number" stay contact questions.
function isVoiceQuestion(t) {
  return /\b(voice|voice ?bots?|voice ai|calling (ai )?agents?|ai (calling|calls?|caller|telecaller)|call(ing)? bots?|calling bots?|phone (ai|agents?|bots?)|telecall(er|ers|ing)|outbound calls?|inbound calls?|call campaigns?|bulk calls?|auto ?calls?|ai call)\b/i.test(t) ||
    (/\b(ai|agents?|bots?)\b/i.test(t) && /\b(calls?|phone)\s+(chese|chestu\w*|cheyy\w*|chesi|chestara)\b/i.test(t));
}

// Voice plan names (Starter / Growth / Premium). Other services also have a "Starter" or "Growth"
// offer, so a plan question only counts as voice when it names voice or no other service.
const OTHER_SERVICE_RE = /\b(website|websites|web|design|designs|graphic|logo|brand|bundles?|scale|care|membership|memberships|monthly|all[- ]in[- ]one|e[- ]?commerce|chatbot|automation)\b/;
function voicePlanAnswer(t) {
  const plans = (t.match(/\b(starter|growth|premium)\b/g) || []);
  if (!plans.length) return null;
  if (!isVoiceQuestion(t) && OTHER_SERVICE_RE.test(t)) return null;
  const unique = [...new Set(plans)];
  if (unique.length > 1 || /\b(differen\w*|compare|comparison|vs|versus|tedha|teda)\b/.test(t)) return ANSWERS.voiceDifferences;
  if (unique[0] === 'starter') return ANSWERS.voiceStarter;
  if (unique[0] === 'growth') return ANSWERS.voiceGrowth;
  return ANSWERS.voicePremium;
}

// Deterministic intent matching for verified facts (fast, never hallucinates).
function matchIntent(raw) {
  const t = String(raw || "").toLowerCase().trim();
  if (!t) return null;

  if (isFounderQuestion(t)) return founderAnswer(t);
  if (/^\s*(hi+|hello+|hey+|hai|hii+|namaste|namaskaram|good (morning|afternoon|evening))[!.\s🙂]*$/i.test(t)) return ANSWERS.greeting;

  const price = /\b(price|pricing|prices|cost|costs|charges?|rate|rates|how much|fee|fees|budget|rs\.?|₹|entha|enta|packages?)\b/i.test(t);

  const voicePlan = voicePlanAnswer(t);
  if (voicePlan) return voicePlan;
  if (isVoiceQuestion(t)) {
    if (/\b(telecaller|tele[- ]?caller|human|staff|employee|vs|versus|better than)\b/.test(t) && !/\bplans?\b/.test(t)) return ANSWERS.voiceVsTelecaller;
    if (/\b(differen\w*|compare|comparison|tedha|teda|which plan)\b/.test(t)) return ANSWERS.voiceDifferences;
    if (price || /\b(plans?|tiers?|per minute|minutes?)\b/.test(t)) return ANSWERS.voicePricing;
    return ANSWERS.voice;
  }
  if (/\b(bundles?|growth plan|scale plan|all[- ]in[- ]one)\b/.test(t)) return ANSWERS.bundles;
  if (/\b(care plans?|website care|ai agent monitoring)\b/i.test(t)) return ANSWERS.carePlans;
  if (/\b(autopilots?)\b/i.test(t)) return ANSWERS.autopilot;
  if (/\b(referrals?|refer a|referring|refer and earn|commission)\b/i.test(t)) return ANSWERS.referral;
  if (/\b(roi|return on investment|lost revenue|missed (enquiries?|enquiry|leads?|calls?))\b/i.test(t)) return ANSWERS.roi;
  if (/\bfree\b.{0,20}\b(growth audit|audit|consultation|offer|trial)\b/i.test(t)) return ANSWERS.leadMagnet;
  if (/\b(memberships?|monthly|subscription|per month|retainer)\b/.test(t)) return ANSWERS.memberships;
  if (/\b(solutions?|industr(y|ies)|coaching|schools?|clinics?|hospitals?|restaurants?|shops?|admissions?|patients?|doctors?|retail)\b/.test(t)) return ANSWERS.solutions;
  if (/\b(audit)\b/.test(t)) return ANSWERS.audit;
  if (/\b(chat ?bots?|chatbot)\b/.test(t)) return ANSWERS.chatbot;
  if (/\b(ai|automation|automations|automate|n8n|workflows?|agents?|whatsapp bot|crm)\b/.test(t)) return ANSWERS.ai;
  if (/\b(e[- ]?commerce|online store|online shop|store website)\b/.test(t)) return ANSWERS.ecommerce;
  if (/\b(wordpress|react|next\.?js|custom code)\b/.test(t)) return ANSWERS.wordpress;
  if (/\b(logo|brand identity|branding|brand kit)\b/.test(t)) return ANSWERS.logo;
  if (/\b(design|designs|graphic|creatives?|posters?|flyers?|thumbnails?|banners?|social media posts?|instagram posts?)\b/.test(t)) return ANSWERS.design;
  if (/\b(seo|google ranking|search engine|google business)\b/.test(t)) return ANSWERS.seo;
  if (/\b(website|websites|web site|web development|landing page|portfolio website|site)\b/.test(t)) return ANSWERS.web;
  if (/\b(all services|services|what do you (offer|do)|offerings)\b/.test(t)) return ANSWERS.services;
  if (price) return ANSWERS.pricing;
  if (/\b(projects?|portfolio|work samples?|previous work|clients?|case stud(y|ies))\b/.test(t)) return ANSWERS.projects;
  if (/\b(quote|quotation|estimate|start a project|hire)\b/.test(t)) return ANSWERS.quote;
  if (/\b(how long|timeline|delivery|turnaround|days|weeks)\b/.test(t)) return ANSWERS.timeline;
  if (/\b(payment|pay|advance|installments?)\b/.test(t)) return ANSWERS.payment;
  if (/\b(hosting|domain|hidden|extra cost|not included)\b/.test(t)) return ANSWERS.extraCosts;
  if (/\b(own|ownership|source code)\b/.test(t)) return ANSWERS.ownership;
  if (/\b(maintenance|maintain|support|updates?)\b/.test(t)) return ANSWERS.maintenance;
  if (/\b(where|location|address|office|based|vizag|visakhapatnam)\b/.test(t)) return ANSWERS.location;
  if (/\b(contact|phone|number|call|whatsapp|email|mail|reach|hours|timings?)\b/.test(t)) return ANSWERS.contact;
  if (/\b(about|what is brandique|who are you|brandique|company)\b/.test(t)) return ANSWERS.about;
  if (/\b(privacy)\b/.test(t)) return { message: "- Our privacy policy explains what data we collect and how it is used.", links: links("privacy") };
  if (/\b(terms|conditions|refund)\b/.test(t)) return { message: "- Our terms explain project scope, payments and responsibilities.", links: links("terms", "contact") };
  return null;
}

// Keyword-based page links for AI answers that did not give valid ones.
function inferLinks(text) {
  const t = String(text || "").toLowerCase();
  const out = [];
  const add = (k) => { if (!out.includes(PAGES[k])) out.push(PAGES[k]); };
  if (/website|web development|e-?commerce|wordpress|landing/.test(t)) add("web");
  if (/\bai\b|automation|chatbot|n8n|workflow|agent/.test(t)) add("ai");
  if (/design|logo|brand|creative/.test(t)) add("design");
  if (/voice|calling agent|telecall|per minute|\/min/.test(t)) add("voice");
  if (/price|₹|cost|plan|membership/.test(t)) add("pricing");
  if (/founder|about|mohan/.test(t)) add("about");
  if (/project|portfolio/.test(t)) add("projects");
  if (/industry|clinic|coaching|restaurant/.test(t)) add("solutions");
  if (/referral|refer a|commission/.test(t)) add("referral");
  if (/roi|lost revenue|missed enquir/.test(t)) add("roi");
  add("contact");
  return out.slice(0, 3);
}

// Pulls the "LINKS: /a, /b" line out of an AI answer.
function extractLinks(text) {
  const lines = String(text || "").split("\n");
  let found = [];
  const kept = [];
  for (const line of lines) {
    const m = line.match(/^\s*\**links?\**\s*:\s*(.+)$/i);
    if (m) {
      found = m[1].split(/[,\s]+/)
        .map((p) => p.trim().replace(/^https?:\/\/(www\.)?brandique\.in/i, "").replace(/\/+$/, "") || "/")
        .filter((p) => VALID_PATHS.has(p));
    } else kept.push(line);
  }
  const unique = [...new Set(found)].map((p) => Object.values(PAGES).find((pg) => pg.path === p));
  return { text: kept.join("\n").trim(), links: unique.slice(0, 3) };
}

// Turns any paragraph answer into bullet points.
function toBullets(text) {
  const clean = String(text || "").replace(/\r\n?/g, "\n").replace(/^#+\s*/gm, "").trim();
  const lines = clean.split("\n").map((l) => l.trim()).filter(Boolean);
  const bulletRe = /^([-*•]|\d+[.)])\s+/;
  if (lines.length && lines.every((l) => bulletRe.test(l))) {
    return lines.map((l) => "- " + l.replace(bulletRe, "")).join("\n");
  }
  const out = [];
  for (const l of lines) {
    if (bulletRe.test(l)) { out.push("- " + l.replace(bulletRe, "")); continue; }
    const sentences = l.match(/[^.!?]+[.!?]+(\s|$)|[^.!?]+$/g) || [l];
    for (const s of sentences) if (s.trim()) out.push("- " + s.trim());
  }
  return out.slice(0, 8).join("\n");
}

// Absolute safety net: no co-founder / other-person claims ever leave the server.
function violatesFounderRule(text, visitorName = "") {
  let t = String(text || "").toLowerCase();
  const own = String(visitorName || "").toLowerCase().trim();
  if (own) for (const part of own.split(/\s+/)) if (part.length > 2) t = t.split(part).join("visitor");
  if (/praveen|karri/.test(t)) return true;
  if (/co[- ]?founder/.test(t) && !/no co[- ]?founders?|not have (any )?co[- ]?founders?|without (any )?co[- ]?founders?|zero co[- ]?founders?/.test(t)) return true;
  return false;
}

// Did the visitor ask for a page/link or for full details?
function wantsLinks(raw) {
  const t = String(raw || "").toLowerCase();
  return /\b(links?|url|pages?|webpage|open|show me|take me|navigate|go to|where (can|do|is|are|on)|ekkada|ekkda|chupinchu|chupistava|ivvu|pampu|more details|full details|in detail|detailed|details|ekkuva|inka cheppu|elaborate|explain more|tell me more|learn more|read more|know more)\b/.test(t);
}

// Personal details the visitor shares; kept in their own browser and sent back with each chat.
function extractProfile(text, base = {}) {
  const profile = { ...base };
  const t = String(text || "");
  const name = t.match(/\b(?:my name is|my name's|call me|naa peru|na peru)\s+([A-Za-z][A-Za-z.'-]{1,20}(?:\s+[A-Za-z][A-Za-z.'-]{1,20})?)/i);
  if (name && !/^(a|an|the|looking|interested|from|here|going|not|very|so|ok)$/i.test(name[1].split(/\s+/)[0])) {
    profile.name = name[1].replace(/\s+(and|from|here|i|my|nenu|ki)$/i, "").trim().replace(/\b\w/g, (c) => c.toUpperCase());
  }
  const intro = t.match(/(?:^|[\s,!.])(?:i am|i'm|im|iam|this is|nenu)\s+([A-Za-z][A-Za-z.'-]{1,20}(?:\s+[A-Za-z][A-Za-z.'-]{1,20})?)\s*(?:$|[,.!?]|\s+(?:here|and|from|nenu|ni)\b)/i);
  const NOT_NAME = /^(a|an|the|looking|interested|from|here|going|not|very|so|ok|okay|fine|good|great|new|planning|starting|trying|searching|owner|student|doctor|running|having|building|unable|also|just|ready|sure|confused|asking|waiting|happy|well|back|done|thinking|website|business|freelancer|developer|designer|kavali|cheppu)$/i;
  if (!name && intro && !NOT_NAME.test(intro[1].split(/\s+/)[0])) {
    const words = intro[1].split(/\s+/).filter((w) => !NOT_NAME.test(w));
    if (words.length) profile.name = words.join(" ").replace(/\b\w/g, (c) => c.toUpperCase());
  }
  const phone = t.match(/(?:\+?91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}\b/);
  if (phone) profile.phone = phone[0].replace(/[\s-]/g, "");
  const email = t.match(/[\w.+-]+@[\w-]+\.[\w.]+/);
  if (email) profile.email = email[0];
  const biz = t.match(/\b(?:i (?:have|run|own|started) (?:a|an|my)|my business is(?: a| an)?|naaku|maaku|naa daggara)\s+([a-z][a-z &-]{2,30}?)(?:\s+(?:undi|business|and|in|at|,|\.)|[,.!?]|$)/i);
  if (biz && !/^(question|doubt|query|website idea)$/i.test(biz[1].trim())) profile.business = biz[1].trim();
  const city = t.match(/\b(?:i am from|i'm from|im from|i live in|i stay in|based in|located in|maadi)\s+([a-z]{3,20})\b/i);
  if (city && !/^(a|the|india)$/i.test(city[1])) profile.city = city[1].charAt(0).toUpperCase() + city[1].slice(1);
  return profile;
}

module.exports = {
  wantsLinks, extractProfile,
  PAGES, SYSTEM_PROMPT, ANSWERS, FOUNDER_ANSWER, CONTACT,
  matchIntent, isVoiceQuestion, inferLinks, extractLinks, toBullets, violatesFounderRule, isFounderQuestion, founderAnswer, links
};
