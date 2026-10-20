/* Reaction Time BD - pure game logic (no DOM).
 * Injectable clock (now) + rng make the session state machine fully
 * deterministic under test. All times are integer milliseconds. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ReactionLogic = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var APP_ID = 'reaction-time-bd';
  var STORE_VERSION = 1;
  var ALLOWED_ATTEMPTS = [3, 5, 10];
  var MIN_DELAY_MS = 1500;
  var MAX_DELAY_MS = 5000;

  function defaultNow() { return Date.now(); }

  // ---- math helpers -------------------------------------------------
  function mean(xs) {
    if (!xs.length) return null;
    var s = 0, i;
    for (i = 0; i < xs.length; i++) s += xs[i];
    return s / xs.length;
  }

  function median(xs) {
    if (!xs.length) return null;
    var a = xs.slice().sort(function (x, y) { return x - y; });
    var m = Math.floor(a.length / 2);
    if (a.length % 2 === 1) return a[m];
    return (a[m - 1] + a[m]) / 2;
  }

  // Grade tiers for a single reaction time (ms).
  // Roughly anchored on the widely-reported ~250ms average for simple
  // visual reaction time; tiers are illustrative, not clinical.
  function grade(ms) {
    if (!(ms >= 0) || !isFinite(ms)) return 'invalid';
    if (ms <= 200) return 'elite';
    if (ms <= 275) return 'fast';
    if (ms <= 375) return 'average';
    if (ms <= 500) return 'steady';
    return 'easy';
  }

  function parseAttempts(v) {
    var n = parseInt(v, 10);
    if (ALLOWED_ATTEMPTS.indexOf(n) === -1) return null;
    return n;
  }

  function randomDelay(rng) {
    var r = (typeof rng === 'function') ? rng() : Math.random();
    if (!(r >= 0) || !(r < 1)) r = Math.random();
    return MIN_DELAY_MS + Math.floor(r * (MAX_DELAY_MS - MIN_DELAY_MS + 1));
  }

  // ---- session state machine ----------------------------------------
  // states: 'idle' | 'waiting' | 'ready' | 'finished'
  function createSession(opts) {
    opts = opts || {};
    var now = (typeof opts.now === 'function') ? opts.now : defaultNow;
    var attempts = parseAttempts(opts.attempts);
    if (attempts === null) throw new Error('attempts must be one of ' + ALLOWED_ATTEMPTS.join(','));

    var state = 'idle';
    var results = [];   // valid reaction times, ms (integers)
    var fouls = 0;      // early presses; do not consume an attempt
    var waitStart = 0;  // timestamp when current wait began
    var delayMs = 0;    // wait length for the current attempt
    var readyAt = 0;    // timestamp when pad turned green

    function currentAttemptNo() { return results.length + 1; }

    function startAttempt(d) {
      if (state === 'finished') return false;
      delayMs = (d >= 0 && isFinite(d)) ? Math.floor(d) : 0;
      waitStart = now();
      state = 'waiting';
      return true;
    }

    // Called by the app when its timer fires. Returns true on transition.
    function markReady() {
      if (state !== 'waiting') return false;
      readyAt = now();
      state = 'ready';
      return true;
    }

    // Returns an event object; the app renders from it.
    function press() {
      var t = now();
      if (state === 'waiting') {
        if (t - waitStart < delayMs) {
          fouls += 1;
          return { type: 'foul', attempt: currentAttemptNo(), fouls: fouls };
        }
        // Timer fired late (or test advanced the clock): treat the press as
        // landing exactly when the pad would have turned green.
        readyAt = waitStart + delayMs;
        state = 'ready';
      }
      if (state === 'ready') {
        var ms = Math.max(0, Math.round(t - readyAt));
        results.push(ms);
        var done = results.length >= attempts;
        var ev = {
          type: 'result',
          attempt: results.length,
          ms: ms,
          fouls: fouls,
          done: done
        };
        if (done) {
          state = 'finished';
          ev.summary = summary();
        } else {
          state = 'idle';
        }
        return ev;
      }
      return { type: 'ignored', state: state };
    }

    function summary() {
      return {
        n: results.length,
        attempts: attempts,
        fouls: fouls,
        best: results.length ? Math.min.apply(null, results) : null,
        mean: mean(results),
        median: median(results),
        grade: results.length ? grade(Math.min.apply(null, results)) : null,
        results: results.slice()
      };
    }

    function cancel() {
      state = 'idle';
      results = [];
      fouls = 0;
    }

    function getState() { return state; }

    return {
      startAttempt: startAttempt,
      markReady: markReady,
      press: press,
      cancel: cancel,
      summary: summary,
      getState: getState,
      currentAttemptNo: currentAttemptNo
    };
  }

  // ---- history store -------------------------------------------------
  function newHistoryEntry(summary) {
    return {
      at: new Date().toISOString(),
      attempts: summary.attempts,
      n: summary.n,
      fouls: summary.fouls,
      best: summary.best,
      mean: summary.mean,
      median: summary.median,
      grade: summary.grade
    };
  }

  function exportEnvelope(sessions) {
    return { app: APP_ID, version: STORE_VERSION, sessions: sessions };
  }

  function isValidSessionEntry(e) {
    if (!e || typeof e !== 'object') return false;
    if (typeof e.at !== 'string' || isNaN(Date.parse(e.at))) return false;
    if (ALLOWED_ATTEMPTS.indexOf(e.attempts) === -1) return false;
    if (!Number.isInteger(e.n) || e.n < 1 || e.n > e.attempts) return false;
    if (!Number.isInteger(e.fouls) || e.fouls < 0 || e.fouls > 999) return false;
    if (!Number.isInteger(e.best) || e.best < 0 || e.best > 10000) return false;
    if (typeof e.mean !== 'number' || !(e.mean >= 0) || e.mean > 10000) return false;
    if (typeof e.median !== 'number' || !(e.median >= 0) || e.median > 10000) return false;
    if (['elite', 'fast', 'average', 'steady', 'easy'].indexOf(e.grade) === -1) return false;
    return true;
  }

  function validateImport(data) {
    if (!data || typeof data !== 'object') return { ok: false, reason: 'not-object' };
    if (data.app !== APP_ID) return { ok: false, reason: 'wrong-app' };
    if (data.version !== STORE_VERSION) return { ok: false, reason: 'bad-version' };
    if (!Array.isArray(data.sessions)) return { ok: false, reason: 'bad-sessions' };
    if (data.sessions.length > 500) return { ok: false, reason: 'too-many' };
    for (var i = 0; i < data.sessions.length; i++) {
      if (!isValidSessionEntry(data.sessions[i])) return { ok: false, reason: 'bad-entry:' + i };
    }
    return { ok: true, sessions: data.sessions };
  }

  return {
    APP_ID: APP_ID,
    STORE_VERSION: STORE_VERSION,
    ALLOWED_ATTEMPTS: ALLOWED_ATTEMPTS,
    MIN_DELAY_MS: MIN_DELAY_MS,
    MAX_DELAY_MS: MAX_DELAY_MS,
    mean: mean,
    median: median,
    grade: grade,
    parseAttempts: parseAttempts,
    randomDelay: randomDelay,
    createSession: createSession,
    newHistoryEntry: newHistoryEntry,
    exportEnvelope: exportEnvelope,
    validateImport: validateImport,
    isValidSessionEntry: isValidSessionEntry
  };
}));
