# TEST_RESULTS.md -- reaction-time-bd (run #98, 2026-10-20 12:00 slot)

## Unit tests -- `node tests/run-tests.cjs`
18/18 passed, 0 failed.

Covered: parseAttempts (3/5/10 valid; 7/abc/empty/null rejected), grade tiers
(200 elite / 201 fast / 275 fast / 276 average / 375 average / 376 steady /
500 steady / 501 easy; -1/NaN/Infinity invalid), mean/median incl. empty=null,
randomDelay bounds (rng 0 -> 1500, ~1 -> 5000), press-while-idle ignored, early
press -> foul (fouls=1, still waiting, attempt not consumed), press exactly at
the delay boundary -> valid 0 ms result, markReady transition (second call
no-op), full 3-attempt session [180,320,250] -> best 180 / mean 250 /
median 250 / grade elite / finished, press-after-finish ignored, fouls counted
in summary, cancel resets, createSession throws on attempts=7, history entry +
envelope round-trip, validateImport rejects (null, {}, wrong-app, bad-version,
bad-sessions, negative ms, bad grade, bad date, bad attempts, n>attempts,
501 sessions), isValidSessionEntry edges (fouls 999 ok/1000 rejected,
best 10000 ok/10001 rejected), i18n EN/BN key parity, toBnDigits/fmtInt/fmtMs,
t() lookup + unknown-key echo. 0 app-logic bugs (all green first run).

## Smoke tests -- `node tests/smoke.cjs` (raw CDP, /opt/meta-chromium/chrome, file://?delay=700)
13/13 passed, 0 console/page errors, 0 HTTP requests.

Covered: title + idle pad text; attempts select set to 3; Start -> red
pad-waiting + "Wait for green\u2026" + Start disabled/Cancel enabled; immediate
pad click -> "Too soon!" foul, auto-restart to waiting, fouls=1,
meta still "1 of 3" (attempt not consumed); green -> click records integer ms
(plausible range asserted); Space keydown records 2nd attempt; 3rd attempt ->
sessionBox visible, 3 result rows, best/avg/median rendered, grade badge,
history=1, dashboard sessions=1; BN toggle -> Bengali document.title +
Bengali idle text + Bengali digit \u09e7 in dashboard; reload -> lang + history
persisted; typed-DELETE erase -> history 0 + dashboard \u09e6; wrong erase word ->
nothing erased; 390px mobile (Emulation.setDeviceMetricsOverride) ->
scrollWidth <= 390; zero console.error/exceptionThrown; zero http(s) requests.

### Repairs during smoke
1. Real app bug: `<title>` had no `data-i18n`, so the BN toggle never changed
   the document title (caught by "BN toggle" check). Fixed in index.html.
2. Test-side: BN_IDLE expectation used \u09a3 (U+09A3 is \u09a8 -- the app was correct);
   fixed the test constant.

## Hygiene
- Pure-ASCII sources verified: `grep -rP '[^\x00-\x7F]' index.html css js tests` -> zero matches
  (Bengali as \uXXXX escapes in JS; numeric entities in HTML).
- Zero network requests by design (no fetch/XHR/WebSocket in code; asserted in smoke).
- Ships empty: no preset history; localStorage written only on user actions.
- `?delay=MS` query hook pins the pre-green wait for tests only (100-10000 ms); not used in normal play.

## Totals
31/31 checks green (18 unit + 13 smoke), 0 console/page errors.
