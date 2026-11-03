/* ASP.NET Core Web API Guide - core behaviour: nav, search, highlighting, copy, tabs, diagrams */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  function esc(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  /* ---------------- Syntax highlighting ---------------- */
  var CS_KW = ('abstract as base bool break byte case catch char checked class const continue decimal default delegate do double else enum event explicit extern false finally fixed float for foreach goto if implicit in int interface internal is lock long namespace new null object operator out override params private protected public readonly ref return sbyte sealed short sizeof stackalloc static string struct switch this throw true try typeof uint ulong unchecked unsafe ushort using virtual void volatile while var async await record init required get set yield when with where select from orderby partial global nameof and or not').split(' ');
  var TS_KW = ('abstract as async await break case catch class const constructor continue default delete do else enum export extends false finally for from function if implements import in instanceof interface let new null of private protected public readonly return static super switch this throw true try type typeof undefined var void while yield').split(' ');
  var SQL_KW = ('select from where insert into values update set delete create table alter drop primary key foreign references not null unique default and or order by group having join inner left right full outer cross on as int bigint nvarchar varchar decimal datetime2 bit uniqueidentifier identity index clustered nonclustered include with begin transaction commit rollback tran exec procedure view union all distinct top offset fetch next rows only case when then else end exists in between like is over partition row_number rank dense_rank count sum avg min max check constraint add column isolation level read committed uncommitted repeatable snapshot serializable declare use go').split(' ');
  var BASH_CMD = ('dotnet npm npx curl java nswag openapi-generator-cli openapi-generator swagger-codegen-cli git cd mkdir export docker echo node pwsh ng wget gulp grunt bower webpack karma yarn az aws kubectl terraform dig nslookup ping traceroute openssl nc netstat ss pnpm vite').split(' ');
  function toSet(a) { var o = {}; a.forEach(function (k) { o[k] = 1; }); return o; }
  var KW = { csharp: toSet(CS_KW), ts: toSet(TS_KW), sql: toSet(SQL_KW), json: toSet(['true', 'false', 'null']), bash: {}, http: {}, plain: {}, yaml: toSet(['true', 'false', 'null']), gherkin: toSet(['Feature', 'Scenario', 'Background', 'Given', 'When', 'Then', 'And', 'But', 'Examples', 'Outline']) };

  function highlightXml(code) {
    var re = /(<!--[\s\S]*?-->)|(<\/?[A-Za-z][\w.:-]*)|("[^"\n]*")|(\/?>)|(\s[\w:.-]+(?==))/g;
    var out = '', last = 0, m;
    while ((m = re.exec(code)) !== null) {
      out += esc(code.slice(last, m.index)); last = re.lastIndex;
      var cls = m[1] ? 'tc' : m[2] ? 'tk' : m[3] ? 'ts' : m[4] ? 'tk' : 'ta';
      out += '<span class="' + cls + '">' + esc(m[0]) + '</span>';
    }
    return out + esc(code.slice(last));
  }

  function highlight(code, lang) {
    lang = lang || 'plain';
    if (lang === 'cs') lang = 'csharp';
    if (lang === 'typescript' || lang === 'js' || lang === 'javascript' || lang === 'jsx' || lang === 'tsx') lang = 'ts';
    if (lang === 'html') lang = 'xml';
    if (lang === 'jql') lang = 'sql';
    if (lang === 'powershell' || lang === 'sh' || lang === 'shell') lang = 'bash';
    if (lang === 'plain') return esc(code);
    if (lang === 'xml') return highlightXml(code);
    var cm = (lang === 'bash' || lang === 'yaml' || lang === 'gherkin') ? '(#[^\\n]*)' : (lang === 'sql' ? '(--[^\\n]*|\\/\\*[\\s\\S]*?\\*\\/)' : '(\\/\\/[^\\n]*|\\/\\*[\\s\\S]*?\\*\\/)');
    var str = '("""[\\s\\S]*?"""|\\$@"(?:[^"]|"")*"|@\\$"(?:[^"]|"")*"|@"(?:[^"]|"")*"|\\$?"(?:[^"\\\\\\n]|\\\\.)*"|\'(?:[^\'\\\\\\n]|\\\\.)*\'|`(?:[^`\\\\]|\\\\.)*`)';
    var attrib = lang === 'csharp' ? '|(\\[[A-Z]\\w*)' : '|()';
    var flag = lang === 'bash' ? '|((?:^|\\s)--?[A-Za-z][\\w-]*)' : '|()';
    var re = new RegExp(cm + '|' + str + '|(\\b\\d+(?:\\.\\d+)?[fmdL]?\\b)' + attrib + flag + '|([A-Za-z_][\\w-]*)', 'gm');
    // groups: 1 comment, 2 string, 3 number, 4 attribute, 5 cli flag, 6 word
    var out = '', last = 0, m;
    while ((m = re.exec(code)) !== null) {
      if (m.index === re.lastIndex) { re.lastIndex++; continue; }
      out += esc(code.slice(last, m.index));
      last = re.lastIndex;
      var tok = m[0];
      if (m[1]) out += '<span class="tc">' + esc(tok) + '</span>';
      else if (m[2]) {
        var isKey = lang === 'json' && /^\s*:/.test(code.slice(last, last + 8));
        out += '<span class="' + (isKey ? 'ta' : 'ts') + '">' + esc(tok) + '</span>';
      }
      else if (m[3]) out += '<span class="tn">' + esc(tok) + '</span>';
      else if (m[4]) out += '<span class="tt">' + esc(tok) + '</span>';
      else if (m[5]) { var lead = tok.match(/^\s*/)[0]; out += esc(lead) + '<span class="ta">' + esc(tok.slice(lead.length)) + '</span>'; }
      else if (m[6]) {
        var w = tok, nx = code.charAt(last), set = KW[lang] || {};
        if (lang === 'bash') out += BASH_CMD.indexOf(w) >= 0 ? '<span class="tf">' + esc(w) + '</span>' : esc(w);
        else if (lang === 'http') out += /^(GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD|HTTP)$/.test(w) ? '<span class="tk">' + esc(w) + '</span>' : (nx === ':' ? '<span class="ta">' + esc(w) + '</span>' : esc(w));
        else if (set[lang === 'sql' ? w.toLowerCase() : w]) out += '<span class="tk">' + esc(w) + '</span>';
        else if (lang === 'json' || lang === 'yaml') out += esc(w);
        else if (nx === '(') out += '<span class="tf">' + esc(w) + '</span>';
        else if (/^[A-Z]/.test(w) && (lang === 'csharp' || lang === 'ts')) out += '<span class="tt">' + esc(w) + '</span>';
        else out += esc(w);
      } else out += esc(tok);
    }
    return out + esc(code.slice(last));
  }

  var LANG_LABEL = { csharp: 'C#', json: 'JSON', bash: 'Terminal', ts: 'TypeScript', js: 'JavaScript', html: 'HTML', http: 'HTTP', xml: 'XML', sql: 'SQL', yaml: 'YAML', plain: 'Text', jsx: 'JSX', tsx: 'TSX', gherkin: 'Gherkin', jql: 'JQL' };
  function setupCode() {
    $$('pre').forEach(function (pre) {
      if (pre.closest('.codewrap') || pre.closest('.swg') || pre.closest('.out') || pre.hasAttribute('data-nohl')) return;
      var codeEl = pre.querySelector('code');
      if (!codeEl) { codeEl = document.createElement('code'); codeEl.textContent = pre.textContent; pre.textContent = ''; pre.appendChild(codeEl); }
      var raw = codeEl.textContent.replace(/^\n/, '').replace(/\s+$/, '');
      var lang = pre.getAttribute('data-lang') || 'plain';
      codeEl.innerHTML = highlight(raw, lang);
      var wrap = document.createElement('div'); wrap.className = 'codewrap';
      var cap = document.createElement('div'); cap.className = 'cap';
      cap.innerHTML = '<span>' + esc(pre.getAttribute('data-file') || '') + '</span><span style="margin-right:62px">' + (LANG_LABEL[lang] || lang) + '</span>';
      var btn = document.createElement('button'); btn.className = 'copy'; btn.textContent = 'Copy'; btn.type = 'button';
      btn.addEventListener('click', function () {
        var done = function () { btn.textContent = 'Copied!'; setTimeout(function () { btn.textContent = 'Copy'; }, 1400); };
        var fallback = function () { var t = document.createElement('textarea'); t.value = raw; document.body.appendChild(t); t.select(); try { document.execCommand('copy'); } catch (e) {} document.body.removeChild(t); done(); };
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(raw).then(done, fallback); else fallback();
      });
      pre.parentNode.insertBefore(wrap, pre);
      wrap.appendChild(cap); wrap.appendChild(pre); wrap.appendChild(btn);
    });
  }
  window.GuideHighlight = highlight;
  window.GuideSetupCode = setupCode;
  window.GuideEsc = esc;

  /* ---------------- Tabs ---------------- */
  function setupTabs() {
    $$('.tabs').forEach(function (tabs) {
      var panes = Array.prototype.filter.call(tabs.children, function (c) { return c.classList.contains('tabpane'); });
      var bar = document.createElement('div'); bar.className = 'tabbar';
      panes.forEach(function (p, i) {
        var b = document.createElement('button'); b.type = 'button'; b.textContent = p.getAttribute('data-title') || ('Tab ' + (i + 1));
        b.addEventListener('click', function () { show(i); });
        bar.appendChild(b);
      });
      tabs.insertBefore(bar, tabs.firstChild);
      function show(i) { panes.forEach(function (p, j) { p.classList.toggle('on', i === j); bar.children[j].classList.toggle('on', i === j); }); }
      show(0);
    });
  }

  /* ---------------- Sequence diagrams (tiny DSL -> SVG) ---------------- */
  function renderSeq(host) {
    var srcEl = host.querySelector('script[type="text/seq"]');
    if (!srcEl) return;
    var lines = srcEl.textContent.split('\n').map(function (l) { return l.trim(); }).filter(Boolean);
    var parts = [], steps = [];
    lines.forEach(function (l) {
      var m;
      if ((m = l.match(/^participants:\s*(.+)$/i))) { parts = m[1].split('|').map(function (s) { return s.trim(); }); return; }
      if ((m = l.match(/^note\s+(.+?)\s*:\s*(.+)$/i))) { steps.push({ t: 'note', who: m[1], text: m[2] }); return; }
      if ((m = l.match(/^(.+?)\s*(-->|->)\s*(.+?)\s*:\s*(.*)$/))) { steps.push({ t: 'msg', from: m[1], to: m[3], ret: m[2] === '-->', text: m[4] }); }
    });
    var n = parts.length, colW = Math.max(170, Math.min(230, Math.floor(980 / n))), W = n * colW, top = 14, boxH = 34, y0 = top + boxH + 24, stepH = 40;
    var H = y0 + steps.length * stepH + boxH + 24;
    var cx = function (name) { return parts.indexOf(name) * colW + colW / 2; };
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg" role="img"><defs><marker id="ah" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto"><path d="M0,0 L9,4.5 L0,9 z" fill="#888"/></marker></defs>';
    parts.forEach(function (p) {
      var x = cx(p), bw = Math.min(colW - 20, Math.max(80, p.length * 7.6 + 20));
      s += '<line class="life" x1="' + x + '" y1="' + (top + boxH) + '" x2="' + x + '" y2="' + (H - boxH - 8) + '"/>';
      s += '<rect class="actor" rx="6" x="' + (x - bw / 2) + '" y="' + top + '" width="' + bw + '" height="' + boxH + '"/><text x="' + x + '" y="' + (top + 21) + '" text-anchor="middle" font-weight="700">' + esc(p) + '</text>';
      s += '<rect class="actor" rx="6" x="' + (x - bw / 2) + '" y="' + (H - boxH - 8) + '" width="' + bw + '" height="' + boxH + '"/><text x="' + x + '" y="' + (H - boxH + 13) + '" text-anchor="middle" font-weight="700">' + esc(p) + '</text>';
    });
    var k = 0;
    steps.forEach(function (st, i) {
      var y = y0 + i * stepH + 14;
      if (st.t === 'note') {
        var x = cx(st.who), w = Math.min(W - 10, st.text.length * 6.3 + 24), nx = Math.max(5, Math.min(W - w - 5, x - w / 2));
        s += '<rect class="note-b" rx="4" x="' + nx + '" y="' + (y - 14) + '" width="' + w + '" height="26"/><text x="' + (nx + w / 2) + '" y="' + (y + 3) + '" text-anchor="middle" style="fill:#5b4a00">' + esc(st.text) + '</text>';
        return;
      }
      k++;
      var x1 = cx(st.from), x2 = cx(st.to), cls = st.ret ? 'ret' : 'msg';
      if (x1 === x2) {
        s += '<path class="' + cls + '" d="M' + x1 + ',' + (y - 8) + ' h34 v18 h-32" marker-end="url(#ah)"/><text x="' + (x1 + 42) + '" y="' + (y + 4) + '"><tspan class="num">' + k + '. </tspan>' + esc(st.text) + '</text>';
      } else {
        var dir = x2 > x1 ? 1 : -1;
        s += '<line class="' + cls + '" x1="' + x1 + '" y1="' + y + '" x2="' + (x2 - dir * 2) + '" y2="' + y + '" marker-end="url(#ah)"/>';
        s += '<text x="' + ((x1 + x2) / 2) + '" y="' + (y - 6) + '" text-anchor="middle"><tspan class="num">' + k + '. </tspan>' + esc(st.text) + '</text>';
      }
    });
    s += '</svg>';
    host.classList.add('diagram');
    var t = host.getAttribute('data-title');
    host.innerHTML = (t ? '<div class="dtitle">' + esc(t) + '</div>' : '') + s;
  }

  /* ---------------- Navigation, scrollspy, progress ---------------- */
  function buildNav() {
    var nav = $('#nav'), last = null;
    $$('section.topic[data-nav]').forEach(function (sec) {
      var g = sec.getAttribute('data-group');
      if (g && g !== last) { var d = document.createElement('div'); d.className = 'grp'; d.textContent = g; nav.appendChild(d); last = g; }
      var a = document.createElement('a'); a.href = '#' + sec.id;
      var lv = sec.getAttribute('data-level');
      a.innerHTML = '<span>' + esc(sec.getAttribute('data-nav')) + '</span>' + (lv ? '<span class="lvl ' + lv + '">' + ({ b: 'BASIC', i: 'MID', a: 'ADV' }[lv]) + '</span>' : '');
      a.addEventListener('click', function () { $('#sidebar').classList.remove('open'); });
      nav.appendChild(a);
    });
  }
  function scrollSpy() {
    var links = $$('#nav a'), secs = $$('section.topic[data-nav]');
    function onScroll() {
      var y = window.scrollY + 120, cur = 0;
      secs.forEach(function (s, i) { if (s.offsetTop <= y) cur = i; });
      links.forEach(function (l, i) { l.classList.toggle('active', i === cur); });
      var h = document.documentElement.scrollHeight - window.innerHeight;
      $('#progress').style.width = (h > 0 ? Math.min(100, window.scrollY / h * 100) : 0) + '%';
    }
    window.addEventListener('scroll', onScroll, { passive: true }); onScroll();
  }

  /* ---------------- Search ---------------- */
  var index = [];
  function buildIndex() {
    var uid = 0;
    $$('section.topic').forEach(function (sec) {
      var secTitle = sec.getAttribute('data-nav') || '';
      $$('h2,h3,h4,summary', sec).forEach(function (h) {
        if (h.closest('.swg') || h.closest('.lab')) return;
        if (!h.id) h.id = 'h-' + (++uid);
        var level = h.tagName === 'SUMMARY' ? 5 : +h.tagName.charAt(1), body = '';
        if (h.tagName === 'SUMMARY') body = h.parentNode.textContent;
        else {
          var n = h.nextElementSibling;
          while (n && !(/^H[2-4]$/.test(n.tagName) && +n.tagName.charAt(1) <= level)) { body += ' ' + n.textContent; n = n.nextElementSibling; if (body.length > 6000) break; }
        }
        body = body.replace(/\s+/g, ' ');
        index.push({ id: h.id, el: h, title: h.textContent.trim(), sec: secTitle, body: body.toLowerCase(), raw: body });
      });
    });
  }
  function doSearch(q) {
    var box = $('#search-results'); box.innerHTML = '';
    q = q.trim().toLowerCase(); if (q.length < 2) return;
    var words = q.split(/\s+/), res = [];
    index.forEach(function (e) {
      var score = 0, t = e.title.toLowerCase(), ok = true;
      words.forEach(function (w) {
        var inT = t.indexOf(w) >= 0, c = e.body.split(w).length - 1;
        if (!inT && !c) ok = false;
        score += (inT ? 12 : 0) + Math.min(c, 5);
      });
      if (ok) res.push({ e: e, score: score });
    });
    res.sort(function (a, b) { return b.score - a.score; });
    if (!res.length) { box.innerHTML = '<div style="padding:6px 8px;color:#7f88a3">No matches</div>'; return; }
    res.slice(0, 14).forEach(function (r) {
      var e = r.e, a = document.createElement('a'); a.href = '#' + e.id;
      var pos = e.body.indexOf(words[0]), snip = pos >= 0 ? e.raw.substr(Math.max(0, pos - 25), 70) : '';
      a.innerHTML = '<b>' + esc(e.title.slice(0, 70)) + '</b><span>' + esc(e.sec) + (snip ? ' - ...' + esc(snip) + '...' : '') + '</span>';
      a.addEventListener('click', function (ev) {
        ev.preventDefault();
        var d = e.el.closest('details'); while (d) { d.open = true; d = d.parentElement ? d.parentElement.closest('details') : null; }
        e.el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        e.el.style.transition = 'background .3s'; e.el.style.background = '#ffe58a88'; setTimeout(function () { e.el.style.background = ''; }, 1800);
        $('#sidebar').classList.remove('open');
      });
      box.appendChild(a);
    });
  }

  /* ---------------- Misc UI ---------------- */
  function setupUI() {
    $('#theme-btn').addEventListener('click', function () { document.body.classList.toggle('dark'); try { localStorage.setItem('aspguide-theme', document.body.classList.contains('dark') ? 'd' : 'l'); } catch (e) {} });
    try { if (localStorage.getItem('aspguide-theme') === 'd') document.body.classList.add('dark'); } catch (e) {}
    $('#menu-btn').addEventListener('click', function () { $('#sidebar').classList.toggle('open'); });
    $('#expand-all').addEventListener('click', function () { $$('#content details').forEach(function (d) { if (!d.closest('.swg')) d.open = true; }); });
    $('#collapse-all').addEventListener('click', function () { $$('#content details').forEach(function (d) { if (!d.closest('.swg')) d.open = false; }); });
    var inp = $('#search'); inp.addEventListener('input', function () { doSearch(inp.value); });
    document.addEventListener('keydown', function (e) {
      var tag = document.activeElement.tagName;
      if (e.key === '/' && tag !== 'INPUT' && tag !== 'TEXTAREA') { e.preventDefault(); $('#sidebar').classList.add('open'); inp.focus(); }
    });
    $$('.qfilter button').forEach(function (b) {
      b.addEventListener('click', function () {
        var f = b.getAttribute('data-f');
        $$('.qfilter button').forEach(function (x) { x.classList.toggle('primary', x === b); });
        $$('.qa').forEach(function (q) { q.style.display = (f === 'all' || q.getAttribute('data-tag') === f) ? '' : 'none'; });
      });
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    $$('.seq').forEach(renderSeq);
    setupCode(); setupTabs(); buildNav(); buildIndex(); setupUI(); scrollSpy();
  });
})();
