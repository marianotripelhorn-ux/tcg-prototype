import fs from "node:fs";

const html = fs.readFileSync("index.html", "utf8");

function section(startMarker, endMarker) {
  const start = html.indexOf(startMarker);
  if (start < 0) throw new Error(`Missing section: ${startMarker}`);
  const end = html.indexOf(endMarker, start + startMarker.length);
  if (end < 0) throw new Error(`Missing end marker ${endMarker} for ${startMarker}`);
  return html.slice(start, end);
}

const zones = {
  preview: section("function previewPendingPower", "function renderBoards"),
  estimate: section("function estimateOwn", "function aiSetupScore"),
  setup: section("function aiSetupScore", "function aiPairSynergy"),
  pair: section("function aiPairSynergy", "function aiReserveValue"),
  calculate: section("function calculatePowers", "function feedbackCard"),
  post: section("function applyPost", "function handleAIQuiero"),
  doubles: section("function baseDoubleReasons", "function addBuff"),
  capacity: section("function capacity", "function legalPositions"),
  affinity: section("function affinityActive", "function roundScoreFor"),
  endRound: section("function endRound", "function finishGame"),
  resolve: section("function resolveDuel", "function applyPost")
};

const effectIds = [...new Set([...html.matchAll(/effect:"([^"]+)"/g)].map(m => m[1]))].sort();

const direct = [
  "bonus2","first_or_prev_diestra2","won_prev2","empty_sin5","trono_before4",
  "diestra_before3","second_special3","third4","archive_here","archive_empty2",
  "archive_two2","opp_archive_more2","archive_three6","trono_archive_three3",
  "least_archive2","opp_archive_capped","clear_archive2x","lateral1","losing_round2",
  "score_tied1","axis_lateral2","opposite_prev3","first_round3","winning_round2",
  "prev_draw3","win_loss4","first_opposite3","archive_leads_global","archive_exact2_5",
  "archive_all_diff3"
];

const contextual = [
  "enemy_printed6_2","copy_plus2","enemy_affinity2","opposite_enemy2",
  "enemy3","lost_prev_enemy3","enemy_boosted_minus2","prev_draw_enemy3",
  "cancel_enemy_affinity"
];

const future = [
  "loss_next3","won_round_next3","next_position2","next_diestra2","enemy_next3","mirror_martyr"
];

const doubles = ["second_trono_double","equal_life_double"];

const spec = new Set([...direct,...contextual,...future,...doubles]);
const errors = [];
const warnings = [];

function has(zone, effect) {
  return zones[zone].includes(`"${effect}"`);
}

for (const effect of effectIds) {
  if (!spec.has(effect)) errors.push(`Effect has no audit classification: ${effect}`);
}
for (const effect of spec) {
  if (!effectIds.includes(effect)) errors.push(`Audit spec references missing effect: ${effect}`);
}

for (const effect of direct) {
  for (const zone of ["preview","estimate","calculate"]) {
    if (!has(zone,effect)) errors.push(`${effect}: missing from ${zone}`);
  }
}

for (const effect of contextual) {
  if (!has("calculate",effect)) errors.push(`${effect}: missing authoritative resolution`);
  if (!has("estimate",effect) && !has("setup",effect) && !has("pair",effect)) {
    warnings.push(`${effect}: no explicit AI heuristic; verify chooseAIPlay handles it contextually`);
  }
  if (!has("preview",effect)) {
    warnings.push(`${effect}: no explicit preview entry; acceptable only if opponent information is required`);
  }
}

for (const effect of future) {
  if (!has("post",effect)) errors.push(`${effect}: missing post-resolution implementation`);
  if (!has("setup",effect) && !has("pair",effect)) {
    warnings.push(`${effect}: no explicit AI planning heuristic`);
  }
}

for (const effect of doubles) {
  if (!has("doubles",effect)) errors.push(`${effect}: missing from baseDoubleReasons`);
}

// Known regression guards.
const guards = [
  ["Incendiario exact", zones.calculate.includes('c.effect==="first_round3"')],
  ["Archivista/Bibliotecario preview", zones.preview.includes('c.effect==="archive_here"')],
  ["Archivista/Bibliotecario AI", zones.estimate.includes('card.effect==="archive_here"')],
  ["Archivista/Bibliotecario exact", zones.calculate.includes('c.effect==="archive_here"')],
  ["Maestro uses Diestra, not champion.special", !html.includes('countPosition(self,self.champion.special)')],
  ["Athos dynamic Diestra capacity", zones.capacity.includes('p.champion.id==="athos"')],
  ["Desartes most-populated capacity", zones.capacity.includes('p.champion.id==="desartes"')],
  ["Vinira affinity override", zones.affinity.includes('p.champion.id==="vinira"')],
  ["Vinira +1 preview", zones.preview.includes('+1 Vinira fuera de afinidad')],
  ["Vinira +1 AI", zones.estimate.includes('p.champion.id==="vinira"') && zones.estimate.includes('v+=1')],
  ["Vinira +1 exact", zones.calculate.includes('+1 Vinira fuera de afinidad')],
  ["Majestad no post-win +1", !zones.resolve.includes('addBuff(state.player,1,"Majestad Dextral")')],
  ["Samas post-draw buff", zones.resolve.includes('champion.id==="samas"')],
  ["Corte post-loss debuff", zones.resolve.includes('champion.id==="sinistral"')],
  ["Empíreos end-round trigger", zones.endRound.includes('champion.id==="empireos"')]
];
for (const [name, ok] of guards) if (!ok) errors.push(`Regression guard failed: ${name}`);

console.log(`Daggerlight effect audit: ${effectIds.length} unique effects`);
console.log(`Direct: ${direct.length} | Contextual: ${contextual.length} | Future: ${future.length} | Double: ${doubles.length}`);
if (warnings.length) {
  console.log("\nWarnings:");
  for (const w of warnings) console.log("  - " + w);
}
if (errors.length) {
  console.error("\nFAIL:");
  for (const e of errors) console.error("  - " + e);
  process.exit(1);
}
console.log("\nPASS: structural effect routes and regression guards are intact.");
