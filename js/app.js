/* Reaction Time BD - UI wiring. Depends on window.ReactionLogic + window.ReactionI18n. */
(function () {
  'use strict';

  var L = window.ReactionLogic;
  var I = window.ReactionI18n;
  var SETTINGS_KEY = 'rtbd:v1:settings';
  var HISTORY_KEY = 'rtbd:v1:history';

  // Test hook: ?delay=MS pins the wait before green (documented in TEST_RESULTS.md).
  var FIXED_DELAY = null;
  try {
    var m = /(?:^|[?&])delay=(\d+)/.exec(window.location.search || '');
    if (m) {
      var d = parseInt(m[1], 10);
      if (d >= 100 && d <= 10000) FIXED_DELAY = d;
    }
  } catch (e) { /* ignore */ }

  function $(id) { return document.getElementById(id); }

  var pad, padText, padSub, padMeta, startBtn, cancelBtn, attemptsSel, langBtn;
  var sessionBox, resultsBody, resBest, resAvg, resMed, resGrade, playAgainBtn;
  var dashBest, dashSessions, dashTaps, trendSvg, trendEmpty;
  var historyList, historyEmpty, exportBtn, importBtn, importFile, eraseBtn;
  var session = null;
  var timer = null;
  var lang = 'en';
  var attempts = 5;
  var history = []; // array of validated session entries, newest first

  // ---------- storage ----------
  function loadSettings() {
    try {
      var s = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
      if (s.lang === 'bn' || s.lang === 'en') lang = s.lang;
      var a = L.parseAttempts(s.attempts);
      if (a !== null) attempts = a;
    } catch (e) { /* corrupted -> defaults */ }
  }
  function saveSettings() {
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify({ lang: lang, attempts: attempts })); }
    catch (e) { /* storage full/blocked -> app still works */ }
  }
  function loadHistory() {
    history = [];
    try {
      var raw = localStorage.getItem(HISTORY_KEY);
      if (!raw) return;
      var v = L.validateImport(JSON.parse(raw));
      if (v.ok) history = v.sessions.slice().reverse(); // newest first
    } catch (e) { /* invalid -> empty */ }
  }
  function saveHistory() {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(L.exportEnvelope(history.slice().reverse())));
    } catch (e) { /* ignore */ }
  }

  // ---------- rendering ----------
  function applyLang() {
    I.setLang(lang);
    document.documentElement.lang = (lang === 'bn') ? 'bn' : 'en';
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      el.textContent = I.t(el.getAttribute('data-i18n'));
    });
    langBtn.textContent = I.t('langName');
    renderIdle();
    renderResults();
    renderDashboard();
    renderHistory();
  }

  function setPad(cls, main, sub) {
    pad.className = 'pad ' + cls;
    padText.textContent = main;
    padSub.textContent = sub || '';
  }

  function padMetaText() {
    if (!session) return '';
    var st = session.getState();
    if (st === 'waiting' || st === 'ready') {
      var meta = I.t('attemptOf', { a: I.fmtInt(session.currentAttemptNo(), lang), b: I.fmtInt(attempts, lang) });
      var s = session.summary();
      if (s.fouls > 0) meta += ' \u00b7 ' + I.t('fouls', { n: I.fmtInt(s.fouls, lang) });
      return meta;
    }
    return '';
  }

  function renderIdle() {
    setPad('pad-idle', I.t('stateIdle'), '');
    padMeta.textContent = '';
    startBtn.disabled = false;
    cancelBtn.disabled = true;
    attemptsSel.disabled = false;
  }

  function renderWaiting() {
    setPad('pad-waiting', I.t('stateWaiting'), I.t('stateWaitingSub'));
    padMeta.textContent = padMetaText();
  }

  function renderReady() {
    setPad('pad-ready', I.t('stateReady'), I.t('stateReadySub'));
    padMeta.textContent = padMetaText();
  }

  function renderFoul() {
    setPad('pad-foul', I.t('stateFoul'), I.t('stateFoulSub'));
    padMeta.textContent = padMetaText();
  }

  function renderAttemptResult(ms) {
    setPad('pad-result', I.t('stateResult', { ms: I.fmtMs(ms, lang) }), '');
    padMeta.textContent = padMetaText();
  }

  function renderResults() {
    if (!session || session.getState() !== 'finished') {
      sessionBox.hidden = true;
      return;
    }
    var s = session.summary();
    sessionBox.hidden = false;
    resultsBody.innerHTML = '';
    s.results.forEach(function (ms, i) {
      var tr = document.createElement('tr');
      var tdA = document.createElement('td');
      tdA.textContent = I.fmtInt(i + 1, lang);
      var tdB = document.createElement('td');
      tdB.textContent = I.fmtMs(ms, lang);
      tr.appendChild(tdA);
      tr.appendChild(tdB);
      resultsBody.appendChild(tr);
    });
    resBest.textContent = I.fmtMs(s.best, lang);
    resAvg.textContent = I.fmtMs(s.mean === null ? null : Math.round(s.mean), lang);
    resMed.textContent = I.fmtMs(s.median === null ? null : Math.round(s.median), lang);
    resGrade.textContent = s.grade ? I.t('grade_' + s.grade) : '\u2014';
    resGrade.className = 'grade grade-' + (s.grade || 'none');
  }

  function renderDashboard() {
    var best = null, taps = 0;
    history.forEach(function (h) {
      if (best === null || h.best < best) best = h.best;
      taps += h.n;
    });
    dashBest.textContent = I.fmtMs(best, lang);
    dashSessions.textContent = I.fmtInt(history.length, lang);
    dashTaps.textContent = I.fmtInt(taps, lang);
    renderTrend();
  }

  function renderTrend() {
    var pts = history.slice(0, 20).reverse().map(function (h) { return h.mean; });
    trendSvg.innerHTML = '';
    if (pts.length < 2) {
      trendEmpty.hidden = false;
      trendSvg.hidden = true;
      return;
    }
    trendEmpty.hidden = true;
    trendSvg.hidden = false;
    var W = 600, H = 160, P = 18;
    var lo = Math.min.apply(null, pts), hi = Math.max.apply(null, pts);
    if (hi - lo < 1) { hi += 25; lo = Math.max(0, lo - 25); }
    var step = (W - 2 * P) / (pts.length - 1);
    var path = pts.map(function (v, i) {
      var x = (P + i * step).toFixed(1);
      var y = (H - P - ((v - lo) / (hi - lo)) * (H - 2 * P)).toFixed(1);
      return (i === 0 ? 'M' : 'L') + x + ' ' + y;
    }).join(' ');
    var NS = 'http://www.w3.org/2000/svg';
    var el = document.createElementNS(NS, 'path');
    el.setAttribute('d', path);
    el.setAttribute('fill', 'none');
    el.setAttribute('stroke', '#2563eb');
    el.setAttribute('stroke-width', '3');
    trendSvg.appendChild(el);
    pts.forEach(function (v, i) {
      var c = document.createElementNS(NS, 'circle');
      c.setAttribute('cx', (P + i * step).toFixed(1));
      c.setAttribute('cy', (H - P - ((v - lo) / (hi - lo)) * (H - 2 * P)).toFixed(1));
      c.setAttribute('r', '4');
      c.setAttribute('fill', '#2563eb');
      trendSvg.appendChild(c);
    });
  }

  function fmtDate(iso) {
    var d = new Date(iso);
    var s = d.toLocaleString(lang === 'bn' ? 'bn-BD' : 'en-GB', {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
    return s;
  }

  function renderHistory() {
    historyList.innerHTML = '';
    if (!history.length) {
      historyEmpty.hidden = false;
      return;
    }
    historyEmpty.hidden = true;
    history.forEach(function (h) {
      var li = document.createElement('li');
      li.className = 'hist-row';
      li.textContent = fmtDate(h.at) + ' \u00b7 ' +
        I.fmtInt(h.n, lang) + '/' + I.fmtInt(h.attempts, lang) + ' \u00b7 ' +
        I.t('best') + ' ' + I.fmtMs(h.best, lang) + ' \u00b7 ' +
        I.t('average') + ' ' + I.fmtMs(Math.round(h.mean), lang) + ' \u00b7 ' +
        I.t('fouls', { n: I.fmtInt(h.fouls, lang) }) + ' \u00b7 ' +
        I.t('grade_' + h.grade);
      historyList.appendChild(li);
    });
  }

  // ---------- session flow ----------
  function clearTimer() {
    if (timer !== null) { clearTimeout(timer); timer = null; }
  }

  function pickDelay() {
    return FIXED_DELAY !== null ? FIXED_DELAY : L.randomDelay();
  }

  var lastDelay = 0;

  function nextAttempt() {
    lastDelay = pickDelay();
    session.startAttempt(lastDelay);
    renderWaiting();
    var cur = session;
    clearTimer();
    timer = setTimeout(function () {
      if (session !== cur) return;
      if (session.markReady()) renderReady();
    }, lastDelay);
  }

  function startSession() {
    var a = L.parseAttempts(attemptsSel.value);
    if (a === null) return;
    attempts = a;
    saveSettings();
    session = L.createSession({ attempts: attempts });
    sessionBox.hidden = true;
    startBtn.disabled = true;
    cancelBtn.disabled = false;
    attemptsSel.disabled = true;
    startBtn.blur();
    nextAttempt();
  }

  function endSessionUI() {
    clearTimer();
    session = null;
    renderIdle();
  }

  function finishSession(summary) {
    clearTimer();
    history.unshift(L.newHistoryEntry(summary));
    if (history.length > 200) history.length = 200;
    saveHistory();
    renderResults();
    renderDashboard();
    renderHistory();
    startBtn.disabled = false;
    cancelBtn.disabled = true;
    attemptsSel.disabled = false;
    setPad('pad-idle', I.t('stateIdle'), '');
    padMeta.textContent = '';
  }

  function onPadPress() {
    if (!session) return;
    var ev = session.press();
    if (ev.type === 'foul') {
      renderFoul();
      // Restart the same attempt (attempt number unchanged) with a fresh delay.
      var cur = session;
      clearTimer();
      timer = setTimeout(function () {
        if (session !== cur) return;
        nextAttempt();
      }, 900);
      padMeta.textContent = padMetaText();
      return;
    }
    if (ev.type === 'result') {
      clearTimer();
      renderAttemptResult(ev.ms);
      var cur = session;
      if (ev.done) {
        setTimeout(function () {
          if (session !== cur) return;
          finishSession(ev.summary);
        }, 900);
      } else {
        setTimeout(function () {
          if (session !== cur) return;
          nextAttempt();
        }, 900);
      }
      return;
    }
    // ignored: press while idle/finished \u2014 nothing to do
  }

  // ---------- data tab ----------
  function doExport() {
    var blob = new Blob([JSON.stringify(L.exportEnvelope(history.slice().reverse()), null, 2)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'reaction-time-bd-history.json';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
      URL.revokeObjectURL(a.href);
      a.remove();
    }, 500);
  }

  function doImport(file) {
    var rd = new FileReader();
    rd.onload = function () {
      try {
        var v = L.validateImport(JSON.parse(rd.result));
        if (!v.ok) { alert(I.t('badImport')); return; }
        history = v.sessions.slice().reverse();
        saveHistory();
        renderDashboard();
        renderHistory();
        alert(I.t('imported', { n: I.fmtInt(history.length, lang) }));
      } catch (e) { alert(I.t('badImport')); }
    };
    rd.readAsText(file);
  }

  function doErase() {
    var w = prompt(I.t('erasePrompt'), '');
    if (w === null) return;
    if (w !== 'DELETE') { alert(I.t('eraseCancelled')); return; }
    history = [];
    saveHistory();
    renderDashboard();
    renderHistory();
    alert(I.t('erased'));
  }

  // ---------- init ----------
  function init() {
    pad = $('pad'); padText = $('padText'); padSub = $('padSub'); padMeta = $('padMeta');
    startBtn = $('startBtn'); cancelBtn = $('cancelBtn'); attemptsSel = $('attemptsSel'); langBtn = $('langBtn');
    sessionBox = $('sessionBox'); resultsBody = $('resultsBody');
    resBest = $('resBest'); resAvg = $('resAvg'); resMed = $('resMed'); resGrade = $('resGrade');
    playAgainBtn = $('playAgainBtn');
    dashBest = $('dashBest'); dashSessions = $('dashSessions'); dashTaps = $('dashTaps');
    trendSvg = $('trendSvg'); trendEmpty = $('trendEmpty');
    historyList = $('historyList'); historyEmpty = $('historyEmpty');
    exportBtn = $('exportBtn'); importBtn = $('importBtn'); importFile = $('importFile'); eraseBtn = $('eraseBtn');

    loadSettings();
    loadHistory();
    attemptsSel.value = String(attempts);

    startBtn.addEventListener('click', startSession);
    cancelBtn.addEventListener('click', endSessionUI);
    playAgainBtn.addEventListener('click', function () { sessionBox.hidden = true; session = null; renderIdle(); });
    pad.addEventListener('click', onPadPress);
    document.addEventListener('keydown', function (e) {
      if (e.code === 'Space' && session && (session.getState() === 'waiting' || session.getState() === 'ready')) {
        e.preventDefault();
        onPadPress();
      }
    });
    attemptsSel.addEventListener('change', function () {
      var a = L.parseAttempts(attemptsSel.value);
      if (a !== null) { attempts = a; saveSettings(); }
    });
    langBtn.addEventListener('click', function () {
      lang = (lang === 'bn') ? 'en' : 'bn';
      saveSettings();
      applyLang();
    });
    exportBtn.addEventListener('click', doExport);
    importBtn.addEventListener('click', function () { importFile.click(); });
    importFile.addEventListener('change', function () {
      if (importFile.files.length) doImport(importFile.files[0]);
      importFile.value = '';
    });
    eraseBtn.addEventListener('click', doErase);

    applyLang();

    // Test/debug handle (used by the headless smoke tests).
    window.__rt = {
      state: function () { return session ? session.getState() : 'none'; },
      historyCount: function () { return history.length; },
      summary: function () { return session ? session.summary() : null; }
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
