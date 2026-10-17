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

test("plan differences: same features, only voice quality and rate", () => {
  assert.equal(matchIntent("starter vs growth vs premium difference"), ANSWERS.voiceDifferences);
  assert.equal(matchIntent("voice plans lo difference enti?"), ANSWERS.voiceDifferences);
  assert.match(ANSWERS.voiceDifferences.message, /only in \*\*voice quality\*\* and \*\*per-minute rate\*\*/);
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
