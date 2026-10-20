# Reaction Time BD

A free, fully offline bilingual (Bangla/English) reaction-time tester. The pad turns red -- wait. The moment it flashes green, tap (or press Space). Your time in milliseconds is measured per attempt, over a best-of-3/5/10 session, with grades, fouls for early taps, session history, and a trend chart.

## Problem

Quick reflex checks online are usually ad-riddled, English-only, and phone home with your data. This is a clean, offline, Bengali-friendly alternative for a fun 30-second reflex check.

## Features

- **Reaction pad**: red "wait" -> green "TAP!" with a random 1.5-5 s delay per attempt
- **Early-tap fouls**: tapping red shows "Too soon!" and restarts the same attempt (fouls don't consume attempts)
- **Sessions**: best of 3 / 5 / 10 attempts, per-attempt table, best / average / median, grade badge (Lightning -> Easy)
- **Keyboard play**: Space bar works as the tap
- **Dashboard**: best-ever time, session count, total valid taps, SVG trend of last 20 session averages
- **History**: per-session log (best/avg/fouls/grade) persisted in localStorage
- **Data tab**: JSON export / strict-validated import / typed-`DELETE` erase-all
- **Bilingual**: EN/\u09ac\u09be\u0982\u09b2\u09be toggle persisted, Bengali digits in BN mode
- **Mobile**: 390 px layout with no horizontal overflow
- **Offline**: zero network requests; no data leaves the device

## Stack

Vanilla HTML + CSS + JS. No frameworks, no build step, no dependencies.

## Prerequisites

Any modern browser. Node.js (v18+) only for running the test suites.

## Install & run

```bash
# serve the folder (or just open index.html directly)
npx serve .
# or
python3 -m http.server 8000
```

Open `http://localhost:8000` -- play immediately.

## Dev commands

```bash
node tests/run-tests.cjs   # deterministic unit tests (logic + i18n)
node tests/smoke.cjs       # headless-Chrome smoke tests (raw CDP, /opt/meta-chromium/chrome)
```

The smoke suite pins the wait-before-green with the `?delay=MS` query hook
(e.g. `index.html?delay=700`); it is a test hook only and changes nothing in normal play.

## Env

None. No API keys, no backend, no build-time config.

## Testing

- **Unit** (`node tests/run-tests.cjs`): 18 checks -- state machine (idle/waiting/ready/finished), foul vs valid press at the exact delay boundary, full-session summary (best/mean/median/grade), cancel, attempts validation, grade tiers, `randomDelay` bounds, history envelope + 10 strict-import rejections, i18n key parity and Bengali-digit formatting.
- **Smoke** (`node tests/smoke.cjs`): 13 checks in headless Chromium -- title, attempts select, red wait state, early-click foul + attempt restart, green tap recording, Space-key tap, 3-attempt session completion with results/history, BN toggle (Bengali title + digits), reload persistence, typed-DELETE erase, wrong-word erase rejection, 390 px no-overflow, zero console/page errors, zero HTTP requests.

## Deployment

Static site -- any static host works. GitHub Pages: push to `main`, enable Pages (main/root).

## Limitations

- Timings depend on device, browser, and input latency -- this is a toy, **not** a scientific measurement of reaction time.
- Grade tiers are illustrative, anchored loosely on the commonly reported ~250 ms average for simple visual reaction time.
- History is capped at 200 sessions in localStorage.

## Status

Built 2026-10-20 (factory run #98). Tests: 18/18 unit + 13/13 smoke green, 0 console/page errors.
