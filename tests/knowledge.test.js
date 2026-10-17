// Run with: npm test  (node:test, no extra dependencies)
const test = require("node:test");
const assert = require("node:assert/strict");
const { matchIntent, ANSWERS } = require("../knowledge");

const ask = (q) => (matchIntent(q) || {}).message || "";

test("voice plan prices: Starter ₹5, Growth ₹8, Premium ₹11 per minute", () => {
  assert.match(ask("Starter price entha?"), /Voice Starter: ₹5 per connected minute/);
  assert.match(ask("Growth price entha?"), /Voice Growth: ₹8 per connected minute/);
  assert.match(ask("Premium price entha?"), /Voice Premium: ₹11 per connected minute/);
  assert.match(ask("what plans do you have for voice calling agents?"), /₹5\/min[\s\S]*₹8\/min[\s\S]*₹11\/min/);
});

test("plan differences: tier taglines and features", () => {
  assert.equal(matchIntent("starter vs growth vs premium difference"), ANSWERS.voiceDifferences);
  assert.equal(matchIntent("voice plans lo difference enti?"), ANSWERS.voiceDifferences);
  const d = ANSWERS.voiceDifferences.message;
  assert.match(d, /Native Multilingual · Value Voices · Low Latency · Budget bulk calling/);
  assert.match(d, /Native Multilingual · Standard Voices · Low Latency · The All-Rounder/);
  assert.match(d, /Native Multilingual · Premium Voices · Ultra-low Latency · Custom integrations/);
  assert.match(ask("Starter price entha?"), /Budget-friendly\. Mostly used for bulk calling campaigns\./);
  assert.match(ask("Growth price entha?"), /The All-Rounder\. High realism for everyday customer interactions and support\./);
  assert.match(ask("Premium price entha?"), /Curated native speakers\. The most real-like voices from our exclusive library\./);
});

test("voice agents: no monthly / agent fee, only per-minute billing", () => {
  for (const q of ["voice agents monthly entha?", "voice agent monthly fee unda?", "calling agent per agent fee entha?", "voice ai subscription undha monthly"]) {
    assert.equal(matchIntent(q), ANSWERS.voiceNoMonthly, q);
  }
  assert.match(ANSWERS.voiceNoMonthly.message, /No monthly fee/);
  assert.match(ANSWERS.voiceNoMonthly.message, /₹5\/min[\s\S]*₹8\/min[\s\S]*₹11\/min/);
  assert.match(ask("voice agents price entha?"), /no monthly fee/i);
  for (const [k, a] of Object.entries(ANSWERS)) {
    assert.doesNotMatch(a.message, /2,099|2099|30 days|per agent \/|₹500 calling credit/, k);
  }
});

test("voice setup fee: ₹1,999 one-time, no monthly fee, per-minute 5/8/11", () => {
  assert.equal(matchIntent("setup fee entha?"), ANSWERS.voiceSetup);
  assert.equal(matchIntent("voice agent setup fee entha?"), ANSWERS.voiceSetup);
  const s = ask("setup fee entha?");
  assert.match(s, /one-time setup fee ₹1,999/);
  assert.match(s, /No monthly fee/);
  assert.match(s, /₹5\/min[\s\S]*₹8\/min[\s\S]*₹11\/min/);
  const total = ask("voice agent total cost enti?");
  assert.equal(matchIntent("voice agent total cost enti?"), ANSWERS.voicePricing);
  assert.match(total, /One-time setup fee ₹1,999/);
  assert.match(total, /no monthly fee/);
  assert.match(total, /₹5\/min[\s\S]*₹8\/min[\s\S]*₹11\/min/);
  assert.match(ask("voice agents monthly entha?"), /one-time setup fee of \*\*₹1,999\*\*/);
  for (const q of ["Starter price entha?", "Growth price entha?", "Premium price entha?"]) assert.match(ask(q), /₹1,999\*\* setup fee/, q);
  // No answer may claim there is no setup fee for voice agents.
  for (const [k, a] of Object.entries(ANSWERS)) assert.doesNotMatch(a.message, /no setup fee|no setup or|setup fee ₹0/i, k);
  // Other services' setup questions keep their own answers.
  assert.notEqual(matchIntent("clinic autopilot setup price"), ANSWERS.voiceSetup);
  assert.notEqual(matchIntent("website setup cost entha?"), ANSWERS.voiceSetup);
});

test("voice overview and no stale prices or unsupported claims", () => {
  assert.equal(matchIntent("Voice AI agents service enti?"), ANSWERS.voice);
  for (const a of Object.values(ANSWERS)) assert.doesNotMatch(a.message, /3\.30|5\.50|7\.70|Hindi/);
});

test("other services keep their own answers", () => {
  assert.equal(matchIntent("growth bundle price"), ANSWERS.bundles);
  assert.equal(matchIntent("website starter price"), ANSWERS.web);
  assert.equal(matchIntent("call me on whatsapp"), ANSWERS.contact);
});
