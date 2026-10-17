// Run with: npm test  (node:test, no extra dependencies)
const test = require("node:test");
const assert = require("node:assert/strict");
const { matchIntent, ANSWERS, SYSTEM_PROMPT, paygQuote, voiceMinutesAnswer } = require("../knowledge");

const ask = (q) => (matchIntent(q) || {}).message || "";

test("voice monthly plans: Starter ₹2,799, Pro ₹6,999, Growth ₹22,999", () => {
  assert.match(ask("Starter price entha?"), /Voice Starter: ₹2,799\/month[\s\S]*317 mins included/);
  assert.match(ask("Growth price entha?"), /Voice Growth: ₹22,999\/month[\s\S]*3,571 mins included/);
  assert.match(ask("voice pro price entha?"), /Voice Pro: ₹6,999\/month[\s\S]*1,000 mins included/);
  assert.match(ask("what plans do you have for voice calling agents?"), /₹2,799\/month[\s\S]*₹6,999\/month[\s\S]*₹22,999\/month[\s\S]*₹8\.90\/min/);
});

test("Pro plan lo emi untayi? lists Pro features", () => {
  assert.equal(matchIntent("Pro plan lo emi untayi?"), ANSWERS.voicePro);
  const a = ask("Pro plan lo emi untayi?");
  for (const f of ["live call monitoring", "voicemail detection", "agent versioning", "workflow builder \\(10,000 runs\/mo\\)", "5 team members", "50 MB"]) assert.match(a, new RegExp(f), f);
  assert.notEqual(matchIntent("design pro price"), ANSWERS.voicePro);
});

test("voice plan differences", () => {
  assert.equal(matchIntent("starter vs pro vs growth difference"), ANSWERS.voiceDifferences);
  assert.equal(matchIntent("voice plans lo difference enti?"), ANSWERS.voiceDifferences);
  const d = ANSWERS.voiceDifferences.message;
  assert.match(d, /voice cloning · WhatsApp · SIP trunking/);
  assert.match(d, /recording insights · email channel · SMS channel · workflow builder \(100,000 runs\/mo\)/);
  assert.match(d, /Pay as you go\*\*: ₹8\.90\/min from ₹2,848/);
});

test("pricing entha? includes the new voice pricing", () => {
  assert.equal(matchIntent("pricing entha?"), ANSWERS.pricing);
  assert.match(ask("pricing entha?"), /Starter ₹2,799[\s\S]*Pro ₹6,999[\s\S]*Growth ₹22,999[\s\S]*₹8\.90\/min[\s\S]*₹2,848[\s\S]*₹1,999[\s\S]*18% GST/);
});

test("pay as you go entha?", () => {
  for (const q of ["pay as you go entha?", "voice top up price", "payg rate enti"]) assert.equal(matchIntent(q), ANSWERS.voicePayg, q);
  const a = ask("pay as you go entha?");
  assert.match(a, /₹8\.90\/min/); assert.match(a, /320 minutes = ₹2,848/); assert.match(a, /₹8\.47\/min/); assert.match(a, /\+2% bonus minutes/); assert.match(a, /18% GST/);
});

test("monthly fee unda? -> yes on monthly plans, PAYG has none", () => {
  assert.equal(matchIntent("monthly fee unda?"), ANSWERS.monthlyFee);
  assert.match(ask("monthly fee unda?"), /Starter ₹2,799[\s\S]*pay as you go[\s\S]*₹2,848/);
  for (const q of ["voice agents monthly entha?", "voice agent monthly fee unda?", "voice ai subscription undha monthly"]) assert.equal(matchIntent(q), ANSWERS.voiceMonthly, q);
  assert.match(ANSWERS.voiceMonthly.message, /Yes, if you choose a monthly plan/);
});

test("500 minutes ki entha? -> PAYG 500 × ₹8.90 = ₹4,450 + GST", () => {
  const a = ask("500 minutes ki entha?");
  assert.match(a, /500 × ₹8\.90 = \*\*₹4,450 \+ 18% GST\*\* \(₹801\) = ₹5,251/);
  assert.match(a, /Pro ₹6,999\/month\*\* includes 1,000 mins/);
  assert.match(ask("1000 mins ki entha"), /1,000 × ₹8\.47 = \*\*₹8,470[\s\S]*\+20 bonus minutes/);
  assert.match(ask("100 minutes ki entha?"), /Minimum pay-as-you-go top-up is \*\*320 minutes = ₹2,848\*\*/);
  // The free 20-minute consultation call is not a minutes quote.
  assert.equal(voiceMinutesAnswer("free consultation call") , null);
});

test("PAYG maths matches the website slider", () => {
  assert.deepEqual([320, 500, 800, 826].map((n) => paygQuote(n).amount), [2848, 4450, 7120, 7351]);
  const q = paygQuote(827); assert.equal(q.rate, 8.47); assert.equal(q.amount, 7005); assert.equal(q.bonus, 16);
  assert.equal(paygQuote(100).minutes, 320);
});

test("voice GST and setup fee", () => {
  assert.equal(matchIntent("voice agent gst included?"), ANSWERS.voiceGst);
  assert.match(ANSWERS.voiceGst.message, /18% GST/);
  assert.equal(matchIntent("setup fee entha?"), ANSWERS.voiceSetup);
  assert.equal(matchIntent("voice agent setup fee entha?"), ANSWERS.voiceSetup);
  assert.match(ANSWERS.voiceSetup.message, /one-time setup fee ₹1,999/);
  for (const q of ["Starter price entha?", "Growth price entha?", "voice pro price entha?", "pay as you go entha?"]) assert.match(ask(q), /₹1,999/, q);
  for (const [k, a] of Object.entries(ANSWERS)) assert.doesNotMatch(a.message, /no setup fee|no setup or|setup fee ₹0/i, k);
  assert.notEqual(matchIntent("clinic autopilot setup price"), ANSWERS.voiceSetup);
  assert.notEqual(matchIntent("website setup cost entha?"), ANSWERS.voiceSetup);
});

test("voice overview and no stale prices or unsupported claims", () => {
  assert.equal(matchIntent("Voice AI agents service enti?"), ANSWERS.voice);
  for (const [k, a] of Object.entries(ANSWERS)) {
    assert.doesNotMatch(a.message, /3\.30|5\.50|7\.70|Hindi|₹5\/min|₹11|Premium ₹|no monthly fee|2,099|₹500 calling credit/i, k);
  }
  assert.doesNotMatch(SYSTEM_PROMPT, /Starter ₹5\/min|Premium ₹11\/min|There is NO monthly fee/);
});

test("other services keep their own answers", () => {
  assert.equal(matchIntent("growth bundle price"), ANSWERS.bundles);
  assert.equal(matchIntent("website starter price"), ANSWERS.web);
  assert.equal(matchIntent("call me on whatsapp"), ANSWERS.contact);
});
