'use strict';
// Minimal raw-CDP client over node's built-in WebSocket (no deps).
const { spawn } = require('child_process');
const http = require('http');

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

function httpGetJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let b = '';
      res.on('data', (c) => { b += c; });
      res.on('end', () => { try { resolve(JSON.parse(b)); } catch (e) { reject(e); } });
    }).on('error', reject);
  });
}

async function launch(targetUrl, opts) {
  opts = opts || {};
  const port = 9340 + Math.floor(Math.random() * 400);
  const proc = spawn('/opt/meta-chromium/chrome', [
    '--headless=new', '--no-sandbox', '--disable-gpu', '--no-first-run',
    '--remote-debugging-port=' + port,
    '--window-size=' + (opts.width || 1280) + ',' + (opts.height || 900),
    'about:blank'
  ], { stdio: 'ignore' });

  let wsUrl = null;
  for (let i = 0; i < 120 && !wsUrl; i++) {
    await sleep(250);
    try {
      const targets = await httpGetJson('http://127.0.0.1:' + port + '/json/list');
      const page = targets.find((t) => t.type === 'page');
      if (page && page.webSocketDebuggerUrl) wsUrl = page.webSocketDebuggerUrl;
    } catch (e) { /* not up yet */ }
  }
  if (!wsUrl) { try { proc.kill(); } catch (e) {} throw new Error('chrome did not expose a page target'); }

  const ws = new WebSocket(wsUrl);
  await new Promise((res, rej) => {
    ws.addEventListener('open', res, { once: true });
    ws.addEventListener('error', rej, { once: true });
  });

  let id = 0;
  const pending = new Map();
  const errors = [];   // console.error + exceptions
  let httpRequests = 0;
  ws.addEventListener('message', (ev) => {
    let msg;
    try { msg = JSON.parse(ev.data); } catch (e) { return; }
    if (msg.id && pending.has(msg.id)) {
      const p = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) p.reject(new Error('CDP ' + msg.method + ': ' + JSON.stringify(msg.error)));
      else p.resolve(msg.result);
    } else if (msg.method === 'Runtime.consoleAPICalled' && msg.params && msg.params.type === 'error') {
      errors.push('console.error: ' + JSON.stringify(msg.params.args));
    } else if (msg.method === 'Runtime.exceptionThrown') {
      errors.push('exception: ' + (msg.params.exceptionDetails.text || 'unknown'));
    } else if (msg.method === 'Network.requestWillBeSent' && msg.params && /^https?:/.test(msg.params.request.url || '')) {
      httpRequests++;
    }
  });

  function send(method, params) {
    const cur = ++id;
    return new Promise((resolve, reject) => {
      pending.set(cur, { resolve, reject });
      ws.send(JSON.stringify({ id: cur, method, params: params || {} }));
      setTimeout(() => {
        if (pending.has(cur)) { pending.delete(cur); reject(new Error('CDP timeout: ' + method)); }
      }, 20000);
    });
  }

  await send('Runtime.enable');
  await send('Page.enable');
  await send('Network.enable');

  async function evaluate(expr, awaitPromise) {
    const r = await send('Runtime.evaluate', {
      expression: expr, awaitPromise: !!awaitPromise, returnByValue: true
    });
    if (r.exceptionDetails) throw new Error('JS exception: ' + JSON.stringify(r.exceptionDetails));
    return r.result.value;
  }

  async function waitFor(expr, timeoutMs, label) {
    const t0 = Date.now();
    for (;;) {
      const v = await evaluate('(function(){try{return (' + expr + ');}catch(e){return false;}})()');
      if (v) return v;
      if (Date.now() - t0 > (timeoutMs || 10000)) throw new Error('waitFor timed out: ' + (label || expr));
      await sleep(120);
    }
  }

  async function click(sel) {
    await evaluate('(function(){var el=document.querySelector(' + JSON.stringify(sel) + ');if(!el)throw new Error("no el '+sel+'");el.click();})()');
  }

  async function close() {
    try { ws.close(); } catch (e) {}
    try { proc.kill(); } catch (e) {}
  }

  await send('Page.navigate', { url: targetUrl });
  await sleep(900); // let the page boot

  return { send, evaluate, waitFor, click, close, errors: () => errors, httpCount: () => httpRequests };
}

module.exports = { launch, sleep };
