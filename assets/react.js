/* Labs for the React guide. They SIMULATE React's rules in plain JS so they run offline:
   - keys and reconciliation
   - useEffect dependency timeline
   - state updates: batching, stale closures, functional updater
   Pure logic is exported for Node testing. */
(function (root) {
  'use strict';
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); };
  var num = function (v) { var n = parseInt(v, 10); return isNaN(n) ? 0 : n; };

  /* ============================ Reconciliation ============================ */
  // Each item is {key, text}. Without keys React matches by position (index).
  function reconcile(oldItems, newItems, useKeys) {
    var ops = [], i, n;
    if (useKeys) {
      var oldByKey = {};
      oldItems.forEach(function (o, idx) { oldByKey[o.key] = { item: o, idx: idx }; });
      var seen = {}, lastPlaced = 0;               // React keeps items whose old index is >= lastPlaced in place and moves the rest
      newItems.forEach(function (it, idx) {
        var m = oldByKey[it.key];
        if (!m) ops.push({ type: 'create', key: it.key, text: it.text, at: idx });
        else {
          seen[it.key] = 1;
          if (m.idx < lastPlaced) ops.push({ type: 'move', key: it.key, from: m.idx, at: idx });
          else { lastPlaced = m.idx; ops.push(m.item.text !== it.text ? { type: 'update', key: it.key, text: it.text, at: idx } : { type: 'reuse', key: it.key, at: idx }); }
        }
      });
      oldItems.forEach(function (o) { if (!seen[o.key]) ops.push({ type: 'remove', key: o.key }); });
    } else {
      n = Math.max(oldItems.length, newItems.length);
      for (i = 0; i < n; i++) {
        if (i >= oldItems.length) ops.push({ type: 'create', key: newItems[i].key, text: newItems[i].text, at: i });
        else if (i >= newItems.length) ops.push({ type: 'remove', key: oldItems[i].key });
        else if (oldItems[i].text !== newItems[i].text) ops.push({ type: 'update', key: newItems[i].key, text: newItems[i].text, at: i });
        else ops.push({ type: 'reuse', key: newItems[i].key, at: i });
      }
    }
    return ops;
  }
  function parseList(s) { return s.split(',').map(function (x) { return x.trim(); }).filter(Boolean).map(function (x) { return { key: x, text: x }; }); }
  function renderRecon(host) {
    host.innerHTML = '<h4>Lab: why <code>key</code> matters (reconciliation)</h4><p>Each name is both the item text and its key. Edit the <b>new</b> list (insert at the front, remove, reorder) and compare what React must do with stable keys versus using the array index (no key). With index "keys" an insertion at the front makes <i>every</i> row look changed, and any local state (text typed into an input, focus) stays attached to the wrong row.</p>' +
      '<div class="row"><label>Old list <input id="rc-o" value="Asha, Ben, Chen" style="width:200px"></label><label>New list <input id="rc-n" value="Dara, Asha, Ben, Chen" style="width:240px"></label></div><div class="out" id="rc-out"></div>';
    function fmt(ops) {
      var c = { create: 0, update: 0, move: 0, reuse: 0, remove: 0 };
      ops.forEach(function (o) { c[o.type]++; });
      return ops.map(function (o) { return '  ' + o.type.padEnd(7) + (o.key !== undefined ? o.key : '') + (o.type === 'update' ? '  (text changed, state stays on this row)' : o.type === 'move' ? '  (moved from ' + o.from + ' to ' + o.at + ')' : ''); }).join('\n') +
        '\n  => DOM work: ' + c.create + ' create, ' + c.update + ' update, ' + c.move + ' move, ' + c.remove + ' remove, ' + c.reuse + ' untouched';
    }
    function run() {
      var o = parseList($('#rc-o', host).value), n = parseList($('#rc-n', host).value);
      $('#rc-out', host).textContent = 'WITH stable keys (key={user.id}):\n' + fmt(reconcile(o, n, true)) + '\n\nWITHOUT keys / key={index} (matched by position):\n' + fmt(reconcile(o, n, false)) + '\n\nRule: use a stable, unique id from your data. Index keys are only safe for static lists that never reorder, insert or delete.';
    }
    $$('input', host).forEach(function (el) { el.addEventListener('input', run); }); run();
  }

  /* ============================ Effect timeline ============================ */
  // renders: [{count, name}] ; mode: 'none' (no deps), 'empty' ([]), 'count' ([count]), 'both' ([count,name])
  function effectLog(mode, renders) {
    var log = [], prev = null;
    renders.forEach(function (r, i) {
      log.push('render #' + (i + 1) + '  count=' + r.count + ' name=' + r.name);
      var run;
      if (i === 0) run = true;
      else if (mode === 'none') run = true;
      else if (mode === 'empty') run = false;
      else if (mode === 'count') run = prev.count !== r.count;
      else run = prev.count !== r.count || prev.name !== r.name;
      if (run) {
        if (i > 0) log.push('   cleanup of previous effect (count=' + prev.count + ', name=' + prev.name + ')');
        log.push('   effect runs (sees count=' + r.count + ', name=' + r.name + ')');
      }
      prev = r;
    });
    log.push('unmount -> cleanup of last effect (count=' + prev.count + ', name=' + prev.name + ')');
    return log;
  }
  function renderEffect(host) {
    host.innerHTML = '<h4>Lab: useEffect dependency timeline</h4><p>Five renders happen in order. Pick the dependency array and see when the effect and its cleanup run. (Strict Mode in development also runs mount, cleanup, mount once to expose missing cleanups; the lab shows production behaviour.)</p>' +
      '<div class="row"><label>Dependencies <select id="ef-m"><option value="none">useEffect(fn)  - no array</option><option value="empty">useEffect(fn, [])</option><option value="count" selected>useEffect(fn, [count])</option><option value="both">useEffect(fn, [count, name])</option></select></label></div>' +
      '<div class="row"><label>Renders (count/name, one per line)<br><textarea id="ef-r" rows="5" style="width:260px;font-family:Consolas,monospace">0 Asha\n1 Asha\n1 Ben\n2 Ben\n2 Ben</textarea></label></div><div class="out" id="ef-out"></div>';
    function run() {
      var renders = $('#ef-r', host).value.split('\n').map(function (l) { var p = l.trim().split(/\s+/); return { count: p[0] === undefined ? '' : p[0], name: p[1] || '' }; }).filter(function (r) { return r.count !== ''; });
      if (!renders.length) { $('#ef-out', host).textContent = 'Add at least one render line like "0 Asha".'; return; }
      var log = effectLog($('#ef-m', host).value, renders), runs = log.filter(function (l) { return /effect runs/.test(l); }).length;
      $('#ef-out', host).textContent = log.join('\n') + '\n\nEffect ran ' + runs + ' time(s) for ' + renders.length + ' renders.\nRules: list every reactive value the effect reads; always clean up subscriptions, timers and listeners; never omit deps to "stop it re-running" - fix the cause instead.';
    }
    $('#ef-m', host).onchange = run; $('#ef-r', host).oninput = run; run();
  }

  /* ============================ State updates ============================ */
  // Simulates one event handler calling setCount several times in the same render (batched).
  function batchResult(initial, updates) {
    var closureCount = initial, queued = initial, steps = [];
    updates.forEach(function (u) {
      if (u === 'direct') { queued = closureCount + 1; steps.push('setCount(count + 1)   -> queues "set to ' + queued + '" (count is still ' + closureCount + ' in this render)'); }
      else if (u === 'fn') { queued = queued + 1; steps.push('setCount(c => c + 1) -> queues "add 1 to latest" (pending ' + queued + ')'); }
      else if (u === 'double') { queued = queued * 2; steps.push('setCount(c => c * 2) -> queues "double latest" (pending ' + queued + ')'); }
    });
    return { final: queued, steps: steps };
  }
  function renderBatch(host) {
    host.innerHTML = '<h4>Lab: batched state updates and stale closures</h4><p>React batches updates in one event handler and re-renders once. A handler captures the <code>count</code> of <b>its own render</b>, so calling <code>setCount(count + 1)</code> three times adds only 1. The functional form receives the latest queued value.</p>' +
      '<div class="row"><label>Starting count <input id="bt-i" type="number" value="0" style="width:70px"></label></div>' +
      '<div class="row"><label>Handler body (one call per line: <code>direct</code>, <code>fn</code>, <code>double</code>)<br><textarea id="bt-u" rows="4" style="width:240px;font-family:Consolas,monospace">direct\ndirect\ndirect</textarea></label></div><div class="out" id="bt-out"></div>';
    function run() {
      var ups = $('#bt-u', host).value.split('\n').map(function (l) { return l.trim().toLowerCase(); }).filter(function (l) { return /^(direct|fn|double)$/.test(l); });
      var r = batchResult(num($('#bt-i', host).value), ups);
      $('#bt-out', host).textContent = (r.steps.join('\n') || 'Add lines: direct / fn / double') + '\n\nAfter the handler, ONE re-render shows count = ' + r.final + '.\nTry: direct x3 gives 1; fn x3 gives 3; "fn" then "double" gives (0+1)*2 = 2, order matters.\nState is a snapshot per render; never mutate it, always set a new value.';
    }
    $$('input,textarea', host).forEach(function (el) { el.addEventListener('input', run); }); run();
  }

  var LABS = { 'recon-lab': renderRecon, 'effect-lab': renderEffect, 'batch-lab': renderBatch };
  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', function () {
      Object.keys(LABS).forEach(function (id) { var el = document.getElementById(id); if (el) LABS[id](el); });
    });
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = { reconcile: reconcile, parseList: parseList, effectLog: effectLog, batchResult: batchResult };
})(typeof window !== 'undefined' ? window : globalThis);
