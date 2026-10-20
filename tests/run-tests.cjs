'use strict';
// node tests/run-tests.cjs \u2014 deterministic unit tests for logic.js + i18n.js
const assert = require('assert');
const L = require('../js/logic.js');
const I = require('../js/i18n.js');

let passed = 0;
function check(name, fn) {
  try { fn(); passed++; }
  catch (e) { console.error('FAIL:', name, '-', e.message); process.exitCode = 1; }
}
function clock() { let t = 0; return { now: () => t, set: (v) => { t = v; }, adv: (d) => { t += d; } }; }

// ---- parseAttempts ----
check('parseAttempts valid', () => {
  assert.strictEqual(L.parseAttempts('3'), 3);
  assert.strictEqual(L.parseAttempts('5'), 5);
  assert.strictEqual(L.parseAttempts('10'), 10);
  assert.strictEqual(L.parseAttempts(5), 5);
});
check('parseAttempts invalid', () => {
  assert.strictEqual(L.parseAttempts('7'), null);
  assert.strictEqual(L.parseAttempts('abc'), null);
  assert.strictEqual(L.parseAttempts(''), null);
  assert.strictEqual(L.parseAttempts(null), null);
});

// ---- grade boundaries ----
check('grade tiers', () => {
  assert.strictEqual(L.grade(0), 'elite');
  assert.strictEqual(L.grade(200), 'elite');
  assert.strictEqual(L.grade(201), 'fast');
  assert.strictEqual(L.grade(275), 'fast');
  assert.strictEqual(L.grade(276), 'average');
  assert.strictEqual(L.grade(375), 'average');
  assert.strictEqual(L.grade(376), 'steady');
  assert.strictEqual(L.grade(500), 'steady');
  assert.strictEqual(L.grade(501), 'easy');
  assert.strictEqual(L.grade(5000), 'easy');
  assert.strictEqual(L.grade(-1), 'invalid');
  assert.strictEqual(L.grade(NaN), 'invalid');
  assert.strictEqual(L.grade(Infinity), 'invalid');
});

// ---- mean/median ----
check('mean/median', () => {
  assert.strictEqual(L.mean([1, 2, 3]), 2);
  assert.strictEqual(L.mean([180, 320, 250]), 250);
  assert.strictEqual(L.median([1, 2, 3]), 2);
  assert.strictEqual(L.median([1, 2, 3, 4]), 2.5);
  assert.strictEqual(L.median([250]), 250);
  assert.strictEqual(L.mean([]), null);
  assert.strictEqual(L.median([]), null);
});

// ---- randomDelay bounds ----
check('randomDelay bounds', () => {
  assert.strictEqual(L.randomDelay(() => 0), 1500);
  assert.strictEqual(L.randomDelay(() => 0.9999999), 5000);
  const d = L.randomDelay(() => 0.5);
  assert.ok(d >= 1500 && d <= 5000, 'in range: ' + d);
});

// ---- state machine: idle press ignored ----
check('press while idle ignored', () => {
  const c = clock();
  const s = L.createSession({ attempts: 3, now: c.now });
  const ev = s.press();
  assert.strictEqual(ev.type, 'ignored');
  assert.strictEqual(s.getState(), 'idle');
});

// ---- foul path ----
check('early press is a foul, attempt restarts', () => {
  const c = clock();
  const s = L.createSession({ attempts: 3, now: c.now });
  assert.strictEqual(s.startAttempt(1000), true);
  assert.strictEqual(s.getState(), 'waiting');
  c.adv(500);
  const ev = s.press();
  assert.strictEqual(ev.type, 'foul');
  assert.strictEqual(ev.attempt, 1, 'foul does not consume attempt');
  assert.strictEqual(ev.fouls, 1);
  assert.strictEqual(s.getState(), 'waiting', 'still waiting after foul');
  // restart the attempt with a new delay
  c.set(500);
  assert.strictEqual(s.startAttempt(800), true);
  c.set(1300); // exactly at delay boundary -> NOT early
  const ev2 = s.press();
  assert.strictEqual(ev2.type, 'result');
  assert.strictEqual(ev2.ms, 0, 'press at the exact green moment = 0ms');
});

// ---- markReady + press ----
check('markReady transition + measured ms', () => {
  const c = clock();
  const s = L.createSession({ attempts: 3, now: c.now });
  s.startAttempt(500);
  c.set(500);
  assert.strictEqual(s.markReady(), true);
  assert.strictEqual(s.markReady(), false, 'second markReady is a no-op');
  assert.strictEqual(s.getState(), 'ready');
  c.set(650);
  const ev = s.press();
  assert.strictEqual(ev.type, 'result');
  assert.strictEqual(ev.ms, 150);
  assert.strictEqual(ev.done, false);
  assert.strictEqual(s.getState(), 'idle');
});

// ---- full session summary ----
check('full 3-attempt session summary', () => {
  const c = clock();
  const s = L.createSession({ attempts: 3, now: c.now });
  const times = [180, 320, 250];
  let last = null;
  times.forEach((ms) => {
    s.startAttempt(1000);
    c.adv(1000);
    s.markReady();
    c.adv(ms);
    last = s.press();
  });
  assert.strictEqual(last.done, true);
  assert.strictEqual(s.getState(), 'finished');
  const sum = last.summary;
  assert.deepStrictEqual(sum.results, [180, 320, 250]);
  assert.strictEqual(sum.best, 180);
  assert.strictEqual(sum.mean, 250);
  assert.strictEqual(sum.median, 250);
  assert.strictEqual(sum.grade, 'elite');
  assert.strictEqual(sum.fouls, 0);
  assert.strictEqual(s.press().type, 'ignored', 'press after finish ignored');
});

// ---- fouls counted in summary ----
check('fouls counted across session', () => {
  const c = clock();
  const s = L.createSession({ attempts: 3, now: c.now });
  s.startAttempt(1000);
  c.adv(100);
  s.press(); // foul 1
  c.set(100);
  s.startAttempt(1000);
  c.set(1100); s.markReady(); c.set(1200);
  const e1 = s.press();
  assert.strictEqual(e1.ms, 100);
  // finish remaining two quickly
  [[2000, 2100, 2150], [3000, 3100, 3300]].forEach(([ws, rd, pr]) => {
    c.set(ws); s.startAttempt(100);
    c.set(rd); s.markReady(); c.set(pr);
    s.press();
  });
  const sum = s.summary();
  assert.strictEqual(sum.n, 3);
  assert.strictEqual(sum.fouls, 1);
});

// ---- cancel ----
check('cancel resets session', () => {
  const c = clock();
  const s = L.createSession({ attempts: 3, now: c.now });
  s.startAttempt(1000);
  c.set(1200); s.markReady(); c.set(1300);
  s.press();
  s.cancel();
  assert.strictEqual(s.getState(), 'idle');
  const sum = s.summary();
  assert.strictEqual(sum.n, 0);
  assert.strictEqual(sum.fouls, 0);
});

// ---- bad attempts throws ----
check('createSession rejects bad attempts', () => {
  assert.throws(() => L.createSession({ attempts: 7 }), /attempts/);
});

// ---- history entry + envelope ----
check('newHistoryEntry + exportEnvelope round-trip', () => {
  const c = clock();
  const s = L.createSession({ attempts: 5, now: c.now });
  [200, 300].forEach((ms) => {
    s.startAttempt(500); c.adv(500); s.markReady(); c.adv(ms); s.press();
  });
  const entry = L.newHistoryEntry(s.summary());
  assert.strictEqual(entry.attempts, 5);
  assert.strictEqual(entry.best, 200);
  assert.ok(!isNaN(Date.parse(entry.at)));
  const env = L.exportEnvelope([entry]);
  assert.strictEqual(env.app, 'reaction-time-bd');
  assert.strictEqual(env.version, 1);
  const v = L.validateImport(JSON.parse(JSON.stringify(env)));
  assert.strictEqual(v.ok, true);
  assert.strictEqual(v.sessions.length, 1);
});

// ---- validateImport rejections ----
check('validateImport rejects junk', () => {
  const good = L.exportEnvelope([{
    at: new Date().toISOString(), attempts: 5, n: 5, fouls: 0,
    best: 200, mean: 250.4, median: 240, grade: 'elite'
  }]);
  const bad = (mut) => {
    const d = JSON.parse(JSON.stringify(good));
    mut(d);
    return L.validateImport(d).ok;
  };
  assert.strictEqual(L.validateImport(null).ok, false);
  assert.strictEqual(L.validateImport({}).ok, false);
  assert.strictEqual(bad((d) => { d.app = 'other'; }), false, 'wrong app');
  assert.strictEqual(bad((d) => { d.version = 2; }), false, 'bad version');
  assert.strictEqual(bad((d) => { d.sessions = 'x'; }), false, 'bad sessions');
  assert.strictEqual(bad((d) => { d.sessions[0].best = -5; }), false, 'negative ms');
  assert.strictEqual(bad((d) => { d.sessions[0].grade = 'nope'; }), false, 'bad grade');
  assert.strictEqual(bad((d) => { d.sessions[0].at = 'not-a-date'; }), false, 'bad date');
  assert.strictEqual(bad((d) => { d.sessions[0].attempts = 7; }), false, 'bad attempts');
  assert.strictEqual(bad((d) => { d.sessions[0].n = 9; }), false, 'n > attempts');
  assert.strictEqual(bad((d) => { d.sessions = new Array(501).fill(d.sessions[0]); }), false, 'too many');
});

// ---- isValidSessionEntry edges ----
check('isValidSessionEntry edges', () => {
  const base = {
    at: new Date().toISOString(), attempts: 3, n: 3, fouls: 999,
    best: 10000, mean: 9999.9, median: 5000, grade: 'easy'
  };
  assert.strictEqual(L.isValidSessionEntry(base), true);
  assert.strictEqual(L.isValidSessionEntry(Object.assign({}, base, { fouls: 1000 })), false);
  assert.strictEqual(L.isValidSessionEntry(Object.assign({}, base, { best: 10001 })), false);
});

// ---- i18n ----
check('i18n key parity en/bn', () => {
  const en = Object.keys(I.STR.en).sort();
  const bn = Object.keys(I.STR.bn).sort();
  assert.deepStrictEqual(bn, en, 'bn keys must match en keys');
});
check('i18n digits + fmt', () => {
  assert.strictEqual(I.toBnDigits('123'), '\u09e7\u09e8\u09e9');
  assert.strictEqual(I.toBnDigits('0 ms'), '\u09e6 ms');
  assert.strictEqual(I.fmtInt(1234, 'bn'), '\u09e7\u09e8\u09e9\u09ea');
  assert.strictEqual(I.fmtInt(1234, 'en'), '1234');
  assert.strictEqual(I.fmtMs(250, 'en'), '250 ms');
  assert.strictEqual(I.fmtMs(250, 'bn'), '\u09e8\u09eb\u09e6 \u09ae\u09bf.\u09b8\u09c7.');
  assert.strictEqual(I.fmtMs(null, 'en'), '\u2014');
});
check('i18n t() lookup + fallback', () => {
  I.setLang('en');
  assert.strictEqual(I.t('start'), 'Start');
  assert.strictEqual(I.t('grade_elite'), 'Lightning');
  I.setLang('bn');
  assert.strictEqual(I.t('start'), '\u09b6\u09c1\u09b0\u09c1 \u0995\u09b0\u09c1\u09a8');
  assert.strictEqual(I.t('attemptOf', { a: '\u09e7', b: '\u09e9' }), '\u09aa\u09cd\u09b0\u099a\u09c7\u09b7\u09cd\u099f\u09be \u09e7 / \u09e9');
  assert.strictEqual(I.t('nope_missing'), 'nope_missing', 'unknown key echoes');
  I.setLang('en');
});

console.log(passed + ' unit checks passed.');
