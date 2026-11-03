/* Interactive labs for the "AngularJS Concepts" guide:
   - digest cycle simulator
   - ngRoute-style route matcher
   - browser storage playground (localStorage / sessionStorage / cookie / memory)
   Pure logic is exported for Node testing. */
(function (root) {
  'use strict';
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); };

  /* ============================ Digest cycle simulator ============================ */
  function makeWatchers(opts) {
    var w = [
      { id: 'w1', name: 'W1 {{ a }}->b', expr: 'a', get: function (s) { return s.a; }, fn: function (s, n) { s.b = n * 2; } },
      { id: 'w2', name: 'W2 b->c', expr: 'b', get: function (s) { return s.b; }, fn: function (s, n) { s.c = n + 1; } },
      { id: 'w3', name: 'W3 c->label', expr: 'c', get: function (s) { return s.c; }, fn: function (s, n) { s.label = 'c is ' + n; } }
    ];
    if (opts && opts.bad) w.push({ id: 'w4', name: 'W4 (bad) c->a++', expr: 'c', get: function (s) { return s.c; }, fn: function (s) { s.a = s.a + 1; } });
    return w;
  }
  function digest(state, watchers, last, ttl) {
    ttl = ttl || 10;
    var log = [], pass = 0, dirty;
    do {
      dirty = false; pass++;
      if (pass > ttl) { log.push('ERROR $rootScope:infdig - ' + ttl + ' $digest() iterations reached. Aborting!'); return { log: log, error: true, passes: ttl }; }
      var changed = [];
      for (var i = 0; i < watchers.length; i++) {
        var w = watchers[i], v = w.get(state), has = Object.prototype.hasOwnProperty.call(last, w.id);
        if (!has || last[w.id] !== v) {
          dirty = true; changed.push(w.name + ' (' + (has ? last[w.id] : 'init') + ' -> ' + v + ')');
          var old = has ? last[w.id] : v; last[w.id] = v; w.fn(state, v, old);
        }
      }
      log.push('Pass ' + pass + ': ' + (changed.length ? 'DIRTY  ' + changed.join(', ') : 'clean (nothing changed) - digest finished'));
    } while (dirty);
    return { log: log, error: false, passes: pass };
  }
  function renderDigest(host) {
    var model = { a: 1, b: 0, c: 0, label: '' }, view = { a: '-', b: '-', c: '-', label: '-' }, last = {}, bad = false;
    host.innerHTML = '<h4>Lab: the digest cycle</h4><p>The <b>model</b> is what your JavaScript holds. The <b>view</b> only shows values after a digest ran. Watchers: <code>a &rarr; b = a*2</code>, <code>b &rarr; c = b+1</code>, <code>c &rarr; label</code>. Watch how many passes are needed, and what happens when you change data outside AngularJS.</p>' +
      '<div class="row"><label>a = <input id="dg-a" type="number" value="1" style="width:70px"></label>' +
      '<button class="btn primary" id="dg-apply" type="button">Change via ng-model / ng-click (runs $apply)</button>' +
      '<button class="btn" id="dg-timeout" type="button">Change via setTimeout (NO digest)</button>' +
      '<button class="btn" id="dg-run" type="button">Run $digest now</button></div>' +
      '<div class="row"><label><input type="checkbox" id="dg-bad"> add a bad watcher that changes <code>a</code> every time <code>c</code> changes (infinite loop)</label></div>' +
      '<div class="grid2"><div class="card"><h4>Model (JavaScript)</h4><div class="out" id="dg-model"></div></div><div class="card"><h4>View (what the user sees)</h4><div class="out" id="dg-view"></div></div></div>' +
      '<div class="out" id="dg-log"></div>';
    function paint() {
      $('#dg-model', host).textContent = 'a = ' + model.a + '\nb = ' + model.b + '\nc = ' + model.c + '\nlabel = "' + model.label + '"';
      $('#dg-view', host).textContent = 'a = ' + view.a + '\nb = ' + view.b + '\nc = ' + view.c + '\nlabel = "' + view.label + '"' + (JSON.stringify(view) !== JSON.stringify({ a: model.a, b: model.b, c: model.c, label: model.label }) ? '\n\n(STALE: model changed but no digest ran)' : '');
    }
    function runDigest(prefix) {
      var r = digest(model, makeWatchers({ bad: bad }), last, 10);
      if (!r.error) view = { a: model.a, b: model.b, c: model.c, label: model.label };
      $('#dg-log', host).textContent = (prefix ? prefix + '\n' : '') + r.log.join('\n') + (r.error ? '\n\nThe view was NOT updated because the digest threw.' : '\n\nTotal passes: ' + r.passes + ' (every watcher is evaluated in each pass, so cost = watchers x passes)');
      paint();
    }
    function readA() { var v = parseInt($('#dg-a', host).value, 10); return isNaN(v) ? 0 : v; }
    $('#dg-bad', host).onchange = function () { bad = this.checked; };
    $('#dg-apply', host).onclick = function () { model.a = readA(); runDigest('$scope.$apply(function () { a = ' + model.a + ' })'); };
    $('#dg-timeout', host).onclick = function () { model.a = readA(); $('#dg-log', host).textContent = 'setTimeout(function () { $scope.a = ' + model.a + ' }, 0)\nThe model changed, but AngularJS was not told, so no digest runs and the view stays stale.\nFix: use $timeout, or wrap the change in $scope.$apply(...), or call $scope.$applyAsync().'; paint(); };
    $('#dg-run', host).onclick = function () { runDigest('$rootScope.$digest()'); };
    runDigest('Initial digest after bootstrap (first pass is always dirty because watchers have no previous value)');
  }

  /* ============================ ngRoute matcher ============================ */
  function pathRegExp(path) {
    var keys = [];
    var re = path.replace(/([().])/g, '\\$1').replace(/(\/)?:(\w+)(\*\?|[?*])?/g, function (_, slash, key, option) {
      var optional = (option === '?' || option === '*?') ? '?' : '', star = option === '*' || option === '*?';
      keys.push(key); slash = slash || '';
      return (optional ? '' : slash) + '(?:' + (optional ? slash : '') + (star ? '(.+?)' : '([^/]+)') + optional + ')' + optional;
    }).replace(/([/$*])/g, '\\$1');
    return { regexp: new RegExp('^' + re + '$', 'i'), keys: keys };
  }
  function matchPath(tpl, url) {
    var u = url.split('?')[0].replace(/(.)\/$/, '$1'), r = pathRegExp(tpl), m = r.regexp.exec(u);
    if (!m) return null;
    var params = {};
    for (var i = 1; i < m.length; i++) if (m[i] !== undefined) { try { params[r.keys[i - 1]] = decodeURIComponent(m[i]); } catch (e) { params[r.keys[i - 1]] = m[i]; } }
    return params;
  }
  function parseQuery(url) {
    var q = url.split('?')[1], out = {};
    if (!q) return out;
    q.split('&').forEach(function (p) { if (!p) return; var kv = p.split('='); out[decodeURIComponent(kv[0])] = kv.length > 1 ? decodeURIComponent(kv[1]) : true; });
    return out;
  }
  function resolveRoute(routes, url) {
    for (var i = 0; i < routes.length; i++) {
      var p = matchPath(routes[i], url);
      if (p) return { index: i, route: routes[i], params: p, query: parseQuery(url) };
    }
    return null;
  }
  function renderRoute(host) {
    var presets = [
      ['/products/42?tab=reviews', '/products\n/products/:id\n/products/:id/reviews/:reviewId?\n/files/:path*\n/'],
      ['/files/2024/q1/report.pdf', '/files/:name\n/files/:path*\n/'],
      ['/products/42/reviews', '/products/:id\n/products/:id/reviews/:reviewId?\n/'],
      ['/unknown/page', '/products\n/products/:id\n/']
    ];
    host.innerHTML = '<h4>Lab: ngRoute path matcher</h4><p>Routes are tried <b>in the order defined</b>; the first match wins, otherwise <code>.otherwise()</code> applies. Syntax: <code>:id</code> required parameter, <code>:id?</code> optional, <code>:path*</code> matches across slashes.</p>' +
      '<div class="row"><select id="nr-pre">' + presets.map(function (p, i) { return '<option value="' + i + '">' + esc(p[0]) + '</option>'; }).join('') + '</select><label>URL <input id="nr-url" style="width:300px" value="' + esc(presets[0][0]) + '"></label></div>' +
      '<textarea id="nr-tpl" rows="6" style="width:100%;font-family:Consolas,monospace">' + esc(presets[0][1]) + '</textarea><div class="out" id="nr-out"></div>';
    function run() {
      var tpls = $('#nr-tpl', host).value.split('\n').map(function (s) { return s.trim(); }).filter(Boolean), url = $('#nr-url', host).value, o = '', winner = null;
      tpls.forEach(function (t, i) {
        var p = null; try { p = matchPath(t, url); } catch (e) { o += '[error]    ' + t + '  (' + e.message + ')\n'; return; }
        if (p && !winner) winner = { i: i, t: t, p: p };
        o += (p ? (winner && winner.i === i ? '[MATCH]    ' : '[match, but later] ') : '[no match] ') + t + (p ? '   ' + JSON.stringify(p) : '') + '\n';
      });
      o += '\n' + (winner ? 'RESULT: route #' + (winner.i + 1) + ' "' + winner.t + '" is activated.\n$routeParams = ' + JSON.stringify(winner.p) + '\n$location.search() = ' + JSON.stringify(parseQuery(url)) : 'RESULT: no route matches -> .otherwise({ redirectTo: ... }) or an empty view.');
      $('#nr-out', host).textContent = o;
    }
    $('#nr-pre', host).onchange = function () { var p = presets[+this.value]; $('#nr-url', host).value = p[0]; $('#nr-tpl', host).value = p[1]; run(); };
    $('#nr-url', host).oninput = run; $('#nr-tpl', host).oninput = run; run();
  }

  /* ============================ Storage playground ============================ */
  var PFX = 'ngguide.';
  function makeBackends() {
    var mem = {};
    function web(name) {
      return {
        label: name,
        available: function () { try { var s = root[name]; s.setItem(PFX + '__t', '1'); s.removeItem(PFX + '__t'); return true; } catch (e) { return false; } },
        set: function (k, v) { root[name].setItem(PFX + k, v); },
        get: function (k) { return root[name].getItem(PFX + k); },
        del: function (k) { root[name].removeItem(PFX + k); },
        keys: function () { var r = []; for (var i = 0; i < root[name].length; i++) { var k = root[name].key(i); if (k.indexOf(PFX) === 0) r.push(k.slice(PFX.length)); } return r; }
      };
    }
    var cookie = {
      label: 'cookie',
      available: function () { try { document.cookie = PFX + '__t=1; path=/'; var ok = document.cookie.indexOf(PFX + '__t=1') >= 0; document.cookie = PFX + '__t=; path=/; max-age=0'; return ok; } catch (e) { return false; } },
      set: function (k, v) { document.cookie = encodeURIComponent(PFX + k) + '=' + encodeURIComponent(v) + '; path=/; max-age=3600; samesite=lax'; },
      get: function (k) { var n = encodeURIComponent(PFX + k) + '=', parts = document.cookie.split('; '); for (var i = 0; i < parts.length; i++) if (parts[i].indexOf(n) === 0) return decodeURIComponent(parts[i].slice(n.length)); return null; },
      del: function (k) { document.cookie = encodeURIComponent(PFX + k) + '=; path=/; max-age=0'; },
      keys: function () { return document.cookie.split('; ').map(function (p) { return decodeURIComponent(p.split('=')[0]); }).filter(function (k) { return k.indexOf(PFX) === 0 && k !== PFX + '__t'; }).map(function (k) { return k.slice(PFX.length); }); }
    };
    var memory = {
      label: 'memory (service variable)',
      available: function () { return true; },
      set: function (k, v) { mem[k] = String(v); },
      get: function (k) { return Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null; },
      del: function (k) { delete mem[k]; },
      keys: function () { return Object.keys(mem); }
    };
    return { localStorage: web('localStorage'), sessionStorage: web('sessionStorage'), cookie: cookie, memory: memory };
  }
  var NOTES = {
    localStorage: 'Persistent, ~5 MB per origin, strings only, synchronous, readable by any script, shared by all tabs (fires the "storage" event in the OTHER tabs).',
    sessionStorage: 'Cleared when the TAB closes, ~5 MB, strings only, NOT shared between tabs (each tab has its own copy), readable by any script.',
    cookie: 'Sent to the server on EVERY matching request, ~4 KB each, can have Expires/HttpOnly/Secure/SameSite (HttpOnly only via the server). This lab sets max-age=3600.',
    memory: 'Lives in a JavaScript variable: gone on refresh, invisible to other tabs, hardest for XSS to harvest. Reload the page to see it vanish.'
  };
  function renderStorage(host) {
    var B = makeBackends();
    host.innerHTML = '<h4>Lab: browser storage playground (real storage)</h4><p>Writes go to your actual browser using the key prefix <code>' + PFX + '</code>. Try the same key in different stores, open this page in a second tab, and reload to see what survives.</p>' +
      '<div class="row"><label>Store <select id="st-s"><option value="localStorage">localStorage</option><option value="sessionStorage">sessionStorage</option><option value="cookie">cookie ($cookies)</option><option value="memory">memory (service variable)</option></select></label>' +
      '<label>Key <input id="st-k" value="theme" style="width:110px"></label><label>Value <input id="st-v" value="dark" style="width:150px"></label></div>' +
      '<div class="row"><button class="btn primary" id="st-set" type="button">setItem</button><button class="btn" id="st-get" type="button">getItem</button><button class="btn" id="st-del" type="button">removeItem</button><button class="btn" id="st-obj" type="button">Store an object with JSON.stringify</button><button class="btn" id="st-quota" type="button">Measure quota (writes then cleans up)</button></div>' +
      '<div class="out" id="st-out"></div><div class="out" id="st-all"></div>';
    var out = $('#st-out', host);
    function cur() { return B[$('#st-s', host).value]; }
    function say(t) { out.textContent = t; list(); }
    function list() {
      var s = cur(), rows = [];
      if (!s.available()) { $('#st-all', host).textContent = s.label + ' is not available here (blocked by the browser, private mode or the file:// origin).'; return; }
      s.keys().forEach(function (k) { var v = s.get(k); rows.push(k.padEnd(14) + '= ' + (v && v.length > 70 ? v.slice(0, 67) + '...' : v)); });
      $('#st-all', host).textContent = 'Keys currently in ' + s.label + ' (prefix "' + PFX + '"):\n' + (rows.length ? rows.join('\n') : '(none)');
    }
    function guard(fn) {
      var s = cur();
      if (!s.available()) { say(s.label + ' is not available in this context.'); return; }
      try { fn(s); } catch (e) { say('ERROR: ' + e.name + ' - ' + e.message + (e.name === 'QuotaExceededError' ? '\nThe store is full: handle this in your wrapper service.' : '')); }
    }
    $('#st-s', host).onchange = function () { say(NOTES[this.value]); };
    $('#st-set', host).onclick = function () { guard(function (s) { var k = $('#st-k', host).value, v = $('#st-v', host).value; s.set(k, v); say('setItem("' + k + '", "' + v + '") OK in ' + s.label + '.\n' + NOTES[$('#st-s', host).value]); }); };
    $('#st-get', host).onclick = function () { guard(function (s) { var k = $('#st-k', host).value, v = s.get(k); say('getItem("' + k + '") -> ' + (v === null ? 'null (missing)' : JSON.stringify(v)) + '\nNote: always a STRING or null; parse numbers/objects yourself.'); }); };
    $('#st-del', host).onclick = function () { guard(function (s) { var k = $('#st-k', host).value; s.del(k); say('removeItem("' + k + '") done.'); }); };
    $('#st-obj', host).onclick = function () { guard(function (s) { var o = { lang: 'en', pageSize: 20, saved: new Date().toISOString() }; s.set('prefs', JSON.stringify(o)); say('Stored key "prefs" = ' + JSON.stringify(o) + '\nRead back: JSON.parse(getItem("prefs")).pageSize = ' + JSON.parse(s.get('prefs')).pageSize + '\nWithout JSON.stringify an object would be saved as "[object Object]".'); }); };
    $('#st-quota', host).onclick = function () {
      var name = $('#st-s', host).value;
      if (name !== 'localStorage' && name !== 'sessionStorage') { say('Quota measurement is for localStorage / sessionStorage. A cookie is limited to ~4 KB per cookie.'); return; }
      guard(function (s) {
        var chunk = new Array(10001).join('x'), n = 0, keys = [];
        try { while (n < 2000) { s.set('__q' + n, chunk); keys.push('__q' + n); n++; } } catch (e) { /* full */ }
        keys.forEach(function (k) { s.del(k); });
        say('Wrote ' + n + ' x 10,000 characters before the store refused more (~' + (n * 10000 / 1e6).toFixed(1) + ' million characters; roughly 5 MB because strings use 2 bytes per character). All test keys were removed.');
      });
    };
    say(NOTES.localStorage);
  }

  var LABS = { 'ng-digest-lab': renderDigest, 'ng-route-lab': renderRoute, 'ng-storage-lab': renderStorage };
  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', function () {
      Object.keys(LABS).forEach(function (id) { var el = document.getElementById(id); if (el) LABS[id](el); });
    });
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = { digest: digest, makeWatchers: makeWatchers, matchPath: matchPath, resolveRoute: resolveRoute, parseQuery: parseQuery };
})(typeof window !== 'undefined' ? window : globalThis);
