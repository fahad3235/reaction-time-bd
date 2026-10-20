/* Reaction Time BD - bilingual strings + number formatting (no DOM). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ReactionI18n = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var BN_DIGITS = ['\u09e6', '\u09e7', '\u09e8', '\u09e9', '\u09ea', '\u09eb', '\u09ec', '\u09ed', '\u09ee', '\u09ef'];

  function toBnDigits(s) {
    return String(s).replace(/[0-9]/g, function (d) { return BN_DIGITS[+d]; });
  }

  function fmtInt(n, lang) {
    var s = String(Math.round(n));
    return lang === 'bn' ? toBnDigits(s) : s;
  }

  function fmtMs(ms, lang) {
    if (ms === null || ms === undefined) return '\u2014';
    var s = fmtInt(ms, lang);
    return lang === 'bn' ? s + ' \u09ae\u09bf.\u09b8\u09c7.' : s + ' ms';
  }

  var STR = {
    en: {
      title: 'Reaction Time BD',
      tagline: 'How fast are your reflexes? Tap the moment it turns green.',
      start: 'Start',
      cancel: 'Cancel',
      attempts: 'Attempts',
      stateIdle: 'Press Start, then wait\u2026',
      stateWaiting: 'Wait for green\u2026',
      stateWaitingSub: 'Do NOT tap yet',
      stateReady: 'TAP!',
      stateReadySub: 'now!',
      stateFoul: 'Too soon!',
      stateFoulSub: 'Wait for green \u2014 try this attempt again',
      stateResult: '{ms} \u2014 nice!',
      attemptOf: 'Attempt {a} of {b}',
      fouls: 'Fouls: {n}',
      resultsTitle: 'Session results',
      colAttempt: '#',
      colTime: 'Time',
      best: 'Best',
      average: 'Average',
      median: 'Median',
      gradeLabel: 'Grade',
      grade_elite: 'Lightning',
      grade_fast: 'Fast',
      grade_average: 'Average',
      grade_steady: 'Steady',
      grade_easy: 'Easy',
      playAgain: 'Play again',
      dashTitle: 'Your stats',
      bestEver: 'Best ever',
      sessions: 'Sessions',
      totalTaps: 'Valid taps',
      trendTitle: 'Session average \u2014 last 20',
      historyTitle: 'History',
      noHistory: 'No sessions yet \u2014 play one!',
      historyCols: 'When \u00b7 Attempts \u00b7 Best \u00b7 Avg \u00b7 Fouls',
      export: 'Export',
      import: 'Import',
      erase: 'Erase all',
      erasePrompt: 'Type DELETE to erase all history:',
      erased: 'History erased.',
      eraseCancelled: 'Erase cancelled \u2014 type DELETE exactly.',
      badImport: 'Invalid file \u2014 data unchanged.',
      imported: 'Import OK: {n} session(s).',
      footer: 'A personal fun tool \u2014 not a scientific measurement. Results depend on your device and browser. 100% offline: no data leaves your device.',
      langName: '\u09ac\u09be\u0982\u09b2\u09be'
    },
    bn: {
      title: '\u09b0\u09bf\u0985\u09cd\u09af\u09be\u0995\u09b6\u09a8 \u099f\u09be\u0987\u09ae \u09ac\u09bf\u09a1\u09bf',
      tagline: '\u0986\u09aa\u09a8\u09be\u09b0 \u09aa\u09cd\u09b0\u09a4\u09bf\u0995\u09cd\u09b0\u09bf\u09af\u09bc\u09be \u0995\u09a4 \u09a6\u09cd\u09b0\u09c1\u09a4? \u09b8\u09ac\u09c1\u099c \u09b9\u0993\u09af\u09bc\u09be\u09b0 \u09b8\u09be\u09a5\u09c7 \u09b8\u09be\u09a5\u09c7 \u099f\u09cd\u09af\u09be\u09aa \u0995\u09b0\u09c1\u09a8\u0964',
      start: '\u09b6\u09c1\u09b0\u09c1 \u0995\u09b0\u09c1\u09a8',
      cancel: '\u09ac\u09be\u09a4\u09bf\u09b2',
      attempts: '\u09aa\u09cd\u09b0\u099a\u09c7\u09b7\u09cd\u099f\u09be',
      stateIdle: '\u09b6\u09c1\u09b0\u09c1 \u099a\u09be\u09aa\u09c1\u09a8, \u09a4\u09be\u09b0\u09aa\u09b0 \u0985\u09aa\u09c7\u0995\u09cd\u09b7\u09be \u0995\u09b0\u09c1\u09a8\u2026',
      stateWaiting: '\u09b8\u09ac\u09c1\u099c\u09c7\u09b0 \u099c\u09a8\u09cd\u09af \u0985\u09aa\u09c7\u0995\u09cd\u09b7\u09be \u0995\u09b0\u09c1\u09a8\u2026',
      stateWaitingSub: '\u098f\u0996\u09a8\u09cb \u099f\u09cd\u09af\u09be\u09aa \u0995\u09b0\u09ac\u09c7\u09a8 \u09a8\u09be',
      stateReady: '\u099f\u09cd\u09af\u09be\u09aa!',
      stateReadySub: '\u098f\u0996\u09a8\u0987!',
      stateFoul: '\u0996\u09c1\u09ac \u09a4\u09be\u09a1\u09bc\u09be\u09a4\u09be\u09a1\u09bc\u09bf!',
      stateFoulSub: '\u09b8\u09ac\u09c1\u099c\u09c7\u09b0 \u099c\u09a8\u09cd\u09af \u0985\u09aa\u09c7\u0995\u09cd\u09b7\u09be \u0995\u09b0\u09c1\u09a8 \u2014 \u098f\u0987 \u09aa\u09cd\u09b0\u099a\u09c7\u09b7\u09cd\u099f\u09be \u0986\u09ac\u09be\u09b0 \u0995\u09b0\u09c1\u09a8',
      stateResult: '{ms} \u2014 \u09a6\u09be\u09b0\u09c1\u09a3!',
      attemptOf: '\u09aa\u09cd\u09b0\u099a\u09c7\u09b7\u09cd\u099f\u09be {a} / {b}',
      fouls: '\u09ab\u09be\u0989\u09b2: {n}',
      resultsTitle: '\u09b8\u09c7\u09b6\u09a8\u09c7\u09b0 \u09ab\u09b2\u09be\u09ab\u09b2',
      colAttempt: '#',
      colTime: '\u09b8\u09ae\u09af\u09bc',
      best: '\u09b8\u09c7\u09b0\u09be',
      average: '\u0997\u09a1\u09bc',
      median: '\u09ae\u09a7\u09cd\u09af\u09ae\u09be',
      gradeLabel: '\u0997\u09cd\u09b0\u09c7\u09a1',
      grade_elite: '\u09ac\u09bf\u09a6\u09cd\u09af\u09c1\u09ce\u0997\u09a4\u09bf',
      grade_fast: '\u09a6\u09cd\u09b0\u09c1\u09a4',
      grade_average: '\u0997\u09a1\u09bc',
      grade_steady: '\u09a7\u09c0\u09b0\u09b8\u09cd\u09a5\u09bf\u09b0',
      grade_easy: '\u0986\u09b0\u09be\u09ae\u09aa\u09cd\u09b0\u09bf\u09af\u09bc',
      playAgain: '\u0986\u09ac\u09be\u09b0 \u0996\u09c7\u09b2\u09c1\u09a8',
      dashTitle: '\u0986\u09aa\u09a8\u09be\u09b0 \u09aa\u09b0\u09bf\u09b8\u0982\u0996\u09cd\u09af\u09be\u09a8',
      bestEver: '\u09b8\u09b0\u09cd\u09ac\u0995\u09be\u09b2\u09c7\u09b0 \u09b8\u09c7\u09b0\u09be',
      sessions: '\u09b8\u09c7\u09b6\u09a8',
      totalTaps: '\u09ac\u09c8\u09a7 \u099f\u09cd\u09af\u09be\u09aa',
      trendTitle: '\u09b8\u09c7\u09b6\u09a8\u09c7\u09b0 \u0997\u09a1\u09bc \u2014 \u09b6\u09c7\u09b7 \u09e8\u09e6\u099f\u09bf',
      historyTitle: '\u0987\u09a4\u09bf\u09b9\u09be\u09b8',
      noHistory: '\u098f\u0996\u09a8\u09cb \u0995\u09cb\u09a8\u09cb \u09b8\u09c7\u09b6\u09a8 \u09a8\u09c7\u0987 \u2014 \u098f\u0995\u099f\u09bf \u0996\u09c7\u09b2\u09c1\u09a8!',
      historyCols: '\u0995\u0996\u09a8 \u00b7 \u09aa\u09cd\u09b0\u099a\u09c7\u09b7\u09cd\u099f\u09be \u00b7 \u09b8\u09c7\u09b0\u09be \u00b7 \u0997\u09a1\u09bc \u00b7 \u09ab\u09be\u0989\u09b2',
      export: '\u098f\u0995\u09cd\u09b8\u09aa\u09cb\u09b0\u09cd\u099f',
      import: '\u0987\u09ae\u09aa\u09cb\u09b0\u09cd\u099f',
      erase: '\u09b8\u09ac \u09ae\u09c1\u099b\u09c1\u09a8',
      erasePrompt: '\u09b8\u09ac \u0987\u09a4\u09bf\u09b9\u09be\u09b8 \u09ae\u09c1\u099b\u09a4\u09c7 DELETE \u09b2\u09bf\u0996\u09c1\u09a8:',
      erased: '\u0987\u09a4\u09bf\u09b9\u09be\u09b8 \u09ae\u09c1\u099b\u09c7 \u09ab\u09c7\u09b2\u09be \u09b9\u09af\u09bc\u09c7\u099b\u09c7\u0964',
      eraseCancelled: '\u09ac\u09be\u09a4\u09bf\u09b2 \u2014 \u09a0\u09bf\u0995 DELETE \u09b2\u09bf\u0996\u09a4\u09c7 \u09b9\u09ac\u09c7\u0964',
      badImport: '\u0985\u09ac\u09c8\u09a7 \u09ab\u09be\u0987\u09b2 \u2014 \u09a1\u09c7\u099f\u09be \u0985\u09aa\u09b0\u09bf\u09ac\u09b0\u09cd\u09a4\u09bf\u09a4 \u0986\u099b\u09c7\u0964',
      imported: '\u0987\u09ae\u09aa\u09cb\u09b0\u09cd\u099f \u09b8\u09ab\u09b2: {n}\u099f\u09bf \u09b8\u09c7\u09b6\u09a8\u0964',
      footer: '\u09ac\u09cd\u09af\u0995\u09cd\u09a4\u09bf\u0997\u09a4 \u09ae\u099c\u09be\u09b0 \u099f\u09c1\u09b2 \u2014 \u09ac\u09c8\u099c\u09cd\u099e\u09be\u09a8\u09bf\u0995 \u09aa\u09b0\u09bf\u09ae\u09be\u09aa \u09a8\u09af\u09bc\u0964 \u09ab\u09b2\u09be\u09ab\u09b2 \u0986\u09aa\u09a8\u09be\u09b0 \u09a1\u09bf\u09ad\u09be\u0987\u09b8 \u0993 \u09ac\u09cd\u09b0\u09be\u0989\u099c\u09be\u09b0\u09c7\u09b0 \u0989\u09aa\u09b0 \u09a8\u09bf\u09b0\u09cd\u09ad\u09b0 \u0995\u09b0\u09c7\u0964 \u09e7\u09e6\u09e6% \u0985\u09ab\u09b2\u09be\u0987\u09a8: \u0995\u09cb\u09a8\u09cb \u09a1\u09c7\u099f\u09be \u09a1\u09bf\u09ad\u09be\u0987\u09b8\u09c7\u09b0 \u09ac\u09be\u0987\u09b0\u09c7 \u09af\u09be\u09af\u09bc \u09a8\u09be\u0964',
      langName: 'English'
    }
  };

  var lang = 'en';

  function setLang(l) { lang = (l === 'bn') ? 'bn' : 'en'; return lang; }
  function getLang() { return lang; }

  function t(key, vars) {
    var s = (STR[lang] && STR[lang][key] !== undefined) ? STR[lang][key] : (STR.en[key] !== undefined ? STR.en[key] : key);
    if (vars) {
      Object.keys(vars).forEach(function (k) {
        s = s.split('{' + k + '}').join(String(vars[k]));
      });
    }
    return s;
  }

  return {
    STR: STR,
    setLang: setLang,
    getLang: getLang,
    t: t,
    toBnDigits: toBnDigits,
    fmtInt: fmtInt,
    fmtMs: fmtMs
  };
}));
