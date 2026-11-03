/* ASP.NET Core Web API Guide - interactive labs
   1. Pure-JS HMAC-SHA256 + JWT (real signatures, works from file://)
   2. In-browser mock "Demo Shop API" (register / login / refresh / CRUD with JWT + roles)
   3. Swagger-UI look-alike, JWT lab, login-to-API flow lab, middleware pipeline, rate limiter, DI lifetimes */
(function (root) {
  'use strict';

  /* ======================= SHA-256 / HMAC / JWT ======================= */
  var K = [], H0 = [];
  (function () {
    for (var c = 2, n = 0; n < 64; c++) {
      var p = true;
      for (var d = 2; d * d <= c; d++) if (c % d === 0) { p = false; break; }
      if (p) { if (n < 8) H0[n] = (Math.pow(c, 0.5) % 1) * 4294967296 | 0; K[n++] = (Math.pow(c, 1 / 3) % 1) * 4294967296 | 0; }
    }
  })();
  function rotr(x, n) { return (x >>> n) | (x << (32 - n)); }
  function sha256(msg) {
    var l = msg.length, padded = new Uint8Array(((l + 9 + 63) >> 6) << 6);
    padded.set(msg); padded[l] = 0x80;
    var dv = new DataView(padded.buffer);
    dv.setUint32(padded.length - 8, l >>> 29); dv.setUint32(padded.length - 4, (l << 3) >>> 0);
    var h = H0.slice(), w = new Array(64);
    for (var o = 0; o < padded.length; o += 64) {
      for (var i = 0; i < 16; i++) w[i] = dv.getInt32(o + i * 4);
      for (i = 16; i < 64; i++) {
        var s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
        var s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
        w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
      }
      var a = h[0], b = h[1], c = h[2], d = h[3], e = h[4], f = h[5], g = h[6], hh = h[7];
      for (i = 0; i < 64; i++) {
        var S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25), ch = (e & f) ^ (~e & g);
        var t1 = (hh + S1 + ch + K[i] + w[i]) | 0;
        var S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22), mj = (a & b) ^ (a & c) ^ (b & c);
        var t2 = (S0 + mj) | 0;
        hh = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
      }
      h[0] = (h[0] + a) | 0; h[1] = (h[1] + b) | 0; h[2] = (h[2] + c) | 0; h[3] = (h[3] + d) | 0;
      h[4] = (h[4] + e) | 0; h[5] = (h[5] + f) | 0; h[6] = (h[6] + g) | 0; h[7] = (h[7] + hh) | 0;
    }
    var out = new Uint8Array(32), ov = new DataView(out.buffer);
    for (i = 0; i < 8; i++) ov.setInt32(i * 4, h[i]);
    return out;
  }
  function utf8(s) { return new TextEncoder().encode(s); }
  function hmac(key, msg) {
    if (key.length > 64) key = sha256(key);
    var k = new Uint8Array(64); k.set(key);
    var ip = new Uint8Array(64 + msg.length), op = new Uint8Array(96), i;
    for (i = 0; i < 64; i++) { ip[i] = k[i] ^ 0x36; op[i] = k[i] ^ 0x5c; }
    ip.set(msg, 64); op.set(sha256(ip), 64);
    return sha256(op);
  }
  function b64u(bytes) {
    var s = ''; for (var i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function b64uDecodeBytes(str) {
    str = str.replace(/-/g, '+').replace(/_/g, '/'); while (str.length % 4) str += '=';
    var bin = atob(str), out = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  function b64uDecode(str) { return new TextDecoder().decode(b64uDecodeBytes(str)); }
  function signJwt(payload, secret, header) {
    var h = b64u(utf8(JSON.stringify(header || { alg: 'HS256', typ: 'JWT' }))), p = b64u(utf8(JSON.stringify(payload)));
    return h + '.' + p + '.' + b64u(hmac(utf8(secret), utf8(h + '.' + p)));
  }
  function decodeJwt(token) {
    var p = String(token || '').split('.');
    if (p.length !== 3) return null;
    try { return { header: JSON.parse(b64uDecode(p[0])), payload: JSON.parse(b64uDecode(p[1])), signature: p[2] }; } catch (e) { return null; }
  }
  function verifyJwt(token, secret, nowSec) {
    var parts = String(token || '').split('.');
    if (parts.length !== 3) return { ok: false, error: 'malformed', message: 'Token is not in header.payload.signature format' };
    var d = decodeJwt(token);
    if (!d) return { ok: false, error: 'malformed', message: 'Header or payload is not valid Base64Url JSON' };
    if (d.header.alg !== 'HS256') return { ok: false, error: 'alg', message: 'Unexpected algorithm "' + d.header.alg + '" (only HS256 accepted)' };
    var expected = b64u(hmac(utf8(secret), utf8(parts[0] + '.' + parts[1])));
    if (expected !== parts[2]) return { ok: false, error: 'signature', message: 'Signature validation failed (token was modified or signed with a different key)' };
    if (d.payload.exp !== undefined && nowSec >= d.payload.exp) return { ok: false, error: 'expired', message: 'Token expired at ' + new Date(d.payload.exp * 1000).toISOString() };
    if (d.payload.nbf !== undefined && nowSec < d.payload.nbf) return { ok: false, error: 'nbf', message: 'Token is not valid yet (nbf)' };
    return { ok: true, payload: d.payload, header: d.header };
  }

  /* ======================= Mock Demo Shop API ======================= */
  var SECRET = 'super-secret-signing-key-min-32-chars!!', ISS = 'https://api.demoshop.local', AUD = 'demoshop-clients';
  var ACCESS_TTL = 900, REFRESH_TTL = 7 * 86400;
  var DB, offset = 0;
  function now() { return Math.floor(Date.now() / 1000) + offset; }
  function rnd(n) { var s = ''; while (s.length < n) s += Math.random().toString(36).slice(2); return s.slice(0, n); }
  function reset() {
    offset = 0;
    DB = {
      nextUser: 3, nextProduct: 4,
      users: [
        { id: 1, email: 'admin@demo.com', password: 'Admin@123', fullName: 'Alice Admin', role: 'Admin' },
        { id: 2, email: 'user@demo.com', password: 'User@123', fullName: 'Bob User', role: 'User' }
      ],
      products: [
        { id: 1, name: 'Mechanical Keyboard', price: 89.99, stock: 25 },
        { id: 2, name: 'Wireless Mouse', price: 29.5, stock: 80 },
        { id: 3, name: '27" Monitor', price: 219, stock: 12 }
      ],
      refresh: {}
    };
  }
  reset();

  function resp(status, body, extra) {
    var texts = { 200: 'OK', 201: 'Created', 204: 'No Content', 400: 'Bad Request', 401: 'Unauthorized', 403: 'Forbidden', 404: 'Not Found', 409: 'Conflict', 429: 'Too Many Requests', 500: 'Internal Server Error' };
    var headers = { 'date': new Date().toUTCString(), 'server': 'Kestrel' };
    if (body !== null && body !== undefined) headers['content-type'] = status >= 400 ? 'application/problem+json; charset=utf-8' : 'application/json; charset=utf-8';
    if (extra) for (var k in extra) headers[k] = extra[k];
    return { status: status, statusText: texts[status] || '', headers: headers, body: body === undefined ? null : body };
  }
  function problem(status, title, errors) {
    var b = { type: 'https://tools.ietf.org/html/rfc9110#section-15', title: title, status: status };
    if (errors) b.errors = errors;
    return resp(status, b);
  }
  function issueTokens(user) {
    var t = now();
    var access = signJwt({
      sub: String(user.id), email: user.email, name: user.fullName, role: user.role,
      jti: rnd(12), iss: ISS, aud: AUD, iat: t, nbf: t, exp: t + ACCESS_TTL
    }, SECRET);
    var refresh = rnd(40);
    DB.refresh[refresh] = { userId: user.id, used: false, revoked: false, exp: t + REFRESH_TTL };
    return { accessToken: access, refreshToken: refresh, tokenType: 'Bearer', expiresIn: ACCESS_TTL };
  }
  function authorize(headers, roles) {
    var h = headers.authorization;
    if (!h) return { res: resp(401, null, { 'www-authenticate': 'Bearer' }) };
    var m = /^Bearer\s+(.+)$/i.exec(h);
    if (!m) return { res: resp(401, null, { 'www-authenticate': 'Bearer' }) };
    var v = verifyJwt(m[1].trim(), SECRET, now());
    if (!v.ok) return { res: resp(401, null, { 'www-authenticate': 'Bearer error="invalid_token", error_description="' + v.message + '"' }) };
    if (v.payload.iss !== ISS || v.payload.aud !== AUD) return { res: resp(401, null, { 'www-authenticate': 'Bearer error="invalid_token", error_description="issuer/audience invalid"' }) };
    if (roles && roles.indexOf(v.payload.role) < 0) return { res: resp(403, null) };
    return { user: v.payload };
  }
  function parseBody(txt) {
    if (txt === null || txt === undefined || String(txt).trim() === '') return { err: problem(400, 'A non-empty request body is required.') };
    try { return { v: JSON.parse(txt) }; } catch (e) { return { err: problem(400, 'The request body is not valid JSON: ' + e.message) }; }
  }

  function handle(method, url, headers, bodyTxt) {
    method = method.toUpperCase();
    var h = {}; for (var k in (headers || {})) h[k.toLowerCase()] = headers[k];
    var qi = url.indexOf('?'), path = (qi < 0 ? url : url.slice(0, qi)).replace(/\/+$/, '') || '/';
    var q = new URLSearchParams(qi < 0 ? '' : url.slice(qi + 1)), m, a, b, user, p;

    if (method === 'GET' && path === '/api/status') return resp(200, { status: 'Healthy', serverTimeUtc: new Date(now() * 1000).toISOString() });

    if (method === 'POST' && path === '/api/auth/register') {
      b = parseBody(bodyTxt); if (b.err) return b.err; b = b.v;
      var errs = {};
      if (!b.email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(b.email)) errs.Email = ['The Email field is not a valid e-mail address.'];
      if (!b.password || String(b.password).length < 8) errs.Password = ['The field Password must be a string with a minimum length of 8.'];
      if (!b.fullName) errs.FullName = ['The FullName field is required.'];
      if (Object.keys(errs).length) return problem(400, 'One or more validation errors occurred.', errs);
      if (DB.users.some(function (u) { return u.email.toLowerCase() === b.email.toLowerCase(); })) return problem(409, 'A user with this e-mail already exists.');
      user = { id: DB.nextUser++, email: b.email, password: b.password, fullName: b.fullName, role: 'User' };
      DB.users.push(user);
      return resp(201, { id: user.id, email: user.email, fullName: user.fullName, role: user.role }, { location: '/api/users/' + user.id });
    }
    if (method === 'POST' && path === '/api/auth/login') {
      b = parseBody(bodyTxt); if (b.err) return b.err; b = b.v;
      user = DB.users.filter(function (u) { return b.email && u.email.toLowerCase() === String(b.email).toLowerCase() && u.password === b.password; })[0];
      if (!user) return problem(401, 'Invalid e-mail or password.');
      return resp(200, issueTokens(user));
    }
    if (method === 'POST' && path === '/api/auth/refresh') {
      b = parseBody(bodyTxt); if (b.err) return b.err; b = b.v;
      var rt = DB.refresh[b.refreshToken];
      if (!rt) return problem(401, 'Invalid refresh token.');
      if (rt.used || rt.revoked) {
        Object.keys(DB.refresh).forEach(function (t) { if (DB.refresh[t].userId === rt.userId) DB.refresh[t].revoked = true; });
        return problem(401, 'Refresh token reuse detected. All sessions for this user were revoked.');
      }
      if (now() >= rt.exp) return problem(401, 'Refresh token expired.');
      rt.used = true;
      user = DB.users.filter(function (u) { return u.id === rt.userId; })[0];
      return resp(200, issueTokens(user));
    }

    if (path === '/api/products' || /^\/api\/products\/[^/]+$/.test(path)) {
      m = /^\/api\/products\/([^/]+)$/.exec(path);
      var id = m ? parseInt(m[1], 10) : null;
      if (m && isNaN(id)) return problem(400, 'The value "' + m[1] + '" is not valid for id.');
      var needRoles = (method === 'GET') ? null : ['Admin'];
      if (['GET', 'POST', 'PUT', 'DELETE'].indexOf(method) < 0 || (method === 'POST' && m) || (method !== 'GET' && method !== 'POST' && !m) ) return resp(404, null);
      a = authorize(h, needRoles); if (a.res) return a.res;

      if (method === 'GET' && !m) {
        var s = (q.get('search') || '').toLowerCase(), page = parseInt(q.get('page') || '1', 10), size = parseInt(q.get('pageSize') || '10', 10);
        if (page < 1 || size < 1 || size > 50) return problem(400, 'One or more validation errors occurred.', { page: ['page must be >= 1 and pageSize between 1 and 50'] });
        var list = DB.products.filter(function (x) { return !s || x.name.toLowerCase().indexOf(s) >= 0; });
        return resp(200, { page: page, pageSize: size, total: list.length, items: list.slice((page - 1) * size, page * size) });
      }
      if (method === 'GET') {
        p = DB.products.filter(function (x) { return x.id === id; })[0];
        return p ? resp(200, p) : problem(404, 'Product ' + id + ' was not found.');
      }
      if (method === 'DELETE') {
        var ix = DB.products.map(function (x) { return x.id; }).indexOf(id);
        if (ix < 0) return problem(404, 'Product ' + id + ' was not found.');
        DB.products.splice(ix, 1); return resp(204, null);
      }
      b = parseBody(bodyTxt); if (b.err) return b.err; b = b.v;
      var pe = {};
      if (!b.name || !String(b.name).trim()) pe.Name = ['The Name field is required.'];
      if (typeof b.price !== 'number' || b.price <= 0) pe.Price = ['The field Price must be between 0.01 and 100000.'];
      if (b.stock !== undefined && (!Number.isInteger(b.stock) || b.stock < 0)) pe.Stock = ['The field Stock must be a non-negative integer.'];
      if (Object.keys(pe).length) return problem(400, 'One or more validation errors occurred.', pe);
      if (method === 'POST') {
        p = { id: DB.nextProduct++, name: b.name, price: b.price, stock: b.stock || 0 };
        DB.products.push(p);
        return resp(201, p, { location: '/api/products/' + p.id });
      }
      p = DB.products.filter(function (x) { return x.id === id; })[0];
      if (!p) return problem(404, 'Product ' + id + ' was not found.');
      p.name = b.name; p.price = b.price; p.stock = b.stock || 0;
      return resp(204, null);
    }
    return resp(404, null);
  }

  var Api = { handle: handle, reset: reset, sha256: sha256, hmac: hmac, utf8: utf8, signJwt: signJwt, decodeJwt: decodeJwt, verifyJwt: verifyJwt, b64u: b64u, b64uDecode: b64uDecode,
    now: now, fastForward: function (sec) { offset += sec; }, SECRET: SECRET, ISS: ISS, AUD: AUD };
  root.DemoApi = Api;
  if (typeof module !== 'undefined' && module.exports) module.exports = Api;
  if (typeof document === 'undefined') return;

  /* ======================= UI helpers ======================= */
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function pj(o) { return JSON.stringify(o, null, 2); }
  function hex(n) { return rnd(n); }
  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  /* ======================= Swagger UI mock ======================= */
  var LOCK = '\uD83D\uDD12', UNLOCK = '\uD83D\uDD13';
  var OPS = [
    { tag: 'Auth', desc: 'Registration, login and token refresh', method: 'post', path: '/api/auth/register', summary: 'Register a new user', auth: false, params: [],
      body: { name: 'RegisterRequest', example: { email: 'carol@demo.com', password: 'Passw0rd!23', fullName: 'Carol Customer' } },
      responses: [{ code: 201, d: 'Created', ex: { id: 3, email: 'carol@demo.com', fullName: 'Carol Customer', role: 'User' } }, { code: 400, d: 'Validation failed', ex: { title: 'One or more validation errors occurred.', status: 400, errors: { Password: ['...min length of 8.'] } } }, { code: 409, d: 'E-mail already registered' }] },
    { tag: 'Auth', method: 'post', path: '/api/auth/login', summary: 'Log in and obtain a JWT access token + refresh token', auth: false, params: [],
      body: { name: 'LoginRequest', example: { email: 'admin@demo.com', password: 'Admin@123' } },
      responses: [{ code: 200, d: 'Success', ex: { accessToken: 'eyJhbGciOi...', refreshToken: 'k3j9...', tokenType: 'Bearer', expiresIn: 900 } }, { code: 401, d: 'Invalid credentials' }] },
    { tag: 'Auth', method: 'post', path: '/api/auth/refresh', summary: 'Exchange a refresh token for a new token pair (rotation)', auth: false, params: [],
      body: { name: 'RefreshRequest', example: { refreshToken: 'paste-refresh-token-from-login' } },
      responses: [{ code: 200, d: 'New access + refresh token' }, { code: 401, d: 'Invalid, expired or re-used refresh token' }] },
    { tag: 'Products', desc: 'CRUD operations. Reads need any valid token; writes need the Admin role', method: 'get', path: '/api/products', summary: 'List products (paged, filterable)', auth: true,
      params: [{ name: 'search', in: 'query', type: 'string', d: 'Case-insensitive name filter', def: '' }, { name: 'page', in: 'query', type: 'integer($int32)', d: 'Page number (>= 1)', def: '1' }, { name: 'pageSize', in: 'query', type: 'integer($int32)', d: 'Items per page (1-50)', def: '10' }],
      responses: [{ code: 200, d: 'Success', ex: { page: 1, pageSize: 10, total: 3, items: [{ id: 1, name: 'Mechanical Keyboard', price: 89.99, stock: 25 }] } }, { code: 401, d: 'Missing / invalid / expired token' }] },
    { tag: 'Products', method: 'get', path: '/api/products/{id}', summary: 'Get a product by id', auth: true,
      params: [{ name: 'id', in: 'path', type: 'integer($int32)', d: 'Product id', req: true, def: '1' }],
      responses: [{ code: 200, d: 'Success', ex: { id: 1, name: 'Mechanical Keyboard', price: 89.99, stock: 25 } }, { code: 401, d: 'Unauthorized' }, { code: 404, d: 'Not Found' }] },
    { tag: 'Products', method: 'post', path: '/api/products', summary: 'Create a product (Admin only)', auth: true, params: [],
      body: { name: 'CreateProductRequest', example: { name: 'USB-C Hub', price: 45.9, stock: 40 } },
      responses: [{ code: 201, d: 'Created (Location header points to the new resource)' }, { code: 400, d: 'Validation failed' }, { code: 401, d: 'Unauthorized' }, { code: 403, d: 'Forbidden - caller is not in the Admin role' }] },
    { tag: 'Products', method: 'put', path: '/api/products/{id}', summary: 'Replace a product (Admin only)', auth: true,
      params: [{ name: 'id', in: 'path', type: 'integer($int32)', d: 'Product id', req: true, def: '1' }],
      body: { name: 'CreateProductRequest', example: { name: 'Mechanical Keyboard v2', price: 99, stock: 30 } },
      responses: [{ code: 204, d: 'No Content' }, { code: 400, d: 'Validation failed' }, { code: 401, d: 'Unauthorized' }, { code: 403, d: 'Forbidden' }, { code: 404, d: 'Not Found' }] },
    { tag: 'Products', method: 'delete', path: '/api/products/{id}', summary: 'Delete a product (Admin only)', auth: true,
      params: [{ name: 'id', in: 'path', type: 'integer($int32)', d: 'Product id', req: true, def: '3' }],
      responses: [{ code: 204, d: 'No Content' }, { code: 401, d: 'Unauthorized' }, { code: 403, d: 'Forbidden' }, { code: 404, d: 'Not Found' }] },
    { tag: 'Health', desc: 'Anonymous endpoint (no token required)', method: 'get', path: '/api/status', summary: 'Liveness probe', auth: false, params: [],
      responses: [{ code: 200, d: 'Success', ex: { status: 'Healthy', serverTimeUtc: '2025-01-01T10:00:00Z' } }] }
  ];
  var SCHEMAS = {
    RegisterRequest: { email: 'string', password: 'string (minLength: 8)', fullName: 'string' },
    LoginRequest: { email: 'string', password: 'string' },
    RefreshRequest: { refreshToken: 'string' },
    TokenResponse: { accessToken: 'string', refreshToken: 'string', tokenType: 'string', expiresIn: 'integer($int32)' },
    CreateProductRequest: { name: 'string (required)', price: 'number($double) (0.01 - 100000)', stock: 'integer($int32)' },
    ProductDto: { id: 'integer($int32)', name: 'string', price: 'number($double)', stock: 'integer($int32)' },
    ProblemDetails: { type: 'string', title: 'string', status: 'integer($int32)', errors: 'object (field -> string[])' }
  };
  var swgToken = '', swgLastToken = '';

  function renderSwagger(host) {
    var h = '<div class="swg"><div class="swg-top"><b>swagger</b><span>Mock UI &ndash; all calls are answered by an in-browser fake API with real HS256 JWTs</span></div>' +
      '<div class="swg-info"><h2>Demo Shop API <small>1.0</small> <small class="oas">OAS 3.0</small></h2><p class="url">/swagger/v1/swagger.json</p>' +
      '<p>Sample ASP.NET Core 8 API: JWT authentication, role-based authorization and CRUD. Try: log in as <code>admin@demo.com / Admin@123</code> or <code>user@demo.com / User@123</code>.</p></div>' +
      '<div class="swg-auth"><button class="swg-btn" data-act="auth">Authorize <span class="lk">' + UNLOCK + '</span></button></div>';
    var lastTag = null;
    OPS.forEach(function (op, i) {
      if (op.tag !== lastTag) {
        if (lastTag !== null) h += '</div>';
        h += '<div class="swg-tag"><h3>' + op.tag + '<small>' + esc(op.desc || '') + '</small></h3>'; lastTag = op.tag;
      }
      h += opHtml(op, i);
    });
    h += '</div><div class="swg-schemas"><h3>Schemas</h3>';
    Object.keys(SCHEMAS).forEach(function (n) { h += '<details><summary>' + n + '</summary><div class="dbody"><pre>' + esc(pj(SCHEMAS[n])) + '</pre></div></details>'; });
    h += '</div></div>';
    host.innerHTML = h;

    var modal = document.createElement('div'); modal.className = 'modal-bg'; modal.id = 'swg-modal';
    modal.innerHTML = '<div class="modal"><div class="mh">Available authorizations<span data-m="close">&times;</span></div><div class="mb">' +
      '<b>Bearer (http, Bearer)</b><p>JWT Authorization header using the Bearer scheme. Enter <b>only the token</b> &ndash; Swagger adds the <code>Bearer </code> prefix.</p>' +
      '<label>Value:</label><input id="swg-token" placeholder="eyJhbGciOiJIUzI1NiIs..." autocomplete="off">' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="swg-btn" data-m="ok">Authorize</button><button class="swg-btn clear" data-m="logout">Logout</button><button class="swg-btn grey" data-m="fill">Fill from last login (demo helper)</button></div>' +
      '<p id="swg-auth-state" style="margin-top:10px;font-size:13px"></p></div></div>';
    document.body.appendChild(modal);
    function refreshLock() {
      $$('.lk', host).forEach(function (e) { e.textContent = swgToken ? LOCK : UNLOCK; });
      $$('.op .lock', host).forEach(function (e) { e.textContent = swgToken ? LOCK : UNLOCK; });
      $('#swg-auth-state').innerHTML = swgToken ? '<span class="yes">Authorized</span> &ndash; token will be sent on secured operations.' : 'Not authorized.';
    }
    modal.addEventListener('click', function (e) {
      var t = e.target, act = t.getAttribute && t.getAttribute('data-m');
      if (t === modal || act === 'close') modal.classList.remove('on');
      if (act === 'ok') { swgToken = $('#swg-token').value.trim(); refreshLock(); modal.classList.remove('on'); }
      if (act === 'logout') { swgToken = ''; $('#swg-token').value = ''; refreshLock(); }
      if (act === 'fill') { $('#swg-token').value = swgLastToken; if (!swgLastToken) $('#swg-auth-state').textContent = 'No token yet - execute POST /api/auth/login first.'; }
    });
    refreshLock();

    host.addEventListener('click', function (e) {
      var t = e.target, actEl = t.closest('[data-act]'), opEl = t.closest('.op');
      if (actEl && actEl.getAttribute('data-act') === 'auth') { $('#swg-token').value = swgToken; refreshLock(); modal.classList.add('on'); return; }
      if (!opEl) return;
      var spec = OPS[+opEl.getAttribute('data-i')];
      if (t.closest('.sum')) { opEl.classList.toggle('open'); return; }
      var act = actEl && actEl.getAttribute('data-act');
      if (act === 'try') setTry(opEl, true);
      else if (act === 'cancel') { setTry(opEl, false); }
      else if (act === 'clear') { var lv = $('.live', opEl); if (lv) lv.innerHTML = ''; }
      else if (act === 'exec') exec(opEl, spec);
    });
    function setTry(opEl, on) {
      opEl.classList.toggle('trying', on);
      $$('[data-p],textarea.in', opEl).forEach(function (i) { i.readOnly = !on; i.classList.toggle('ro', !on); });
      $('[data-act="try"]', opEl).style.display = on ? 'none' : '';
      $('[data-act="cancel"]', opEl).style.display = on ? '' : 'none';
      var er = $('.execrow', opEl); if (er) er.style.display = on ? '' : 'none';
      if (!on) { var lv = $('.live', opEl); if (lv) lv.innerHTML = ''; }
    }
    function exec(opEl, spec) {
      var path = spec.path, qs = [], bad = false;
      spec.params.forEach(function (p) {
        var inp = $('[data-p="' + p.name + '"]', opEl), v = inp.value.trim();
        inp.style.borderColor = '';
        if (p.req && !v) { inp.style.borderColor = '#f93e3e'; bad = true; return; }
        if (p.in === 'path') path = path.replace('{' + p.name + '}', encodeURIComponent(v)); else if (v !== '') qs.push(p.name + '=' + encodeURIComponent(v));
      });
      if (bad) return;
      var url = path + (qs.length ? '?' + qs.join('&') : ''), hdrs = {}, body = null;
      if (spec.body) { hdrs['content-type'] = 'application/json'; body = $('textarea.in', opEl).value; }
      if (spec.auth && swgToken) hdrs.authorization = 'Bearer ' + swgToken;
      var curl = "curl -X '" + spec.method.toUpperCase() + "' \\\n  'https://localhost:7001" + url + "' \\\n  -H 'accept: application/json'";
      if (hdrs.authorization) curl += " \\\n  -H 'Authorization: Bearer " + hdrs.authorization.slice(7, 30) + "...'";
      if (body !== null) curl += " \\\n  -H 'Content-Type: application/json' \\\n  -d '" + body.replace(/\s*\n\s*/g, ' ') + "'";
      var live = $('.live', opEl);
      live.innerHTML = '<div class="sect"><i>Executing...</i></div>';
      wait(220 + Math.random() * 250).then(function () {
        var r = handle(spec.method, url, hdrs, body);
        if (spec.path === '/api/auth/login' && r.status === 200) swgLastToken = r.body.accessToken;
        var hdrTxt = Object.keys(r.headers).map(function (k) { return k + ': ' + r.headers[k]; }).join('\n');
        var bodyHtml = r.body === null ? '<i>No content</i>' : '<pre>' + esc(pj(r.body)) + '</pre>';
        var note = '';
        if (r.status === 401 && !hdrs.authorization && spec.auth) note = '<div style="color:#b26a00;font-size:12.5px">Tip: click <b>Authorize</b> and paste a token from POST /api/auth/login.</div>';
        if (r.status === 403) note = '<div style="color:#b26a00;font-size:12.5px">Token is valid (authenticated) but the role claim is not allowed &rarr; 403, not 401.</div>';
        if (r.status === 401 && hdrs.authorization) note = '<div style="color:#b26a00;font-size:12.5px">Authentication failed - see the <code>www-authenticate</code> header below for the reason.</div>';
        live.innerHTML = '<div class="sect"><h5>Responses</h5><b>Curl</b><pre>' + esc(curl) + '</pre><b>Request URL</b><pre>https://localhost:7001' + esc(url) + '</pre>' +
          '<b>Server response</b><table><tr><th style="width:80px">Code</th><th>Details</th></tr><tr><td class="resp-code st ' + (r.status < 400 ? 'ok' : 'err') + '">' + r.status + '<div style="font-weight:400;font-size:11px">' + r.statusText + '</div></td><td>' + note +
          '<b>Response body</b>' + bodyHtml + '<b>Response headers</b><pre>' + esc(hdrTxt) + '</pre></td></tr></table></div>';
      });
    }
  }
  function opHtml(op, i) {
    var h = '<div class="op ' + op.method + '" data-i="' + i + '"><div class="sum"><span class="m">' + op.method.toUpperCase() + '</span><span class="p">' + esc(op.path) + '</span><span class="d">' + esc(op.summary) + '</span>' + (op.auth ? '<span class="lock">' + UNLOCK + '</span>' : '') + '</div><div class="body">';
    h += '<div class="bh"><b>Parameters</b><span><button class="tryfx" data-act="try">Try it out</button><button class="tryfx cancel" data-act="cancel" style="display:none">Cancel</button></span></div><div class="sect">';
    if (!op.params.length) h += '<i>No parameters</i>';
    else {
      h += '<table><tr><th style="width:30%">Name</th><th>Description</th></tr>';
      op.params.forEach(function (p) {
        h += '<tr><td><b>' + p.name + '</b>' + (p.req ? '<span class="req">* required</span>' : '') + '<div class="ty">' + p.type + '<br>(' + p.in + ')</div></td><td>' + esc(p.d) + '<br><input class="in ro" readonly data-p="' + p.name + '" value="' + esc(p.def || '') + '" placeholder="' + p.name + '"></td></tr>';
      });
      h += '</table>';
    }
    h += '</div>';
    if (op.body) h += '<div class="sect"><h5>Request body <span style="font-weight:400;color:#777">required &middot; application/json &middot; schema: ' + op.body.name + '</span></h5><textarea class="in ro" readonly spellcheck="false">' + esc(pj(op.body.example)) + '</textarea></div>';
    if (op.auth) h += '<div class="sect" style="color:#777;font-size:12.5px">Security: <b>Bearer</b> (JWT) required' + (op.method !== 'get' ? ' &middot; policy: Admin role' : '') + '</div>';
    h += '<div class="sect execrow" style="display:none"><div style="display:flex;gap:10px"><button class="swg-btn exec" data-act="exec">Execute</button><button class="swg-btn clear" style="width:120px;justify-content:center" data-act="clear">Clear</button></div></div>';
    h += '<div class="live"></div><div class="sect"><h5>Responses (from OpenAPI document)</h5><table><tr><th style="width:80px">Code</th><th>Description</th></tr>';
    op.responses.forEach(function (r) {
      h += '<tr><td class="resp-code">' + r.code + '</td><td>' + esc(r.d) + (r.ex ? '<pre>' + esc(pj(r.ex)) + '</pre>' : '') + '</td></tr>';
    });
    return h + '</table></div></div></div>';
  }

  /* ======================= JWT lab ======================= */
  function colorToken(t) {
    var p = t.split('.');
    return '<span class="jwt-part jwt-h">' + esc(p[0] || '') + '</span>.<span class="jwt-part jwt-p">' + esc(p[1] || '') + '</span>.<span class="jwt-part jwt-s">' + esc(p[2] || '') + '</span>';
  }
  function renderJwtLab(host) {
    var payload = { sub: '42', name: 'Alice', role: 'Admin', iss: ISS, aud: AUD, exp: Math.floor(Date.now() / 1000) + 900 };
    host.innerHTML = '<h4>Lab: build, decode, verify and tamper with a real JWT (HS256)</h4>' +
      '<p>This runs an actual HMAC-SHA256 implementation in your browser &ndash; the same maths ASP.NET Core\'s <code>JwtSecurityTokenHandler</code> performs.</p>' +
      '<div class="grid2"><div><b>Payload (claims) JSON</b><textarea id="jl-payload" rows="8" style="width:100%;font-family:Consolas,monospace">' + esc(pj(payload)) + '</textarea></div>' +
      '<div><b>Signing key (secret)</b><input id="jl-secret" style="width:100%" value="' + esc(SECRET) + '"><div class="row"><button class="btn primary" id="jl-enc">1. Encode &amp; sign</button><button class="btn" id="jl-tamper">2. Tamper: set role=SuperAdmin (keep old signature)</button></div>' +
      '<b>Key used for verification</b><input id="jl-vsecret" style="width:100%" value="' + esc(SECRET) + '"><div class="row"><button class="btn primary" id="jl-ver">3. Verify signature &amp; claims</button></div></div></div>' +
      '<b>Token (editable)</b><textarea id="jl-token" rows="4" style="width:100%;font-family:Consolas,monospace"></textarea>' +
      '<div class="out" id="jl-colored"></div><div class="grid2"><div><b>Decoded header</b><div class="out" id="jl-hd"></div></div><div><b>Decoded payload</b><div class="out" id="jl-pd"></div></div></div>' +
      '<b>Verification result</b><div class="out" id="jl-res">Press "Verify".</div>';
    var tok = $('#jl-token', host);
    function show() {
      $('#jl-colored', host).innerHTML = colorToken(tok.value.trim());
      var d = decodeJwt(tok.value.trim());
      $('#jl-hd', host).textContent = d ? pj(d.header) : 'invalid token';
      $('#jl-pd', host).textContent = d ? pj(d.payload) : 'invalid token';
    }
    $('#jl-enc', host).onclick = function () {
      try { tok.value = signJwt(JSON.parse($('#jl-payload', host).value), $('#jl-secret', host).value); show(); $('#jl-res', host).textContent = 'Token created. Anyone can read the payload - only the key holder can create a valid signature.'; }
      catch (e) { $('#jl-res', host).textContent = 'Payload is not valid JSON: ' + e.message; }
    };
    $('#jl-tamper', host).onclick = function () {
      var p = tok.value.trim().split('.'); var d = decodeJwt(tok.value.trim());
      if (!d) { $('#jl-res', host).textContent = 'Encode a token first.'; return; }
      d.payload.role = 'SuperAdmin'; p[1] = b64u(utf8(JSON.stringify(d.payload))); tok.value = p.join('.'); show();
      $('#jl-res', host).textContent = 'Payload changed but the signature was NOT recomputed. Now click Verify.';
    };
    $('#jl-ver', host).onclick = function () {
      var r = verifyJwt(tok.value.trim(), $('#jl-vsecret', host).value, Math.floor(Date.now() / 1000)), el = $('#jl-res', host);
      el.innerHTML = r.ok ? '<span style="color:#6fe39b">VALID</span> - signature matches and exp/nbf are fine.\nClaims accepted: ' + esc(JSON.stringify(r.payload)) : '<span style="color:#ff8f9f">INVALID (' + r.error + ')</span> - ' + esc(r.message) + '\nASP.NET Core would answer: 401 Unauthorized + WWW-Authenticate: Bearer error="invalid_token"';
    };
    tok.addEventListener('input', show);
    $('#jl-enc', host).onclick();
  }

  /* ======================= Login -> API flow lab ======================= */
  function renderFlowLab(host) {
    var st = { access: '', refresh: '', oldRefresh: '' };
    host.innerHTML = '<h4>Lab: JWT journey from login to a secured endpoint</h4><p>Click the steps in order (or any order!) and watch the HTTP exchange. The "server" is the same mock API used by the Swagger page.</p>' +
      '<div class="row"><label>Log in as: <select id="fl-user"><option value="user@demo.com|User@123">user@demo.com (role User)</option><option value="admin@demo.com|Admin@123">admin@demo.com (role Admin)</option></select></label></div>' +
      '<div class="row" id="fl-btns"></div><div class="grid2"><div><b>Client token storage</b><div class="out" id="fl-state">(empty)</div></div><div><b>Access token claims</b><div class="out" id="fl-claims">(none)</div></div></div>' +
      '<b>HTTP log</b><div class="out" id="fl-log" style="max-height:420px;overflow:auto"></div>';
    var log = $('#fl-log', host);
    function line(html) { log.insertAdjacentHTML('beforeend', html + '\n'); log.scrollTop = log.scrollHeight; }
    function call(method, url, body, useToken, tokenOverride) {
      var hd = {}; if (body) hd['content-type'] = 'application/json';
      var tk = tokenOverride !== undefined ? tokenOverride : (useToken ? st.access : '');
      if (tk) hd.authorization = 'Bearer ' + tk;
      line('<span style="color:#8ab4ff">&gt;&gt; ' + method + ' ' + url + '</span>' + (tk ? '\n   Authorization: Bearer ' + esc(tk.slice(0, 28)) + '...' : '\n   (no Authorization header)') + (body ? '\n   ' + esc(JSON.stringify(body)) : ''));
      var r = handle(method, url, hd, body ? JSON.stringify(body) : null);
      var c = r.status < 300 ? '#6fe39b' : (r.status < 500 ? '#ffd166' : '#ff8f9f');
      line('<span style="color:' + c + '">&lt;&lt; ' + r.status + ' ' + r.statusText + '</span>' + (r.headers['www-authenticate'] ? '\n   www-authenticate: ' + esc(r.headers['www-authenticate']) : '') + (r.body ? '\n   ' + esc(JSON.stringify(r.body).slice(0, 230)) + (JSON.stringify(r.body).length > 230 ? '...' : '') : '\n   (empty body)') + '\n');
      return r;
    }
    function upd() {
      $('#fl-state', host).textContent = 'accessToken : ' + (st.access ? st.access.slice(0, 30) + '...' : '-') + '\nrefreshToken: ' + (st.refresh || '-');
      var d = decodeJwt(st.access), el = $('#fl-claims', host);
      if (!d) { el.textContent = '(none)'; return; }
      var left = d.payload.exp - Api.now();
      el.textContent = pj(d.payload) + '\n\nexpires in: ' + (left > 0 ? Math.floor(left / 60) + ' min ' + (left % 60) + ' s' : 'EXPIRED ' + Math.abs(Math.floor(left / 60)) + ' min ago');
    }
    var steps = [
      ['1. POST /login', function () {
        var c = $('#fl-user', host).value.split('|'); var r = call('POST', '/api/auth/login', { email: c[0], password: c[1] });
        if (r.status === 200) { st.access = r.body.accessToken; st.refresh = r.body.refreshToken; }
      }],
      ['2. GET /products (no token)', function () { call('GET', '/api/products', null, false); }],
      ['3. GET /products (Bearer token)', function () { call('GET', '/api/products', null, true); }],
      ['4. POST /products (needs Admin)', function () { call('POST', '/api/products', { name: 'Lab Gadget', price: 12.5, stock: 3 }, true); }],
      ['5. Tamper token, then GET', function () {
        var p = st.access.split('.'); if (p.length !== 3) { line('Log in first.\n'); return; }
        var d = decodeJwt(st.access); d.payload.role = 'Admin'; p[1] = b64u(utf8(JSON.stringify(d.payload)));
        call('GET', '/api/products', null, true, p.join('.'));
      }],
      ['6. Fast-forward 16 min', function () { Api.fastForward(960); line('<span style="color:#ffd166">-- server clock moved forward 16 minutes (access token lifetime is 15 min) --</span>\n'); }],
      ['7. POST /refresh', function () {
        var old = st.refresh; var r = call('POST', '/api/auth/refresh', { refreshToken: st.refresh });
        if (r.status === 200) { st.oldRefresh = old; st.access = r.body.accessToken; st.refresh = r.body.refreshToken; }
      }],
      ['8. Replay OLD refresh token', function () { call('POST', '/api/auth/refresh', { refreshToken: st.oldRefresh || st.refresh }); }],
      ['Reset lab', function () { Api.reset(); st = { access: '', refresh: '', oldRefresh: '' }; log.innerHTML = ''; }]
    ];
    var bx = $('#fl-btns', host);
    steps.forEach(function (s, i) {
      var b = document.createElement('button'); b.className = 'btn' + (i === 0 ? ' primary' : ''); b.textContent = s[0];
      b.onclick = function () { s[1](); upd(); }; bx.appendChild(b);
    });
    upd();
  }

  /* ======================= Middleware pipeline simulator ======================= */
  function renderPipe(host) {
    var stages = ['Exception Handler', 'HTTPS Redirection', 'Static Files', 'Routing', 'CORS', 'Authentication', 'Authorization', 'Endpoint (filters + action)'];
    var scen = {
      ok: { label: 'GET /api/products with valid token', stop: -1, code: '200 OK', note: 'Every middleware calls next(); the endpoint runs; the response travels back through the same components in reverse.' },
      http: { label: 'GET http://... (plain HTTP)', stop: 1, code: '307 Temporary Redirect', note: 'HTTPS redirection short-circuits and sends a redirect to the https:// URL. Nothing after it runs.' },
      static: { label: 'GET /logo.png (static file)', stop: 2, code: '200 OK (file)', note: 'Static Files middleware finds wwwroot/logo.png and ends the pipeline early - no routing/auth executed.' },
      cors: { label: 'OPTIONS /api/products (CORS pre-flight)', stop: 4, code: '204 No Content + Access-Control-* headers', note: 'The CORS middleware answers the pre-flight itself. The browser then sends the real request.' },
      noauth: { label: 'GET /api/products without token', stop: 6, code: '401 Unauthorized', note: 'Authentication finds no identity; Authorization sees [Authorize] on the endpoint and challenges (401).' },
      forbid: { label: 'DELETE /api/products/1 as role User', stop: 6, code: '403 Forbidden', note: 'Authenticated OK, but Authorization policy "Admin" fails -> Forbid (403).' },
      error: { label: 'GET /api/products/boom (action throws)', stop: -2, code: '500 ProblemDetails', note: 'The exception bubbles back up through the pipeline until the Exception Handler (first in line) catches it and writes a ProblemDetails response.' },
      nf: { label: 'GET /api/unknown', stop: -3, code: '404 Not Found', note: 'Routing found no endpoint; terminal middleware at the end of the pipeline returns 404.' }
    };
    host.innerHTML = '<h4>Lab: watch a request travel through the middleware pipeline</h4><div class="row"><select id="pp-sc">' +
      Object.keys(scen).map(function (k) { return '<option value="' + k + '">' + scen[k].label + '</option>'; }).join('') + '</select><button class="btn primary" id="pp-go">Send request</button></div>' +
      '<div class="pipeline" id="pp-st">' + stages.map(function (s) { return '<div class="stage">' + s + '</div>'; }).join('') + '</div><div class="out" id="pp-log">Choose a scenario and press Send.</div>';
    var running = false;
    $('#pp-go', host).onclick = async function () {
      if (running) return; running = true;
      var sc = scen[$('#pp-sc', host).value], els = $$('.stage', host), log = $('#pp-log', host);
      els.forEach(function (e) { e.className = 'stage'; }); log.textContent = '';
      var last = sc.stop >= 0 ? sc.stop : stages.length - 1, i;
      for (i = 0; i <= last; i++) {
        els[i].classList.add('hit'); log.textContent += '-> ' + stages[i] + (i === sc.stop ? '  [short-circuit: does NOT call next()]' : '  [calls next()]') + '\n'; await wait(380);
      }
      if (sc.stop >= 0) { els[sc.stop].classList.remove('hit'); els[sc.stop].classList.add('stop'); }
      if (sc.stop === -2) { els[stages.length - 1].classList.remove('hit'); els[stages.length - 1].classList.add('stop'); log.textContent += '!! Exception thrown in action\n'; await wait(350); els[0].classList.remove('hit'); els[0].classList.add('stop'); log.textContent += '<- Exception Handler catches it, writes ProblemDetails\n'; }
      if (sc.stop === -3) { els[stages.length - 1].classList.remove('hit'); els[stages.length - 1].classList.add('stop'); log.textContent += '-- no endpoint matched --\n'; }
      log.textContent += '\nRESPONSE: ' + sc.code + '\n' + sc.note; running = false;
    };
  }

  /* ======================= Rate limiter demo ======================= */
  function renderRate(host) {
    var LIMIT = 5, WIN = 10, count = 0, left = WIN, timer = null;
    host.innerHTML = '<h4>Lab: fixed-window rate limiter (5 requests / 10 s)</h4><div class="row"><button class="btn primary" id="rl-send">Send request</button><span id="rl-info"></span></div><div class="out" id="rl-log" style="max-height:180px;overflow:auto"></div>' +
      '<pre data-lang="csharp" data-file="Program.cs">builder.Services.AddRateLimiter(o =>\n{\n    o.RejectionStatusCode = StatusCodes.Status429TooManyRequests;\n    o.AddFixedWindowLimiter("api", w =>\n    {\n        w.PermitLimit = 5;\n        w.Window = TimeSpan.FromSeconds(10);\n        w.QueueLimit = 0;\n    });\n});\napp.UseRateLimiter();\napp.MapControllers().RequireRateLimiting("api");</pre>';
    var info = $('#rl-info', host), log = $('#rl-log', host);
    function paint() { info.textContent = 'Used ' + count + '/' + LIMIT + ' in current window' + (timer ? ' - window resets in ' + left + ' s' : ''); }
    $('#rl-send', host).onclick = function () {
      if (!timer) { left = WIN; timer = setInterval(function () { left--; if (left <= 0) { clearInterval(timer); timer = null; count = 0; log.textContent += '-- window reset --\n'; } paint(); }, 1000); }
      if (count < LIMIT) { count++; log.textContent += '200 OK            (permit ' + count + '/' + LIMIT + ')\n'; }
      else log.textContent += '429 Too Many Requests   Retry-After: ' + left + '\n';
      log.scrollTop = log.scrollHeight; paint();
    };
    paint();
  }

  /* ======================= DI lifetime demo ======================= */
  function renderDi(host) {
    var singleton = hex(4), reqNo = 0;
    host.innerHTML = '<h4>Lab: service lifetimes (Transient vs Scoped vs Singleton)</h4><p>Each HTTP request resolves the same service twice (e.g. once in a controller, once in another service). Compare the instance ids.</p>' +
      '<div class="row"><button class="btn primary" id="di-go">Simulate HTTP request</button><button class="btn" id="di-clr">Clear</button></div>' +
      '<div class="tblwrap"><table><thead><tr><th>Request</th><th>Transient (1st / 2nd resolve)</th><th>Scoped (1st / 2nd resolve)</th><th>Singleton (1st / 2nd resolve)</th></tr></thead><tbody id="di-rows"></tbody></table></div>';
    $('#di-go', host).onclick = function () {
      reqNo++; var sc = hex(4), tr = '<td>' + hex(4) + ' / ' + hex(4) + '</td>', s = '<td>' + sc + ' / ' + sc + '</td>', g = '<td>' + singleton + ' / ' + singleton + '</td>';
      $('#di-rows', host).insertAdjacentHTML('beforeend', '<tr><td>#' + reqNo + '</td>' + tr + s + g + '</tr>');
    };
    $('#di-clr', host).onclick = function () { $('#di-rows', host).innerHTML = ''; reqNo = 0; };
  }

  document.addEventListener('DOMContentLoaded', function () {
    var map = { 'swagger-root': renderSwagger, 'jwt-lab': renderJwtLab, 'flow-lab': renderFlowLab, 'pipe-demo': renderPipe, 'rate-demo': renderRate, 'di-demo': renderDi };
    Object.keys(map).forEach(function (id) { var el = document.getElementById(id); if (el) map[id](el); });
    if (root.GuideSetupCode) root.GuideSetupCode();
  });
})(typeof window !== 'undefined' ? window : globalThis);
