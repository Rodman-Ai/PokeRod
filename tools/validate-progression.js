'use strict';

global.window = {};
require('../js/data.js');
require('../js/battle.js');

const DATA = window.PR_DATA;
const Battle = window.PR_BATTLE.Battle;
const errors = [];

function fail(msg) { errors.push(msg); }

function harness() {
  const b = Object.create(Battle.prototype);
  b.messages = [];
  b.queue = (msg) => b.messages.push(msg);
  b.state = { party:[] };
  return b;
}

function moveIds(mon) {
  return mon.moves.map((m) => m.id);
}

{
  const mon = DATA.makeMon('rivettot', 4);
  const oldStats = Object.assign({}, mon.stats);
  const b = harness();
  b.applyXpToMon(mon, DATA.xpForLevel(6) - mon.xp);
  if (mon.level !== 6) fail(`rivettot expected level 6, got ${mon.level}`);
  if (mon.stats.hp <= oldStats.hp) fail('rivettot HP did not increase on level-up');
  if (!moveIds(mon).includes('ironswipe')) fail('rivettot did not learn Iron Swipe at level 6');
  if (!b.messages.some((m) => /^Stats rose!/.test(m))) fail('level-up did not queue stat gain text');
}

{
  const mon = DATA.makeMon('joltlet', 17);
  const b = harness();
  b.applyXpToMon(mon, DATA.xpForLevel(18) - mon.xp);
  const pending = b._pendingLearn && b._pendingLearn[0];
  if (!pending || pending.mvId !== 'zapburst' || pending.target !== mon) {
    fail('5th-move learn did not create a targeted pending learn entry');
  }
}

{
  const mon = DATA.makeMon('emberkit', 15);
  const oldHp = mon.hp;
  const b = harness();
  b.applyXpToMon(mon, DATA.xpForLevel(16) - mon.xp);
  if (mon.species !== 'flarebound') fail(`emberkit did not evolve into flarebound, got ${mon.species}`);
  if (mon.hp <= oldHp) fail('evolution did not preserve/add gained HP');
  if (mon.hp > mon.stats.hp) fail('evolution left current HP above max HP');
  if (!b.messages.some((m) => /evolved into Flarebound/.test(m))) fail('evolution message missing');
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log('validated progression: stat gains, move learning, pending 5th moves, and evolution');
