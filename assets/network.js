/* Labs for the Networking & HTTP guide:
   - CIDR / subnet calculator
   - HTTP cache decision simulator (Cache-Control, ETag, age)
   - CORS decision simulator (simple vs preflight)
   Pure logic is exported for Node testing. */
(function (root) {
  'use strict';
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var num = function (v) { var n = parseInt(v, 10); return isNaN(n) ? 0 : n; };

  /* ============================ CIDR ============================ */
  function ip2int(ip) {
    var p = String(ip).trim().split('.');
    if (p.length !== 4) return null;
    var n = 0;
    for (var i = 0; i < 4; i++) { if (!/^\d{1,3}$/.test(p[i]) || +p[i] > 255) return null; n = n * 256 + +p[i]; }
    return n;
  }
  function int2ip(n) { return [Math.floor(n / 16777216) % 256, Math.floor(n / 65536) % 256, Math.floor(n / 256) % 256, n % 256].join('.'); }
  function cidr(text) {
    var m = String(text).trim().match(/^([\d.]+)\/(\d{1,2})$/);
    if (!m) return { error: 'Use the form 192.168.10.37/24' };
    var ip = ip2int(m[1]), p = +m[2];
    if (ip === null) return { error: 'Invalid IPv4 address' };
    if (p > 32) return { error: 'Prefix must be 0-32' };
    var size = Math.pow(2, 32 - p), mask = p === 0 ? 0 : (0xFFFFFFFF - (size - 1)) >>> 0;
    var net = Math.floor(ip / size) * size, bc = net + size - 1;
    var usable = p >= 31 ? (p === 32 ? 1 : 2) : size - 2;
    var cls = ip < 128 * 16777216 ? 'A' : ip < 192 * 16777216 ? 'B' : ip < 224 * 16777216 ? 'C' : 'D/E';
    var priv = (ip >= ip2int('10.0.0.0') && ip <= ip2int('10.255.255.255')) || (ip >= ip2int('172.16.0.0') && ip <= ip2int('172.31.255.255')) || (ip >= ip2int('192.168.0.0') && ip <= ip2int('192.168.255.255'));
    return { network: int2ip(net), broadcast: int2ip(bc), mask: int2ip(mask), wildcard: int2ip((0xFFFFFFFF - mask) >>> 0), first: p >= 31 ? int2ip(net) : int2ip(net + 1), last: p >= 31 ? int2ip(bc) : int2ip(bc - 1), total: size, usable: usable, cls: cls, priv: priv, bin: ip.toString(2).padStart(32, '0').replace(/(.{8})(?=.)/g, '$1.') };
  }
  function split(text, newPrefix) {
    var c = cidr(text);
    if (c.error) return c;
    var p = +String(text).split('/')[1];
    if (newPrefix <= p || newPrefix > 32) return { error: 'New prefix must be larger than ' + p + ' and at most 32' };
    var count = Math.pow(2, newPrefix - p), size = Math.pow(2, 32 - newPrefix), base = ip2int(c.network), out = [];
    for (var i = 0; i < Math.min(count, 16); i++) out.push(int2ip(base + i * size) + '/' + newPrefix);
    return { count: count, shown: out };
  }
  function renderCidr(host) {
    host.innerHTML = '<h4>Lab: CIDR / subnet calculator</h4><p>A /N prefix means the first N bits identify the network and the remaining bits identify hosts. Each extra bit halves the subnet. Try <code>10.0.0.0/16</code>, <code>192.168.10.37/24</code>, <code>172.16.5.130/26</code>.</p>' +
      '<div class="row"><label>IP/prefix <input id="cd-i" value="192.168.10.37/26" style="width:180px"></label><label>Split into /<input id="cd-p" type="number" value="28" style="width:60px"></label></div><div class="out" id="cd-out"></div>';
    function run() {
      var c = cidr($('#cd-i', host).value), o;
      if (c.error) { $('#cd-out', host).textContent = c.error; return; }
      var s = split($('#cd-i', host).value, num($('#cd-p', host).value));
      o = 'Network address : ' + c.network + '\nBroadcast       : ' + c.broadcast + '\nSubnet mask     : ' + c.mask + '\nFirst / last host: ' + c.first + ' - ' + c.last + '\nTotal addresses : ' + c.total.toLocaleString() + '   usable hosts: ' + c.usable.toLocaleString() + '\nClass ' + c.cls + ', ' + (c.priv ? 'PRIVATE (RFC 1918)' : 'public / other') + '\nIP in binary    : ' + c.bin + '\n\n';
      o += s.error ? s.error : 'Split into ' + s.count + ' x /' + num($('#cd-p', host).value) + ' subnets' + (s.count > 16 ? ' (first 16 shown)' : '') + ':\n  ' + s.shown.join('\n  ');
      o += '\n\nCloud note: Azure reserves 5 addresses per subnet and AWS reserves 5 as well, so a /28 gives 11 usable, not 14.';
      $('#cd-out', host).textContent = o;
    }
    $$('input', host).forEach(function (el) { el.addEventListener('input', run); }); run();
  }

  /* ============================ HTTP cache ============================ */
  // headers: {maxAge, noStore, noCache, etag, mustRevalidate}; ageSec = time since stored; request: {reload:false}
  function cacheDecision(h, ageSec) {
    if (h.noStore) return { action: 'FETCH', why: 'no-store: nothing may be kept, every request goes to the origin' };
    if (h.noCache) return h.etag ? { action: 'REVALIDATE', why: 'no-cache: a stored copy may be kept but must be revalidated before use (If-None-Match -> 304 if unchanged)' } : { action: 'FETCH', why: 'no-cache without a validator: must re-download' };
    if (h.maxAge > ageSec) return { action: 'USE CACHE', why: 'Fresh: age ' + ageSec + 's < max-age ' + h.maxAge + 's. No network request at all (the fastest possible response).' };
    if (h.etag) return { action: 'REVALIDATE', why: 'Stale (age ' + ageSec + 's >= max-age ' + h.maxAge + 's): send If-None-Match; origin answers 304 (no body) or 200 with a new body.' };
    return { action: 'FETCH', why: 'Stale and no validator (ETag / Last-Modified): full download.' };
  }
  function renderCache(host) {
    host.innerHTML = '<h4>Lab: HTTP caching decision</h4><p>Set the response headers the server sent and how old the cached copy is. See what a browser does on the next request.</p>' +
      '<div class="row"><label>max-age (s) <input id="hc-m" type="number" value="3600" style="width:80px"></label><label>Age of cached copy (s) <input id="hc-a" type="number" value="120" style="width:80px"></label><label><input id="hc-e" type="checkbox" checked> ETag present</label><label><input id="hc-nc" type="checkbox"> no-cache</label><label><input id="hc-ns" type="checkbox"> no-store</label></div><div class="out" id="hc-out"></div>';
    function run() {
      var h = { maxAge: num($('#hc-m', host).value), etag: $('#hc-e', host).checked, noCache: $('#hc-nc', host).checked, noStore: $('#hc-ns', host).checked }, age = num($('#hc-a', host).value);
      var d = cacheDecision(h, age), dirs = [];
      if (h.noStore) dirs.push('no-store'); if (h.noCache) dirs.push('no-cache'); dirs.push('max-age=' + h.maxAge);
      $('#hc-out', host).textContent = 'Cache-Control: ' + dirs.join(', ') + (h.etag ? '\nETag: "v42"' : '') + '\nCached copy is ' + age + ' s old\n\nDecision: ' + d.action + '\n' + d.why + '\n\nPatterns: hashed static assets (app.3f9a.js) -> "public, max-age=31536000, immutable". index.html and API data -> "no-cache" + ETag (always validate). Sensitive data -> "no-store". "private" means browser-only, not shared caches/CDNs.';
    }
    $$('input', host).forEach(function (el) { el.addEventListener('input', run); el.addEventListener('change', run); }); run();
  }

  /* ============================ CORS ============================ */
  var SIMPLE_METHODS = ['GET', 'HEAD', 'POST'];
  var SIMPLE_HEADERS = ['accept', 'accept-language', 'content-language', 'content-type'];
  var SIMPLE_CT = ['application/x-www-form-urlencoded', 'multipart/form-data', 'text/plain'];
  function sameOrigin(a, b) { try { var x = new URL(a), y = new URL(b); return x.protocol === y.protocol && x.hostname === y.hostname && (x.port || (x.protocol === 'https:' ? '443' : '80')) === (y.port || (y.protocol === 'https:' ? '443' : '80')); } catch (e) { return null; } }
  function corsDecision(o) {
    var same = sameOrigin(o.pageOrigin, o.apiUrl);
    if (same === null) return { error: 'Enter full URLs like https://app.example.com' };
    if (same) return { same: true, preflight: false, allowed: true, steps: ['Same origin: no CORS involved.'] };
    var custom = (o.headers || []).map(function (h) { return h.trim().toLowerCase(); }).filter(Boolean).filter(function (h) { return SIMPLE_HEADERS.indexOf(h) < 0; });
    var ct = (o.contentType || '').toLowerCase().split(';')[0].trim();
    var badCt = ct && SIMPLE_CT.indexOf(ct) < 0;
    var pre = SIMPLE_METHODS.indexOf(o.method.toUpperCase()) < 0 || custom.length > 0 || !!badCt;
    var steps = [], ok = true, reason;
    if (pre) {
      steps.push('Browser sends OPTIONS preflight with Origin, Access-Control-Request-Method: ' + o.method.toUpperCase() + (custom.length || badCt ? ', Access-Control-Request-Headers: ' + custom.concat(badCt ? ['content-type'] : []).join(', ') : ''));
      var m = (o.allowMethods || []).map(function (x) { return x.trim().toUpperCase(); });
      var hs = (o.allowHeaders || []).map(function (x) { return x.trim().toLowerCase(); });
      if ((o.allowOrigin !== '*' && o.allowOrigin !== o.pageOrigin)) { ok = false; reason = 'Access-Control-Allow-Origin is "' + o.allowOrigin + '", not the page origin'; }
      else if (m.indexOf(o.method.toUpperCase()) < 0 && SIMPLE_METHODS.indexOf(o.method.toUpperCase()) < 0) { ok = false; reason = 'Access-Control-Allow-Methods does not include ' + o.method.toUpperCase(); }
      else { var need = custom.concat(badCt ? ['content-type'] : []); var miss = need.filter(function (h) { return hs.indexOf(h) < 0; }); if (miss.length) { ok = false; reason = 'Access-Control-Allow-Headers is missing: ' + miss.join(', '); } }
      steps.push(ok ? 'Server replies 204 with matching Access-Control-Allow-* headers (cache with Access-Control-Max-Age).' : 'Preflight FAILS: ' + reason);
      if (ok) steps.push('Browser then sends the real ' + o.method.toUpperCase() + ' request.');
    } else {
      steps.push('"Simple" request: sent directly with an Origin header (no preflight).');
      if (o.allowOrigin !== '*' && o.allowOrigin !== o.pageOrigin) { ok = false; reason = 'response lacks a matching Access-Control-Allow-Origin ("' + o.allowOrigin + '")'; }
      steps.push(ok ? 'Response has Access-Control-Allow-Origin: ' + o.allowOrigin + ' so JavaScript may read it.' : 'The request may still REACH the server, but the browser hides the response: ' + reason);
    }
    if (ok && o.credentials && o.allowOrigin === '*') { ok = false; steps.push('Blocked: with credentials (cookies/Authorization) the server must name the exact origin and send Access-Control-Allow-Credentials: true; "*" is not allowed.'); }
    return { same: false, preflight: pre, allowed: ok, steps: steps };
  }
  function renderCors(host) {
    host.innerHTML = '<h4>Lab: CORS decision simulator</h4><p>CORS is enforced by the <b>browser</b>, not the server. Configure a page, a request and the API\'s CORS response and see whether it works. Note that origin = scheme + host + port.</p>' +
      '<div class="row"><label>Page origin <input id="co-p" value="http://localhost:4200" style="width:200px"></label><label>API URL <input id="co-u" value="https://api.shop.com/orders" style="width:230px"></label></div>' +
      '<div class="row"><label>Method <select id="co-m"><option>GET</option><option>POST</option><option>PUT</option><option>DELETE</option><option>PATCH</option></select></label><label>Content-Type <input id="co-ct" value="application/json" style="width:170px"></label><label>Extra headers <input id="co-h" value="Authorization" style="width:150px"></label><label><input id="co-cr" type="checkbox"> send credentials</label></div>' +
      '<div class="row"><b>API response:</b> <label>Allow-Origin <input id="co-ao" value="*" style="width:190px"></label><label>Allow-Methods <input id="co-am" value="GET,POST" style="width:120px"></label><label>Allow-Headers <input id="co-ah" value="Content-Type" style="width:150px"></label></div><div class="out" id="co-out"></div>';
    function list(id) { return $(id, host).value.split(',').map(function (x) { return x.trim(); }).filter(Boolean); }
    function run() {
      var r = corsDecision({ pageOrigin: $('#co-p', host).value.trim(), apiUrl: $('#co-u', host).value.trim(), method: $('#co-m', host).value, contentType: $('#co-ct', host).value, headers: list('#co-h'), credentials: $('#co-cr', host).checked, allowOrigin: $('#co-ao', host).value.trim(), allowMethods: list('#co-am'), allowHeaders: list('#co-ah') });
      $('#co-out', host).textContent = r.error ? r.error : (r.same ? 'SAME ORIGIN\n' : (r.preflight ? 'CROSS-ORIGIN with PREFLIGHT\n' : 'CROSS-ORIGIN simple request\n')) + r.steps.map(function (s, i) { return (i + 1) + '. ' + s; }).join('\n') + '\n\nRESULT: ' + (r.allowed ? 'ALLOWED' : 'BLOCKED by the browser') + '\nFix on the SERVER (add the CORS policy); the client cannot work around it. In ASP.NET Core: builder.Services.AddCors(...) + app.UseCors() before auth.';
    }
    $$('input,select', host).forEach(function (el) { el.addEventListener('input', run); el.addEventListener('change', run); }); run();
  }

  var LABS = { 'cidr-lab': renderCidr, 'cache-lab': renderCache, 'cors-lab': renderCors };
  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', function () {
      Object.keys(LABS).forEach(function (id) { var el = document.getElementById(id); if (el) LABS[id](el); });
    });
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = { cidr: cidr, split: split, cacheDecision: cacheDecision, corsDecision: corsDecision, ip2int: ip2int, int2ip: int2ip };
})(typeof window !== 'undefined' ? window : globalThis);
