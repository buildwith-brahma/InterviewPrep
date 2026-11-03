/* Interactive labs + quizzes for the "C# Concepts" and "ASP.NET Core Concepts" guides.
   Each lab renders into an element with a known id (only if it exists on the page).
   Pure logic functions are exported for Node testing. */
(function (root) {
  'use strict';
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); };
  var code = function (s) { return esc(s).replace(/`([^`]+)`/g, '<code>$1</code>'); };

  /* ============================ C#: value vs reference ============================ */
  var VALREF = [
    { t: 'struct: copy, then modify the copy', code: 'struct Point { public int X; }\nvar a = new Point { X = 1 };\nvar b = a;        // copies the VALUE\nb.X = 99;\nConsole.WriteLine(a.X);\nConsole.WriteLine(b.X);',
      run: function () { var a = { X: 1 }, b = Object.assign({}, a); b.X = 99; return ['a.X = ' + a.X, 'b.X = ' + b.X, '', 'Value type: each variable owns its own copy.']; } },
    { t: 'class: copy the reference, modify through it', code: 'class Point { public int X; }\nvar a = new Point { X = 1 };\nvar b = a;        // copies the REFERENCE (same object)\nb.X = 99;\nConsole.WriteLine(a.X);\nConsole.WriteLine(b.X);',
      run: function () { var a = { X: 1 }, b = a; b.X = 99; return ['a.X = ' + a.X, 'b.X = ' + b.X, '', 'Reference type: both variables point to ONE object on the heap.']; } },
    { t: 'string: reference type, but immutable', code: 'string s1 = "hi";\nstring s2 = s1;\ns2 += "!";        // creates a NEW string\nConsole.WriteLine(s1);\nConsole.WriteLine(s2);',
      run: function () { var s1 = 'hi', s2 = s1; s2 += '!'; return ['s1 = ' + s1, 's2 = ' + s2, '', 'Strings cannot change in place; concatenation allocates a new string.']; } },
    { t: 'array: always a reference type (even int[])', code: 'int[] a = { 1, 2, 3 };\nint[] b = a;\nb[0] = 99;\nConsole.WriteLine(a[0]);\nint[] c = (int[])a.Clone();\nc[1] = 77;\nConsole.WriteLine(a[1]);',
      run: function () { var a = [1, 2, 3], b = a; b[0] = 99; var c = a.slice(); c[1] = 77; return ['a[0] = ' + a[0], 'a[1] = ' + a[1], '', 'Assignment shares the array; Clone() makes an independent (shallow) copy.']; } },
    { t: 'Pass a class to a method and mutate it', code: 'void Rename(Person p) { p.Name = "Bob"; }\nvar person = new Person { Name = "Ann" };\nRename(person);\nConsole.WriteLine(person.Name);',
      run: function () { var p = { Name: 'Ann' }; (function (q) { q.Name = 'Bob'; })(p); return ['person.Name = ' + p.Name, '', 'The REFERENCE was copied into the parameter, but both point to the same object.']; } },
    { t: 'Pass a class and re-assign the parameter', code: 'void Reset(Person p) { p = new Person { Name = "New" }; }\nvar person = new Person { Name = "Ann" };\nReset(person);\nConsole.WriteLine(person.Name);',
      run: function () { var p = { Name: 'Ann' }; (function (q) { q = { Name: 'New' }; return q; })(p); return ['person.Name = ' + p.Name, '', 'Only the local copy of the reference was re-pointed. The caller still has the old object.']; } },
    { t: 'Same, but with the ref keyword', code: 'void Reset(ref Person p) { p = new Person { Name = "New" }; }\nvar person = new Person { Name = "Ann" };\nReset(ref person);\nConsole.WriteLine(person.Name);',
      run: function () { var holder = { p: { Name: 'Ann' } }; (function (h) { h.p = { Name: 'New' }; })(holder); return ['person.Name = ' + holder.p.Name, '', '`ref` passes the VARIABLE itself, so re-assignment is visible to the caller.'.replace(/`/g, '')]; } },
    { t: 'Pass a struct to a method and mutate it', code: 'void Move(Point p) { p.X = 50; }\nvar pt = new Point { X = 1 };\nMove(pt);\nConsole.WriteLine(pt.X);',
      run: function () { var pt = { X: 1 }; (function (q) { q.X = 50; })(Object.assign({}, pt)); return ['pt.X = ' + pt.X, '', 'The struct was copied into the parameter; the caller\'s value is untouched (use ref to change it).']; } }
  ];
  function renderValRef(host) {
    host.innerHTML = '<h4>Lab: value types vs reference types</h4><p>Pick a scenario, predict the output, then press Run.</p>' +
      '<div class="row"><select id="vr-sel">' + VALREF.map(function (c, i) { return '<option value="' + i + '">' + esc(c.t) + '</option>'; }).join('') + '</select><button class="btn primary" id="vr-run" type="button">Run</button></div>' +
      '<div class="out" id="vr-code"></div><div class="out" id="vr-out">Press Run.</div>';
    var sel = $('#vr-sel', host);
    function show() { $('#vr-code', host).textContent = VALREF[+sel.value].code; $('#vr-out', host).textContent = 'Press Run.'; }
    sel.onchange = show;
    $('#vr-run', host).onclick = function () { $('#vr-out', host).textContent = VALREF[+sel.value].run().join('\n'); };
    show();
  }

  /* ============================ C#: LINQ lab ============================ */
  var EMPS = [['Asha', 'IT', 85000], ['Ben', 'HR', 52000], ['Chen', 'IT', 98000], ['Dara', 'Sales', 61000], ['Elif', 'IT', 72000], ['Farid', 'Sales', 45000], ['Gita', 'HR', 58000], ['Hugo', 'IT', 120000], ['Ines', 'Sales', 77000], ['Jun', 'HR', 49000]].map(function (r) { return { Name: r[0], Dept: r[1], Salary: r[2] }; });
  function linqQuery(src, o) {
    var code = 'var query = employees', res = src.slice();
    var conds = [], jc = [];
    if (o.dept && o.dept !== 'All') { conds.push('e.Dept == "' + o.dept + '"'); res = res.filter(function (e) { return e.Dept === o.dept; }); }
    if (o.min > 0) { conds.push('e.Salary >= ' + o.min); res = res.filter(function (e) { return e.Salary >= o.min; }); }
    if (conds.length) code += '\n    .Where(e => ' + conds.join(' && ') + ')';
    if (o.order === 'name') { code += '\n    .OrderBy(e => e.Name)'; res.sort(function (a, b) { return a.Name < b.Name ? -1 : 1; }); }
    if (o.order === 'salary') { code += '\n    .OrderByDescending(e => e.Salary)'; res.sort(function (a, b) { return b.Salary - a.Salary; }); }
    if (o.group) {
      code += '\n    .GroupBy(e => e.Dept)\n    .Select(g => new { Dept = g.Key, Count = g.Count(), Avg = g.Average(e => e.Salary) })';
      var m = {}, order = []; res.forEach(function (e) { if (!m[e.Dept]) { m[e.Dept] = []; order.push(e.Dept); } m[e.Dept].push(e); });
      res = order.map(function (d) { var l = m[d]; return { Dept: d, Count: l.length, Avg: Math.round(l.reduce(function (s, x) { return s + x.Salary; }, 0) / l.length) }; });
    } else if (o.proj) { code += '\n    .Select(e => new { e.Name, e.Salary })'; res = res.map(function (e) { return { Name: e.Name, Salary: e.Salary }; }); }
    if (o.take > 0) { code += '\n    .Take(' + o.take + ')'; res = res.slice(0, o.take); }
    code += o.tolist ? '\n    .ToList();   // executes NOW' : ';          // nothing has executed yet (deferred)';
    return { code: code, rows: res };
  }
  function renderLinq(host) {
    var src = EMPS.slice(), snapshot = null;
    host.innerHTML = '<h4>Lab: build a LINQ query and see deferred execution</h4>' +
      '<div class="row"><label>Dept <select id="lq-d"><option>All</option><option>IT</option><option>HR</option><option>Sales</option></select></label>' +
      '<label>Min salary <input id="lq-m" type="number" value="0" step="10000" style="width:100px"></label>' +
      '<label>Order <select id="lq-o"><option value="">none</option><option value="name">by name</option><option value="salary">by salary desc</option></select></label>' +
      '<label>Take <input id="lq-t" type="number" value="0" min="0" style="width:60px"></label>' +
      '<label><input id="lq-p" type="checkbox"> Select(Name, Salary)</label><label><input id="lq-g" type="checkbox"> GroupBy dept</label>' +
      '<label><input id="lq-l" type="checkbox"> ToList()</label></div>' +
      '<div class="row"><button class="btn primary" id="lq-run" type="button">foreach (enumerate the query)</button><button class="btn" id="lq-add" type="button">Add Zed (IT, 200000) to the source list</button><button class="btn" id="lq-rst" type="button">Reset source</button></div>' +
      '<div class="out" id="lq-code"></div><div class="out" id="lq-res"></div>';
    function opts() { return { dept: $('#lq-d', host).value, min: +$('#lq-m', host).value || 0, order: $('#lq-o', host).value, take: +$('#lq-t', host).value || 0, proj: $('#lq-p', host).checked, group: $('#lq-g', host).checked, tolist: $('#lq-l', host).checked }; }
    function define() { var q = linqQuery(src, opts()); $('#lq-code', host).textContent = q.code + '\n\n// source list currently has ' + src.length + ' employees'; snapshot = opts().tolist ? q.rows : null; }
    function run() {
      var o = opts(), rows = snapshot || linqQuery(src, o).rows;
      $('#lq-res', host).textContent = (snapshot ? '// ToList() snapshot taken when the query was defined\n' : '// evaluated just now against the current source\n') + (rows.length ? rows.map(function (r) { return JSON.stringify(r); }).join('\n') : '(no rows)') + '\n\n' + rows.length + ' row(s)';
    }
    ['#lq-d', '#lq-m', '#lq-o', '#lq-t', '#lq-p', '#lq-g', '#lq-l'].forEach(function (s) { $(s, host).addEventListener('change', function () { define(); run(); }); });
    $('#lq-run', host).onclick = run;
    $('#lq-add', host).onclick = function () { src.push({ Name: 'Zed', Dept: 'IT', Salary: 200000 }); $('#lq-code', host).textContent = $('#lq-code', host).textContent.replace(/\d+ employees$/, src.length + ' employees'); $('#lq-res', host).textContent = 'Zed added to the source AFTER the query was defined.\nNow press "foreach": a deferred query includes Zed, a ToList() snapshot does not.'; };
    $('#lq-rst', host).onclick = function () { src = EMPS.slice(); define(); run(); };
    define(); run();
  }

  /* ============================ C#: async lab ============================ */
  function renderAsync(host) {
    host.innerHTML = '<h4>Lab: sequential await vs Task.WhenAll, and thread-pool starvation</h4>' +
      '<div class="row"><label>Task A ms <input id="as-a" type="number" value="300" style="width:80px"></label><label>Task B ms <input id="as-b" type="number" value="500" style="width:80px"></label><label>Task C ms <input id="as-c" type="number" value="200" style="width:80px"></label><button class="btn primary" id="as-go" type="button">Compare</button></div>' +
      '<div id="as-bars"></div><div class="out" id="as-out"></div>' +
      '<h4 style="margin-top:14px">Blocking (.Result) vs async under load</h4>' +
      '<div class="row"><label>Concurrent requests <input id="as-r" type="number" value="200" style="width:80px"></label><label>Worker threads <input id="as-t" type="number" value="16" style="width:70px"></label><label>I/O wait per request (ms) <input id="as-w" type="number" value="500" style="width:80px"></label><button class="btn primary" id="as-sim" type="button">Simulate</button></div>' +
      '<div class="out" id="as-sim-out"></div>';
    function bar(label, start, len, total, cls) { return '<div style="display:flex;align-items:center;gap:8px;margin:2px 0"><span style="width:56px;font-size:12px">' + label + '</span><div style="flex:1;background:var(--surface2);border-radius:4px;height:18px;position:relative"><div style="position:absolute;left:' + (start / total * 100) + '%;width:' + Math.max(1, len / total * 100) + '%;height:18px;border-radius:4px;background:' + cls + '"></div></div><span style="width:70px;font-size:12px">' + len + ' ms</span></div>'; }
    function go() {
      var a = +$('#as-a', host).value || 0, b = +$('#as-b', host).value || 0, c = +$('#as-c', host).value || 0, seq = a + b + c, par = Math.max(a, b, c), tot = Math.max(seq, 1);
      var h = '<b>Sequential: <code>await A(); await B(); await C();</code></b>' + bar('A', 0, a, tot, '#2b86e0') + bar('B', a, b, tot, '#1f9d4d') + bar('C', a + b, c, tot, '#e08a00') +
        '<b>Concurrent: <code>await Task.WhenAll(A(), B(), C());</code></b>' + bar('A', 0, a, tot, '#2b86e0') + bar('B', 0, b, tot, '#1f9d4d') + bar('C', 0, c, tot, '#e08a00');
      $('#as-bars', host).innerHTML = h;
      $('#as-out', host).textContent = 'Sequential total = ' + a + ' + ' + b + ' + ' + c + ' = ' + seq + ' ms\nWhenAll total      = max(' + a + ', ' + b + ', ' + c + ') = ' + par + ' ms\nSaved: ' + (seq - par) + ' ms (' + (seq ? Math.round((seq - par) / seq * 100) : 0) + '%)\n\nOnly start tasks together when they are INDEPENDENT. If B needs the result of A, you must await A first.';
    }
    $('#as-go', host).onclick = go;
    $('#as-sim', host).onclick = function () {
      var r = +$('#as-r', host).value || 1, t = +$('#as-t', host).value || 1, w = +$('#as-w', host).value || 0;
      var blocking = Math.ceil(r / t) * w, asyncT = w + 5;
      $('#as-sim-out', host).textContent = 'Blocking (.Result / sync I/O): each thread is stuck for ' + w + ' ms.\n   ' + r + ' requests / ' + t + ' threads = ' + Math.ceil(r / t) + ' waves x ' + w + ' ms = ~' + blocking + ' ms for the last request\n' +
        'Async (await): threads are released during the wait, so all ' + r + ' requests overlap.\n   total ~' + asyncT + ' ms (wait + tiny CPU work)\n\nRatio: ' + (blocking / asyncT).toFixed(1) + 'x slower when blocking. The real pool also injects threads slowly (about 1-2 per second), so latency spikes are worse in practice.';
    };
    go(); $('#as-sim', host).onclick();
  }

  /* ============================ C#: GC lab ============================ */
  function renderGc(host) {
    var objs = [], id = 0, gcs = { 0: 0, 1: 0, 2: 0 };
    host.innerHTML = '<h4>Lab: generational garbage collection</h4><p>Allocate objects (they start in Generation 0). Click an object to toggle whether something still <b>references</b> it (green = reachable, grey = garbage). Then run a collection and watch survivors get promoted.</p>' +
      '<div class="row"><button class="btn primary" id="gc-alloc" type="button">Allocate 8 objects</button><button class="btn" id="gc-g0" type="button">Collect Gen 0</button><button class="btn" id="gc-g1" type="button">Collect Gen 0+1</button><button class="btn" id="gc-g2" type="button">Full GC (0+1+2)</button><button class="btn" id="gc-rst" type="button">Reset</button></div>' +
      '<div class="grid3" id="gc-heap"></div><div class="out" id="gc-log" style="max-height:150px;overflow:auto"></div>';
    var log = $('#gc-log', host);
    function say(t) { log.textContent += t + '\n'; log.scrollTop = log.scrollHeight; }
    function paint() {
      $('#gc-heap', host).innerHTML = [0, 1, 2].map(function (g) {
        var l = objs.filter(function (o) { return o.g === g; });
        return '<div class="card"><h4>Gen ' + g + ' <small>(' + l.length + ' objs, ' + gcs[g] + ' GCs)</small></h4><div style="display:flex;flex-wrap:wrap;gap:4px;min-height:34px">' +
          l.map(function (o) { return '<span data-id="' + o.id + '" title="click to toggle reference" style="cursor:pointer;padding:3px 7px;border-radius:5px;font-size:12px;color:#fff;background:' + (o.live ? '#1f9d4d' : '#8a8f9d') + '">#' + o.id + '</span>'; }).join('') + '</div></div>';
      }).join('');
      $$('#gc-heap span', host).forEach(function (s) { s.onclick = function () { var o = objs.filter(function (x) { return x.id === +s.getAttribute('data-id'); })[0]; o.live = !o.live; paint(); }; });
    }
    function collect(maxGen) {
      var before = objs.length, freed = 0, moved = 0;
      objs = objs.filter(function (o) { if (o.g <= maxGen && !o.live) { freed++; return false; } return true; });
      objs.forEach(function (o) { if (o.g <= maxGen && o.g < 2) { o.g++; moved++; } });
      for (var g = 0; g <= maxGen; g++) gcs[g]++;
      say('Gen ' + maxGen + ' collection: freed ' + freed + ' unreachable object(s), promoted ' + moved + ' survivor(s). Heap ' + before + ' -> ' + objs.length + '.');
      paint();
    }
    $('#gc-alloc', host).onclick = function () { for (var i = 0; i < 8; i++) objs.push({ id: ++id, g: 0, live: Math.random() < 0.3 }); say('Allocated 8 objects in Gen 0 (about 30% reachable).'); paint(); };
    $('#gc-g0', host).onclick = function () { collect(0); };
    $('#gc-g1', host).onclick = function () { collect(1); };
    $('#gc-g2', host).onclick = function () { collect(2); };
    $('#gc-rst', host).onclick = function () { objs = []; id = 0; gcs = { 0: 0, 1: 0, 2: 0 }; log.textContent = ''; paint(); };
    paint(); say('Tip: most objects die young, so Gen 0 collections are cheap and frequent; Gen 2 (full) collections are rare and expensive.');
  }

  /* ============================ ASP.NET: route lab ============================ */
  function parseTemplate(t) {
    var segs = t.replace(/^\/+/, '').split('/').filter(function (x) { return x !== ''; });
    return segs.map(function (s) {
      var m = s.match(/^\{(\*{0,2})(\w+)((?::\w+(?:\([^)]*\))?)*)(\?)?(?:=([^}]*))?\}$/);
      if (m) {
        var cons = m[3].split(':').filter(Boolean).map(function (c) { var k = c.match(/^(\w+)(?:\((.*)\))?$/); return { name: k[1].toLowerCase(), arg: k[2] }; });
        return { kind: 'param', name: m[2], catchAll: !!m[1], cons: cons, opt: !!m[4], def: m[5] };
      }
      if (/[{}]/.test(s)) return { kind: 'unsupported', text: s };
      return { kind: 'lit', text: s };
    });
  }
  function checkCons(c, v) {
    var n = c.name, a = c.arg, x;
    switch (n) {
      case 'int': return /^-?\d+$/.test(v) && Math.abs(+v) <= 2147483648;
      case 'long': return /^-?\d+$/.test(v);
      case 'double': case 'float': case 'decimal': return /^-?\d+(\.\d+)?$/.test(v);
      case 'bool': return /^(true|false)$/i.test(v);
      case 'guid': return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
      case 'alpha': return /^[A-Za-z]+$/.test(v);
      case 'datetime': return /\d/.test(v) && !isNaN(Date.parse(v));
      case 'min': return /^-?\d+$/.test(v) && +v >= +a;
      case 'max': return /^-?\d+$/.test(v) && +v <= +a;
      case 'range': x = (a || '').split(','); return /^-?\d+$/.test(v) && +v >= +x[0] && +v <= +x[1];
      case 'minlength': return v.length >= +a;
      case 'maxlength': return v.length <= +a;
      case 'length': x = (a || '').split(','); return x.length === 1 ? v.length === +x[0] : (v.length >= +x[0] && v.length <= +x[1]);
      default: return false;
    }
  }
  function urlParts(url) { return url.split('?')[0].replace(/^\/+/, '').split('/').filter(function (x) { return x !== ''; }).map(function (p) { try { return decodeURIComponent(p); } catch (e) { return p; } }); }
  function matchRoute(tpl, url) {
    var segs = parseTemplate(tpl), parts = urlParts(url), vals = {}, score = [], i = 0, k;
    var fail = function (w) { return { ok: false, why: w }; };
    for (k = 0; k < segs.length; k++) {
      var s = segs[k];
      if (s.kind === 'unsupported') return fail('segment "' + s.text + '" mixes literal text and a parameter (complex segments are not supported by this lab)');
      if (s.kind === 'lit') {
        if (i >= parts.length) return fail('URL ended; expected literal "' + s.text + '"');
        if (parts[i].toLowerCase() !== s.text.toLowerCase()) return fail('URL segment "' + parts[i] + '" is not literal "' + s.text + '"');
        score.push(1); i++; continue;
      }
      if (s.catchAll) { vals[s.name] = parts.slice(i).join('/'); i = parts.length; score.push(5); continue; }
      if (i >= parts.length) {
        if (s.opt) { score.push(4); continue; }
        if (s.def !== undefined) { vals[s.name] = s.def; score.push(4); continue; }
        return fail('URL ended; no value for {' + s.name + '}');
      }
      var v = parts[i];
      for (var c = 0; c < s.cons.length; c++) if (!checkCons(s.cons[c], v)) return fail('value "' + v + '" fails constraint :' + s.cons[c].name + (s.cons[c].arg ? '(' + s.cons[c].arg + ')' : ''));
      vals[s.name] = v; score.push(s.cons.length ? 2 : 3); i++;
    }
    if (i < parts.length) return fail('extra URL segment "' + parts[i] + '" (no template segment left)');
    return { ok: true, values: vals, score: score };
  }
  function cmpScore(a, b) { for (var i = 0; i < Math.max(a.length, b.length); i++) { var x = a[i] === undefined ? 9 : a[i], y = b[i] === undefined ? 9 : b[i]; if (x !== y) return x - y; } return 0; }
  function pickRoute(templates, url) {
    var res = templates.map(function (t) { return { tpl: t, m: matchRoute(t, url) }; });
    var ok = res.filter(function (r) { return r.m.ok; }).sort(function (p, q) { return cmpScore(p.m.score, q.m.score); });
    var verdict = 'none';
    if (ok.length === 1) verdict = 'single';
    else if (ok.length > 1) verdict = cmpScore(ok[0].m.score, ok[1].m.score) === 0 ? 'ambiguous' : 'winner';
    return { results: res, matches: ok, verdict: verdict };
  }
  function renderRoute(host) {
    var presets = [
      ['/api/products/42', 'api/products\napi/products/{id:int}\napi/products/{id}\napi/products/search\napi/products/{*slug}'],
      ['/api/products/search', 'api/products\napi/products/{id:int}\napi/products/{id}\napi/products/search\napi/products/{*slug}'],
      ['/api/orders/7/items', 'api/orders/{orderId:int}/items/{itemId?}\napi/orders/{orderId:int}'],
      ['/files/2024/report.pdf', 'files/{*path}\nfiles/{year:int}/{name}'],
      ['/blog/hello', 'blog/{slug:alpha}\nblog/{page:int=1}']
    ];
    host.innerHTML = '<h4>Lab: route template matcher</h4><p>One template per line. Type a URL and see which templates match, the extracted values, and which route wins (literal &gt; constrained &gt; plain parameter &gt; optional &gt; catch-all).</p>' +
      '<div class="row"><select id="rt-pre">' + presets.map(function (p, i) { return '<option value="' + i + '">' + esc(p[0]) + '</option>'; }).join('') + '</select><label>URL <input id="rt-url" style="width:280px" value="' + esc(presets[0][0]) + '"></label></div>' +
      '<textarea id="rt-tpl" rows="6" style="width:100%;font-family:Consolas,monospace">' + esc(presets[0][1]) + '</textarea><div class="out" id="rt-out"></div>';
    function run() {
      var tpls = $('#rt-tpl', host).value.split('\n').map(function (s) { return s.trim(); }).filter(Boolean), r = pickRoute(tpls, $('#rt-url', host).value), o = '';
      r.results.forEach(function (x) { o += (x.m.ok ? '[match]    ' : '[no match] ') + x.tpl + (x.m.ok ? '   ' + JSON.stringify(x.m.values) + '  precedence ' + x.m.score.join('.') : '   <- ' + x.m.why) + '\n'; });
      o += '\n';
      if (r.verdict === 'none') o += 'RESULT: 404 Not Found (no endpoint matched).';
      else if (r.verdict === 'ambiguous') o += 'RESULT: AmbiguousMatchException -> 500. Two endpoints are equally specific:\n   ' + r.matches[0].tpl + '\n   ' + r.matches[1].tpl + '\nFix: add a constraint or change one template.';
      else o += 'RESULT: ' + r.matches[0].tpl + ' wins' + (r.verdict === 'winner' ? ' (more specific than the other ' + (r.matches.length - 1) + ' match(es))' : '') + '.\nBound values: ' + JSON.stringify(r.matches[0].m.values);
      $('#rt-out', host).textContent = o;
    }
    $('#rt-pre', host).onchange = function () { var p = presets[+this.value]; $('#rt-url', host).value = p[0]; $('#rt-tpl', host).value = p[1]; run(); };
    $('#rt-url', host).oninput = run; $('#rt-tpl', host).oninput = run; run();
  }

  /* ============================ ASP.NET: configuration lab ============================ */
  function flattenJson(o, prefix, out) {
    out = out || {};
    if (o !== null && typeof o === 'object') {
      Object.keys(o).forEach(function (k) { flattenJson(o[k], prefix ? prefix + ':' + k : k, out); });
      if (Array.isArray(o) && !o.length && prefix) out[prefix] = '';
    } else if (prefix) out[prefix] = String(o);
    return out;
  }
  function parseKv(text, envStyle) {
    var out = {};
    text.split('\n').forEach(function (l) {
      l = l.trim(); if (!l || l.charAt(0) === '#') return;
      var i = l.indexOf('='); if (i < 1) return;
      var k = l.slice(0, i).trim().replace(/^--?/, '').replace(/^\//, ''), v = l.slice(i + 1).trim();
      if (envStyle) k = k.replace(/__/g, ':');
      out[k] = v;
    });
    return out;
  }
  function buildConfig(sources) {
    var map = {}, order = [];
    sources.forEach(function (s) {
      Object.keys(s.pairs).forEach(function (k) {
        var lk = k.toLowerCase();
        if (!map[lk]) { map[lk] = { key: k, hist: [] }; order.push(lk); }
        map[lk].hist.push({ src: s.name, value: s.pairs[k] });
      });
    });
    return order.sort().map(function (lk) { var e = map[lk], last = e.hist[e.hist.length - 1]; return { key: e.key, value: last.value, src: last.src, hist: e.hist }; });
  }
  function renderConfig(host) {
    host.innerHTML = '<h4>Lab: configuration providers &ndash; last one wins</h4><p>Edit any source. Providers are added in this order and later ones override earlier ones: <code>appsettings.json</code> &rarr; <code>appsettings.{Environment}.json</code> &rarr; User secrets (Development only) &rarr; Environment variables &rarr; Command-line.</p>' +
      '<div class="row"><label>ASPNETCORE_ENVIRONMENT <select id="cf-env"><option>Development</option><option>Staging</option><option>Production</option></select></label></div>' +
      '<div class="grid2"><div><b>appsettings.json</b><textarea id="cf-base" rows="9" style="width:100%;font-family:Consolas,monospace">{\n  "Logging": { "LogLevel": { "Default": "Information" } },\n  "ConnectionStrings": { "Main": "Server=.;Database=Shop" },\n  "Jwt": { "Issuer": "https://api.local", "ExpiryMinutes": 15 },\n  "AllowedHosts": "*"\n}</textarea></div>' +
      '<div><b>appsettings.{Environment}.json</b><textarea id="cf-envj" rows="9" style="width:100%;font-family:Consolas,monospace">{\n  "Logging": { "LogLevel": { "Default": "Debug" } },\n  "Jwt": { "ExpiryMinutes": 60 }\n}</textarea></div>' +
      '<div><b>User secrets (secrets.json, Development only)</b><textarea id="cf-sec" rows="4" style="width:100%;font-family:Consolas,monospace">{\n  "Jwt": { "Key": "dev-only-secret-key-1234567890abcdef" }\n}</textarea></div>' +
      '<div><b>Environment variables (KEY=VALUE, __ means :)</b><textarea id="cf-evar" rows="4" style="width:100%;font-family:Consolas,monospace">ConnectionStrings__Main=Server=prod-sql;Database=Shop\nJwt__Key=from-key-vault</textarea></div></div>' +
      '<b>Command-line arguments</b><textarea id="cf-cli" rows="2" style="width:100%;font-family:Consolas,monospace">--Jwt:ExpiryMinutes=5</textarea><div class="out" id="cf-out" style="overflow:auto"></div>';
    function run() {
      var env = $('#cf-env', host).value, srcs = [], err = [];
      function js(id, name, on) {
        if (on === false) return;
        try { srcs.push({ name: name, pairs: flattenJson(JSON.parse($(id, host).value || '{}'), '') }); } catch (e) { err.push(name + ': invalid JSON (' + e.message + ')'); }
      }
      js('#cf-base', 'appsettings.json');
      js('#cf-envj', 'appsettings.' + env + '.json');
      js('#cf-sec', 'user secrets', env === 'Development');
      srcs.push({ name: 'environment variable', pairs: parseKv($('#cf-evar', host).value, true) });
      srcs.push({ name: 'command line', pairs: parseKv($('#cf-cli', host).value, false) });
      var rows = buildConfig(srcs);
      var o = err.length ? 'ERRORS:\n  ' + err.join('\n  ') + '\n\n' : '';
      o += 'Key'.padEnd(34) + 'Final value'.padEnd(40) + 'Winning source\n' + '-'.repeat(100) + '\n';
      rows.forEach(function (r) { o += r.key.padEnd(34) + (r.value.length > 38 ? r.value.slice(0, 35) + '...' : r.value).padEnd(40) + r.src + (r.hist.length > 1 ? '   (overrode ' + (r.hist.length - 1) + ')' : '') + '\n'; });
      $('#cf-out', host).textContent = o + '\nRead with: builder.Configuration["Jwt:ExpiryMinutes"]  or bind a section to an Options class.';
    }
    $$('textarea,select', host).forEach(function (e) { e.addEventListener('input', run); e.addEventListener('change', run); });
    run();
  }

  /* ============================ ASP.NET: filter lab ============================ */
  function filterLog(en, sc) {
    var L = [];
    function result(label) {
      if (en.rslt) { L.push('Result filter         OnResultExecuting'); L.push('RESULT executes: ' + label); L.push('Result filter         OnResultExecuted'); } else L.push('RESULT executes: ' + label);
    }
    if (en.auth) {
      L.push('Authorization filter  OnAuthorization');
      if (sc === 'auth') { L.push('   -> not allowed: sets context.Result (SHORT-CIRCUIT)'); L.push('RESULT executes: 401 / 403'); L.push('(Resource, Action and normal Result filters are skipped; only IAlwaysRunResultFilter would run)'); return L; }
    } else if (sc === 'auth') L.push('(Authorization filter is disabled in this lab, so the scenario behaves like a normal request)');
    if (en.res) {
      L.push('Resource filter       OnResourceExecuting');
      if (sc === 'cache') { L.push('   -> cache hit: sets context.Result (SHORT-CIRCUIT)'); L.push('RESULT executes: 200 (cached) - model binding, action filters and the action are skipped'); L.push('Resource filter       OnResourceExecuted'); return L; }
    } else if (sc === 'cache') L.push('(Resource filter is disabled, so there is no cache to hit)');
    L.push('Model binding + validation');
    if (sc === 'invalid') {
      L.push('[ApiController] automatic ModelState check -> short-circuits with 400 ValidationProblemDetails');
      L.push('(your Action filters and the action do NOT run)');
      result('400 Bad Request'); if (en.res) L.push('Resource filter       OnResourceExecuted'); return L;
    }
    if (en.act) L.push('Action filter         OnActionExecuting');
    var threw = sc === 'throw';
    L.push('ACTION METHOD runs' + (threw ? ' ... throws InvalidOperationException' : ' and returns Ok(...)'));
    if (en.act) L.push('Action filter         OnActionExecuted' + (threw ? ' (context.Exception is set)' : ''));
    if (threw) {
      if (en.exc) { L.push('Exception filter      OnException -> handled, sets context.Result = 500 ProblemDetails'); result('500 ProblemDetails'); }
      else { L.push('No exception filter handles it -> exception propagates to middleware (UseExceptionHandler writes a 500)'); if (en.res) L.push('Resource filter       OnResourceExecuted (context.Exception set)'); return L; }
    } else result('200 OK');
    if (en.res) L.push('Resource filter       OnResourceExecuted');
    return L;
  }
  function renderFilter(host) {
    host.innerHTML = '<h4>Lab: MVC filter pipeline order</h4><p>Enable filters, choose what happens during the request, and read the exact execution order.</p>' +
      '<div class="row"><label><input type="checkbox" id="ft-auth" checked> Authorization</label><label><input type="checkbox" id="ft-res" checked> Resource</label><label><input type="checkbox" id="ft-act" checked> Action</label><label><input type="checkbox" id="ft-exc" checked> Exception</label><label><input type="checkbox" id="ft-rslt" checked> Result</label></div>' +
      '<div class="row"><label>Scenario <select id="ft-sc"><option value="ok">Normal request</option><option value="auth">Authorization fails</option><option value="cache">Resource filter has a cache hit</option><option value="invalid">Model state invalid ([ApiController])</option><option value="throw">Action throws an exception</option></select></label></div><div class="out" id="ft-out"></div>';
    function run() {
      var en = { auth: $('#ft-auth', host).checked, res: $('#ft-res', host).checked, act: $('#ft-act', host).checked, exc: $('#ft-exc', host).checked, rslt: $('#ft-rslt', host).checked };
      $('#ft-out', host).textContent = filterLog(en, $('#ft-sc', host).value).map(function (l, i) { return String(i + 1).padStart(2) + '. ' + l; }).join('\n');
    }
    $$('input,select', host).forEach(function (e) { e.addEventListener('change', run); });
    run();
  }

  /* ============================ Quiz ============================ */
  function renderQuiz(host) {
    var data;
    try { data = JSON.parse(($('script[type="application/json"]', host) || {}).textContent); } catch (e) { host.textContent = 'Quiz data error: ' + e.message; return; }
    var i = 0, score = 0, answered = false, title = host.getAttribute('data-title') || 'Quiz';
    function draw() {
      if (i >= data.length) {
        host.innerHTML = '<h4>' + esc(title) + ' - finished</h4><p>Your score: <b>' + score + ' / ' + data.length + '</b> (' + Math.round(score / data.length * 100) + '%)</p><p>' + (score === data.length ? 'Perfect. You are interview ready on these topics.' : score >= data.length * 0.7 ? 'Good. Review the explanations of the ones you missed.' : 'Re-read the related chapters, then try again.') + '</p><div class="row"><button class="btn primary" id="qz-again" type="button">Try again</button></div>';
        $('#qz-again', host).onclick = function () { i = 0; score = 0; answered = false; draw(); }; return;
      }
      var q = data[i]; answered = false;
      host.innerHTML = '<h4>' + esc(title) + ' &ndash; question ' + (i + 1) + ' of ' + data.length + '</h4><div style="font-weight:600;margin:6px 0">' + code(q.q) + '</div>' +
        (q.code ? '<div class="out">' + esc(q.code) + '</div>' : '') +
        '<div id="qz-opts">' + q.o.map(function (o, k) { return '<div><button class="btn" data-k="' + k + '" type="button" style="display:block;width:100%;text-align:left;margin:4px 0">' + String.fromCharCode(65 + k) + '. ' + code(o) + '</button></div>'; }).join('') + '</div>' +
        '<div id="qz-exp" style="margin-top:8px"></div><div class="row"><button class="btn primary" id="qz-next" type="button" style="display:none">Next</button><span style="margin-left:auto">Score: ' + score + '</span></div>';
      $$('#qz-opts button', host).forEach(function (b) {
        b.onclick = function () {
          if (answered) return; answered = true; var k = +b.getAttribute('data-k'), good = k === q.a;
          if (good) score++;
          $$('#qz-opts button', host).forEach(function (x) { var kk = +x.getAttribute('data-k'); if (kk === q.a) { x.style.background = '#1f9d4d'; x.style.color = '#fff'; } else if (kk === k) { x.style.background = '#d64560'; x.style.color = '#fff'; } });
          $('#qz-exp', host).innerHTML = '<div class="' + (good ? 'tip' : 'warn') + '"><b>' + (good ? 'Correct' : 'Not quite') + '</b>' + code(q.e || '') + '</div>';
          var nx = $('#qz-next', host); nx.style.display = ''; nx.textContent = i + 1 >= data.length ? 'Finish' : 'Next';
          nx.onclick = function () { i++; draw(); };
        };
      });
    }
    draw();
  }

  var LABS = { 'valref-lab': renderValRef, 'linq-lab': renderLinq, 'async-lab': renderAsync, 'gc-lab': renderGc, 'route-lab': renderRoute, 'config-lab': renderConfig, 'filter-lab': renderFilter };
  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', function () {
      Object.keys(LABS).forEach(function (id) { var el = document.getElementById(id); if (el) LABS[id](el); });
      $$('.quiz').forEach(renderQuiz);
      if (root.GuideSetupCode) root.GuideSetupCode();
    });
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = { matchRoute: matchRoute, pickRoute: pickRoute, parseTemplate: parseTemplate, flattenJson: flattenJson, parseKv: parseKv, buildConfig: buildConfig, filterLog: filterLog, linqQuery: linqQuery, EMPS: EMPS };
})(typeof window !== 'undefined' ? window : globalThis);
