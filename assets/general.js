/* Interactive labs for the "Delivery & Engineering Fundamentals" guide:
   - three-point (PERT) estimator
   - velocity forecast
   - RICE / WSJF prioritiser
   - JQL playground
   Pure logic is exported for Node testing. */
(function (root) {
  'use strict';
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); };
  var num = function (v) { var n = parseFloat(v); return isNaN(n) ? 0 : n; };
  var r1 = function (n) { return Math.round(n * 10) / 10; };

  /* ============================ PERT ============================ */
  function pert(tasks) {
    var rows = tasks.map(function (t) {
      var e = (t.o + 4 * t.m + t.p) / 6, sd = (t.p - t.o) / 6;
      return { name: t.name, o: t.o, m: t.m, p: t.p, e: e, sd: sd };
    });
    var total = rows.reduce(function (s, r) { return s + r.e; }, 0);
    var variance = rows.reduce(function (s, r) { return s + r.sd * r.sd; }, 0), sd = Math.sqrt(variance);
    var naive = rows.reduce(function (s, r) { return s + r.p; }, 0);
    return { rows: rows, total: total, sd: sd, low68: total - sd, high68: total + sd, low95: total - 1.96 * sd, high95: total + 1.96 * sd, worstCaseSum: naive };
  }
  function renderPert(host) {
    var init = [['Design API contract', 2, 3, 6], ['Implement endpoints', 4, 8, 16], ['Angular screens', 5, 8, 20], ['Integration + bug fixing', 2, 5, 15], ['Deployment pipeline', 1, 2, 5]];
    host.innerHTML = '<h4>Lab: three-point (PERT) estimate</h4><p>For each task give an <b>Optimistic</b>, <b>Most likely</b> and <b>Pessimistic</b> number of days. Expected = (O + 4M + P) / 6, standard deviation = (P - O) / 6. Totals add expected values and <b>variances</b> (not worst cases), so the range is far tighter than adding all pessimistic numbers.</p>' +
      '<div class="tblwrap"><table><tr><th>Task</th><th>O</th><th>M</th><th>P</th><th>Expected</th><th>&plusmn; SD</th></tr>' +
      init.map(function (r, i) { return '<tr><td><input data-i="' + i + '" data-f="name" value="' + esc(r[0]) + '" style="width:210px"></td>' + ['o', 'm', 'p'].map(function (f, k) { return '<td><input data-i="' + i + '" data-f="' + f + '" type="number" min="0" step="0.5" value="' + r[k + 1] + '" style="width:64px"></td>'; }).join('') + '<td id="pe' + i + '"></td><td id="ps' + i + '"></td></tr>'; }).join('') + '</table></div>' +
      '<div class="out" id="pert-out"></div>';
    function read() { var t = init.map(function () { return {}; }); $$('input', host).forEach(function (el) { var i = +el.getAttribute('data-i'), f = el.getAttribute('data-f'); t[i][f] = f === 'name' ? el.value : num(el.value); }); return t; }
    function run() {
      var tasks = read(), r = pert(tasks);
      r.rows.forEach(function (x, i) { $('#pe' + i, host).textContent = r1(x.e) + ' d'; $('#ps' + i, host).textContent = r1(x.sd); });
      $('#pert-out', host).textContent = 'Expected total       = ' + r1(r.total) + ' days\nStandard deviation   = ' + r1(r.sd) + ' days\n~68% confidence      = ' + r1(r.low68) + ' to ' + r1(r.high68) + ' days\n~95% confidence      = ' + r1(r.low95) + ' to ' + r1(r.high95) + ' days\n\nSum of all pessimistic values would be ' + r1(r.worstCaseSum) + ' days: unlikely, because not every task goes wrong at once.\nCommit to the ~95% upper bound (' + r1(r.high95) + ' days), plan with the expected value (' + r1(r.total) + ' days), and say the range out loud.';
    }
    $$('input', host).forEach(function (el) { el.addEventListener('input', run); }); run();
  }

  /* ============================ Velocity forecast ============================ */
  function forecast(velocities, backlog, sprintDays, startISO) {
    var v = velocities.filter(function (x) { return x > 0; });
    if (!v.length || backlog <= 0) return null;
    var avg = v.reduce(function (a, b) { return a + b; }, 0) / v.length, mn = Math.min.apply(null, v), mx = Math.max.apply(null, v);
    function scen(name, vel) { var sprints = Math.ceil(backlog / vel), d = new Date(startISO + 'T00:00:00'); d.setDate(d.getDate() + sprints * sprintDays); return { name: name, velocity: vel, sprints: sprints, date: d.toISOString().slice(0, 10) }; }
    var sd = Math.sqrt(v.reduce(function (s, x) { return s + (x - avg) * (x - avg); }, 0) / v.length);
    return { avg: avg, min: mn, max: mx, sd: sd, scenarios: [scen('Optimistic (best sprint)', mx), scen('Likely (average)', avg), scen('Pessimistic (worst sprint)', mn)] };
  }
  function renderForecast(host) {
    var today = new Date().toISOString().slice(0, 10);
    host.innerHTML = '<h4>Lab: velocity-based release forecast</h4><p>Velocity = story points <i>finished</i> per sprint. Forecast the remaining backlog from your real history instead of guessing.</p>' +
      '<div class="row"><label>Last sprints\' velocity (comma separated) <input id="vf-v" value="21, 18, 24, 19, 22, 17" style="width:230px"></label><label>Backlog points left <input id="vf-b" type="number" value="160" style="width:80px"></label><label>Sprint length (days) <input id="vf-d" type="number" value="14" style="width:60px"></label><label>Start <input id="vf-s" type="date" value="' + today + '"></label></div><div class="out" id="vf-out"></div>';
    function run() {
      var v = $('#vf-v', host).value.split(/[,\s]+/).map(num).filter(function (x) { return x > 0; }), f = forecast(v, num($('#vf-b', host).value), num($('#vf-d', host).value) || 14, $('#vf-s', host).value || today);
      if (!f) { $('#vf-out', host).textContent = 'Enter at least one velocity and a positive backlog.'; return; }
      var o = 'History: avg ' + r1(f.avg) + ', min ' + f.min + ', max ' + f.max + ', spread (SD) ' + r1(f.sd) + '\n\n' + 'Scenario'.padEnd(30) + 'Velocity'.padEnd(10) + 'Sprints'.padEnd(9) + 'Done by\n' + '-'.repeat(62) + '\n';
      f.scenarios.forEach(function (s) { o += s.name.padEnd(30) + String(r1(s.velocity)).padEnd(10) + String(s.sprints).padEnd(9) + s.date + '\n'; });
      $('#vf-out', host).textContent = o + '\nCommunicate the range "between ' + f.scenarios[0].date + ' and ' + f.scenarios[2].date + ', most likely ' + f.scenarios[1].date + '", not one date.\nA high spread means the team is unstable or the stories are inconsistently sized: fix that before trusting the forecast.\nScope change moves the date: try adding 40 points to the backlog.';
    }
    $$('input', host).forEach(function (el) { el.addEventListener('input', run); }); run();
  }

  /* ============================ RICE / WSJF ============================ */
  var MODES = {
    rice: { title: 'RICE = Reach x Impact x Confidence / Effort', cols: [['Reach', 'users/quarter'], ['Impact', '0.25-3'], ['Confidence', '0-1'], ['Effort', 'person-months']], score: function (a) { return a[3] > 0 ? a[0] * a[1] * a[2] / a[3] : 0; },
      rows: [['Single sign-on', 4000, 2, 0.8, 4], ['Dark mode', 6000, 0.5, 1, 1], ['Bulk CSV import', 900, 2, 0.8, 2], ['Mobile app', 8000, 3, 0.5, 12]] },
    wsjf: { title: 'WSJF = (Business value + Time criticality + Risk reduction) / Job size', cols: [['Business value', '1-20'], ['Time criticality', '1-20'], ['Risk reduction', '1-20'], ['Job size', '1-20']], score: function (a) { return a[3] > 0 ? (a[0] + a[1] + a[2]) / a[3] : 0; },
      rows: [['Compliance report', 8, 20, 13, 5], ['New dashboard', 13, 3, 5, 8], ['Fix payment retries', 13, 8, 20, 3], ['Rewrite login page', 5, 2, 3, 13]] }
  };
  function rank(mode, items) {
    var m = MODES[mode];
    return items.map(function (it) { return { name: it.name, vals: it.vals, score: m.score(it.vals) }; }).sort(function (a, b) { return b.score - a.score; });
  }
  function renderPrio(host) {
    host.innerHTML = '<h4>Lab: prioritisation scoring (RICE / WSJF)</h4><p>Edit the numbers. The ranking updates; try changing <b>Confidence</b> or <b>Job size</b> and see which item falls. Scoring supports a conversation, it does not replace judgement.</p>' +
      '<div class="row"><label>Model <select id="pr-m"><option value="rice">RICE</option><option value="wsjf">WSJF (SAFe)</option></select></label></div><div id="pr-t"></div><div class="out" id="pr-out"></div>';
    var mode = 'rice';
    function build() {
      var m = MODES[mode];
      $('#pr-t', host).innerHTML = '<p><b>' + m.title + '</b></p><div class="tblwrap"><table><tr><th>Item</th>' + m.cols.map(function (c) { return '<th>' + c[0] + '<br><small>' + c[1] + '</small></th>'; }).join('') + '</tr>' +
        m.rows.map(function (r, i) { return '<tr><td><input data-i="' + i + '" data-f="n" value="' + esc(r[0]) + '" style="width:170px"></td>' + [0, 1, 2, 3].map(function (k) { return '<td><input data-i="' + i + '" data-f="' + k + '" type="number" step="any" min="0" value="' + r[k + 1] + '" style="width:80px"></td>'; }).join('') + '</tr>'; }).join('') + '</table></div>';
      $$('#pr-t input', host).forEach(function (el) { el.addEventListener('input', run); });
      run();
    }
    function run() {
      var items = MODES[mode].rows.map(function () { return { vals: [0, 0, 0, 0] }; });
      $$('#pr-t input', host).forEach(function (el) { var i = +el.getAttribute('data-i'), f = el.getAttribute('data-f'); if (f === 'n') items[i].name = el.value; else items[i].vals[+f] = num(el.value); });
      var ranked = rank(mode, items);
      $('#pr-out', host).textContent = 'Priority order (highest score first)\n' + ranked.map(function (r, i) { return (i + 1) + '. ' + r.name.padEnd(24) + r1(r.score * 100) / 100; }).join('\n') + '\n\nSanity check the top item with stakeholders, then slice it into small deliverable stories.';
    }
    $('#pr-m', host).onchange = function () { mode = this.value; build(); };
    build();
  }

  /* ============================ JQL playground ============================ */
  var ISSUES = [
    ['SHOP-101', 'Story', 'In Progress', 'High', 'asha', 'Sprint 14', 'api', 5], ['SHOP-102', 'Bug', 'Open', 'Highest', 'ben', 'Sprint 14', 'payments', 3],
    ['SHOP-103', 'Story', 'Done', 'Medium', 'asha', 'Sprint 13', 'ui', 8], ['SHOP-104', 'Task', 'To Do', 'Low', '', 'Backlog', 'devops', 2],
    ['SHOP-105', 'Bug', 'In Progress', 'High', 'chen', 'Sprint 14', 'ui', 2], ['SHOP-106', 'Epic', 'In Progress', 'Medium', 'dara', '', 'checkout', 0],
    ['SHOP-107', 'Story', 'To Do', 'High', 'ben', 'Sprint 15', 'api', 13], ['SHOP-108', 'Bug', 'Done', 'Low', 'chen', 'Sprint 13', 'api', 1],
    ['SHOP-109', 'Story', 'In Review', 'Medium', 'asha', 'Sprint 14', 'ui', 5], ['SHOP-110', 'Task', 'Done', 'Medium', 'dara', 'Sprint 13', 'devops', 3],
    ['SHOP-111', 'Bug', 'Open', 'High', '', 'Backlog', 'payments', 5], ['SHOP-112', 'Story', 'To Do', 'Low', 'chen', 'Backlog', 'ui', 3]
  ].map(function (r) { return { key: r[0], issuetype: r[1], status: r[2], priority: r[3], assignee: r[4], sprint: r[5], labels: r[6], storypoints: r[7], project: 'SHOP' }; });
  var PRI = { Highest: 5, High: 4, Medium: 3, Low: 2, Lowest: 1 };
  function splitTop(s, word) { return s.split(new RegExp('\\s+' + word + '\\s+', 'i')); }
  function unq(v) { v = v.trim(); return (/^".*"$|^'.*'$/.test(v)) ? v.slice(1, -1) : v; }
  function clause(c, issue) {
    var m = c.trim().match(/^(\w+)\s+(is\s+not\s+empty|is\s+empty|not\s+in|in|!=|>=|<=|=|~|>|<)\s*(.*)$/i);
    if (!m) throw new Error('Cannot parse: "' + c.trim() + '"');
    var field = m[1].toLowerCase(), op = m[2].toLowerCase().replace(/\s+/g, ' '), raw = m[3].trim();
    if (field === 'type') field = 'issuetype';
    if (field === 'story_points' || field === 'storypoints') field = 'storypoints';
    if (!(field in issue)) throw new Error('Unknown field "' + m[1] + '" (try project, issuetype, status, priority, assignee, sprint, labels, storyPoints)');
    var val = String(issue[field]);
    if (op === 'is empty') return val === '' ;
    if (op === 'is not empty') return val !== '';
    if (op === 'in' || op === 'not in') {
      var list = raw.replace(/^\(|\)$/g, '').split(',').map(function (x) { return unq(x).toLowerCase(); }), hit = list.indexOf(val.toLowerCase()) >= 0;
      return op === 'in' ? hit : !hit;
    }
    var v = unq(raw);
    if (v.toLowerCase() === 'currentuser()') v = 'asha';
    if (op === '=') return val.toLowerCase() === v.toLowerCase();
    if (op === '!=') return val.toLowerCase() !== v.toLowerCase();
    if (op === '~') return val.toLowerCase().indexOf(v.toLowerCase()) >= 0;
    var a = field === 'priority' ? PRI[val] : num(val), b = field === 'priority' ? PRI[v] : num(v);
    return op === '>' ? a > b : op === '<' ? a < b : op === '>=' ? a >= b : a <= b;
  }
  function runJql(q, data) {
    data = data || ISSUES;
    var parts = q.split(/\s+order\s+by\s+/i), where = parts[0].trim(), order = parts[1] ? parts[1].trim() : '';
    if (/[()]/.test(where.replace(/\bnot\s+in\s*\([^)]*\)|\bin\s*\([^)]*\)|currentUser\(\)/gi, ''))) throw new Error('This playground does not support parentheses for grouping (real JQL does).');
    var groups = where ? splitTop(where, 'OR').map(function (g) { return splitTop(g, 'AND'); }) : [[]];
    var res = data.filter(function (it) { return groups.some(function (g) { return g.every(function (c) { return !c.trim() || clause(c, it); }); }); });
    if (order) {
      var om = order.match(/^(\w+)(?:\s+(asc|desc))?$/i);
      if (!om) throw new Error('Cannot parse ORDER BY "' + order + '"');
      var f = om[1].toLowerCase() === 'type' ? 'issuetype' : om[1].toLowerCase(), dir = (om[2] || 'asc').toLowerCase() === 'desc' ? -1 : 1;
      if (!(f in data[0])) throw new Error('Unknown ORDER BY field "' + om[1] + '"');
      res = res.slice().sort(function (x, y) { var a = f === 'priority' ? PRI[x[f]] : x[f], b = f === 'priority' ? PRI[y[f]] : y[f]; return (a < b ? -1 : a > b ? 1 : 0) * dir; });
    }
    return res;
  }
  function renderJql(host) {
    var presets = ['project = SHOP AND status = "In Progress"', 'issuetype = Bug AND priority in (High, Highest) ORDER BY priority DESC', 'assignee is EMPTY AND status != Done', 'sprint = "Sprint 14" AND storyPoints >= 5', 'labels = ui OR labels = api ORDER BY storyPoints DESC', 'status not in (Done) AND assignee = currentUser()'];
    host.innerHTML = '<h4>Lab: JQL playground</h4><p>Run Jira-style queries against 12 sample issues. Supported: <code>= != ~ &gt; &lt; &gt;= &lt;= in, not in, is EMPTY, AND, OR, ORDER BY</code>. (Real JQL also has parentheses, dates, functions such as <code>openSprints()</code> and many more fields.)</p>' +
      '<div class="row"><select id="jq-pre">' + presets.map(function (p, i) { return '<option value="' + i + '">' + esc(p) + '</option>'; }).join('') + '</select></div>' +
      '<textarea id="jq-q" rows="2" style="width:100%;font-family:Consolas,monospace">' + esc(presets[0]) + '</textarea><div class="out" id="jq-out"></div>';
    function run() {
      var out = $('#jq-out', host);
      try {
        var r = runJql($('#jq-q', host).value);
        out.textContent = 'Key'.padEnd(10) + 'Type'.padEnd(7) + 'Status'.padEnd(13) + 'Priority'.padEnd(9) + 'Assignee'.padEnd(9) + 'Sprint'.padEnd(11) + 'Pts\n' + '-'.repeat(62) + '\n' +
          (r.length ? r.map(function (i) { return i.key.padEnd(10) + i.issuetype.padEnd(7) + i.status.padEnd(13) + i.priority.padEnd(9) + (i.assignee || '-').padEnd(9) + (i.sprint || '-').padEnd(11) + i.storypoints; }).join('\n') : '(no issues)') + '\n\n' + r.length + ' of ' + ISSUES.length + ' issues';
      } catch (e) { out.textContent = 'Error: ' + e.message; }
    }
    $('#jq-pre', host).onchange = function () { $('#jq-q', host).value = presets[+this.value]; run(); };
    $('#jq-q', host).oninput = run; run();
  }

  var LABS = { 'pert-lab': renderPert, 'forecast-lab': renderForecast, 'prio-lab': renderPrio, 'jql-lab': renderJql };
  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', function () {
      Object.keys(LABS).forEach(function (id) { var el = document.getElementById(id); if (el) LABS[id](el); });
    });
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = { pert: pert, forecast: forecast, rank: rank, runJql: runJql, ISSUES: ISSUES };
})(typeof window !== 'undefined' ? window : globalThis);
