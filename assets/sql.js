/* Labs for the SQL Server & Database Design guide:
   - join visualiser (INNER / LEFT / RIGHT / FULL / CROSS / anti-join)
   - isolation level explorer
   - index seek vs scan cost estimator
   Pure logic is exported for Node testing. */
(function (root) {
  'use strict';
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); };
  var num = function (v) { var n = parseFloat(v); return isNaN(n) ? 0 : n; };

  /* ============================ Joins ============================ */
  var CUSTOMERS = [{ Id: 1, Name: 'Asha' }, { Id: 2, Name: 'Ben' }, { Id: 3, Name: 'Chen' }, { Id: 4, Name: 'Dara' }];
  var ORDERS = [{ Id: 101, CustomerId: 1, Total: 120 }, { Id: 102, CustomerId: 1, Total: 80 }, { Id: 103, CustomerId: 2, Total: 45 }, { Id: 104, CustomerId: null, Total: 60 }, { Id: 105, CustomerId: 9, Total: 15 }];
  function join(type, cust, ord) {
    var rows = [], usedO = {}, c, o, matched;
    if (type === 'CROSS') { cust.forEach(function (c1) { ord.forEach(function (o1) { rows.push({ c: c1, o: o1 }); }); }); return rows; }
    cust.forEach(function (c1) {
      matched = false;
      ord.forEach(function (o1) { if (o1.CustomerId === c1.Id) { rows.push({ c: c1, o: o1 }); usedO[o1.Id] = 1; matched = true; } });
      if (!matched && (type === 'LEFT' || type === 'FULL' || type === 'ANTI')) rows.push({ c: c1, o: null });
    });
    if (type === 'RIGHT' || type === 'FULL') ord.forEach(function (o1) { if (!usedO[o1.Id]) rows.push({ c: null, o: o1 }); });
    if (type === 'ANTI') rows = rows.filter(function (r) { return r.o === null; });
    return rows;
  }
  var JOIN_SQL = {
    INNER: 'SELECT c.Name, o.Id, o.Total\nFROM Customers c\nINNER JOIN Orders o ON o.CustomerId = c.Id;',
    LEFT: 'SELECT c.Name, o.Id, o.Total\nFROM Customers c\nLEFT JOIN Orders o ON o.CustomerId = c.Id;',
    RIGHT: 'SELECT c.Name, o.Id, o.Total\nFROM Customers c\nRIGHT JOIN Orders o ON o.CustomerId = c.Id;',
    FULL: 'SELECT c.Name, o.Id, o.Total\nFROM Customers c\nFULL OUTER JOIN Orders o ON o.CustomerId = c.Id;',
    CROSS: 'SELECT c.Name, o.Id, o.Total\nFROM Customers c\nCROSS JOIN Orders o;',
    ANTI: 'SELECT c.Name  -- customers with NO orders\nFROM Customers c\nLEFT JOIN Orders o ON o.CustomerId = c.Id\nWHERE o.Id IS NULL;'
  };
  var JOIN_NOTE = {
    INNER: 'Only rows that match on both sides. Customers without orders and orders without a customer disappear.',
    LEFT: 'Every customer; order columns are NULL when there is no match. Use it to keep "all of A, plus B if present".',
    RIGHT: 'Every order; customer columns are NULL when there is no match. Most people just swap the tables and use LEFT JOIN.',
    FULL: 'Everything from both sides, matched where possible. Handy for reconciliation and finding gaps in either table.',
    CROSS: 'Cartesian product: every customer with every order (4 x 5 = 20 rows). Rarely wanted; a missing ON clause creates one by accident.',
    ANTI: 'Left join + WHERE right.key IS NULL finds rows with no match. NOT EXISTS is usually the clearer, equally fast form.'
  };
  function renderJoin(host) {
    var t = function (arr, cols) { return '<table><tr>' + cols.map(function (c) { return '<th>' + c + '</th>'; }).join('') + '</tr>' + arr.map(function (r) { return '<tr>' + cols.map(function (c) { return '<td>' + (r[c] === null ? '<i>NULL</i>' : esc(r[c])) + '</td>'; }).join('') + '</tr>'; }).join('') + '</table>'; };
    host.innerHTML = '<h4>Lab: join visualiser</h4><p>Pick a join and see exactly which rows survive. Note Orders 104 (NULL customer) and 105 (customer 9 does not exist) never match; Dara has no orders.</p>' +
      '<div class="grid2"><div><b>Customers</b><div class="tblwrap">' + t(CUSTOMERS, ['Id', 'Name']) + '</div></div><div><b>Orders</b><div class="tblwrap">' + t(ORDERS, ['Id', 'CustomerId', 'Total']) + '</div></div></div>' +
      '<div class="row"><label>Join type <select id="jn-t"><option value="INNER">INNER JOIN</option><option value="LEFT">LEFT JOIN</option><option value="RIGHT">RIGHT JOIN</option><option value="FULL">FULL OUTER JOIN</option><option value="CROSS">CROSS JOIN</option><option value="ANTI">Anti-join (no match)</option></select></label></div>' +
      '<div class="out" id="jn-sql"></div><div id="jn-res"></div><p id="jn-note"></p>';
    function run() {
      var ty = $('#jn-t', host).value, rows = join(ty, CUSTOMERS, ORDERS);
      $('#jn-sql', host).textContent = JOIN_SQL[ty];
      $('#jn-res', host).innerHTML = '<div class="tblwrap"><table><tr><th>Customer</th><th>Order Id</th><th>Total</th></tr>' + rows.map(function (r) { return '<tr><td>' + (r.c ? esc(r.c.Name) : '<i>NULL</i>') + '</td><td>' + (r.o ? r.o.Id : '<i>NULL</i>') + '</td><td>' + (r.o ? r.o.Total : '<i>NULL</i>') + '</td></tr>'; }).join('') + '</table></div><b>' + rows.length + ' rows</b>';
      $('#jn-note', host).textContent = JOIN_NOTE[ty];
    }
    $('#jn-t', host).onchange = run; run();
  }

  /* ============================ Isolation levels ============================ */
  var ANOMALIES = ['Dirty read', 'Non-repeatable read', 'Phantom read', 'Lost update', 'Write skew'];
  var LEVELS = {
    'READ UNCOMMITTED': { a: [1, 1, 1, 1, 1], how: 'Readers take no shared locks and ignore exclusive locks (same as NOLOCK). You can read data that is later rolled back, or read a row twice or not at all during page splits.', use: 'Rough monitoring queries only. Not for money or business logic.' },
    'READ COMMITTED': { a: [0, 1, 1, 1, 1], how: 'SQL Server default (locking). Shared locks are released as soon as the row is read, so readers block on writers and writers block on readers.', use: 'General OLTP default; accept that two reads in one transaction can differ.' },
    'READ COMMITTED SNAPSHOT (RCSI)': { a: [0, 1, 1, 1, 1], how: 'Same level, but readers see the last committed version from the version store (tempdb or PVR), so they do not block and are not blocked. Default in Azure SQL Database.', use: 'Busy web apps with read/write contention. Costs version-store space.' },
    'REPEATABLE READ': { a: [0, 0, 1, 0, 0], how: 'Shared locks on rows read are held until commit, so a row cannot change under you. New rows matching your range can still appear (phantoms). Increases blocking and deadlocks.', use: 'When you re-read the same rows and need them stable.' },
    'SNAPSHOT': { a: [0, 0, 0, 0, 1], how: 'Whole transaction reads one consistent point-in-time version. Concurrent writers to the same row raise update conflict error 3960. Needs ALLOW_SNAPSHOT_ISOLATION ON.', use: 'Consistent reports and long reads without blocking writers. Write skew is still possible.' },
    'SERIALIZABLE': { a: [0, 0, 0, 0, 0], how: 'Range locks make the result equal to running transactions one after another. Strongest and the most blocking.', use: 'Rare, short, critical invariants (e.g. uniqueness checks without a constraint).' }
  };
  function possible(level, anomaly) { var i = ANOMALIES.indexOf(anomaly); return !!(LEVELS[level] && i >= 0 && LEVELS[level].a[i]); }
  function renderIso(host) {
    var names = Object.keys(LEVELS);
    host.innerHTML = '<h4>Lab: isolation level explorer</h4><p>Choose a level; the matrix highlights what it still allows. Stronger isolation means fewer anomalies and more blocking (or version storage).</p>' +
      '<div class="row"><label>Isolation level <select id="is-l">' + names.map(function (n) { return '<option>' + n + '</option>'; }).join('') + '</select></label></div><div id="is-m"></div><div class="out" id="is-out"></div>';
    function run() {
      var l = $('#is-l', host).value, d = LEVELS[l];
      $('#is-m', host).innerHTML = '<div class="tblwrap"><table><tr><th>Anomaly</th><th>Possible at ' + esc(l) + '?</th></tr>' + ANOMALIES.map(function (a, i) { return '<tr><td>' + a + '</td><td style="font-weight:700;color:' + (d.a[i] ? '#c0392b' : '#1e8449') + '">' + (d.a[i] ? 'Yes' : 'No') + '</td></tr>'; }).join('') + '</table></div>';
      $('#is-out', host).textContent = 'How it works: ' + d.how + '\n\nTypical use: ' + d.use + '\n\nSET TRANSACTION ISOLATION LEVEL ' + (l.indexOf('RCSI') > 0 ? 'READ COMMITTED;  -- after ALTER DATABASE ... SET READ_COMMITTED_SNAPSHOT ON' : l) + ';';
    }
    $('#is-l', host).onchange = run; run();
  }

  /* ============================ Index cost ============================ */
  function indexCost(o) {
    var usable = 8060, rowsPerPage = Math.max(1, Math.floor(usable / Math.max(1, o.rowBytes)));
    var tablePages = Math.ceil(o.rows / rowsPerPage);
    var fan = Math.max(2, Math.floor(usable / (o.keyBytes + 6)));
    var height = Math.max(1, Math.ceil(Math.log(Math.max(2, o.rows)) / Math.log(fan)));
    var leafPerPage = Math.max(1, Math.floor(usable / (o.keyBytes + 8)));
    var m = Math.min(o.matches, o.rows);
    var seekOnly = height + Math.ceil(m / leafPerPage);                // covering index
    var seekLookup = seekOnly + m * height;                             // key lookups into clustered index
    var best = Math.min(tablePages, seekLookup);
    return { tablePages: tablePages, rowsPerPage: rowsPerPage, fanout: fan, height: height, scan: tablePages, covering: seekOnly, seekLookup: seekLookup, winner: seekLookup < tablePages ? 'Index seek + key lookup' : 'Clustered index scan', best: best, pctRows: o.rows ? m / o.rows * 100 : 0 };
  }
  function renderIdx(host) {
    host.innerHTML = '<h4>Lab: index seek vs scan (page-read estimate)</h4><p>Reads are counted in 8 KB pages. A nonclustered index that does not cover the query needs a <b>key lookup per matching row</b>, so at some selectivity the scan wins. Change the numbers to find the tipping point.</p>' +
      '<div class="row"><label>Rows in table <input id="ix-r" type="number" value="1000000" style="width:110px"></label><label>Row size (bytes) <input id="ix-b" type="number" value="200" style="width:70px"></label><label>Index key size (bytes) <input id="ix-k" type="number" value="8" style="width:60px"></label><label>Matching rows <input id="ix-m" type="number" value="500" style="width:90px"></label></div><div class="out" id="ix-out"></div>';
    function run() {
      var r = indexCost({ rows: Math.max(1, num($('#ix-r', host).value)), rowBytes: Math.max(1, num($('#ix-b', host).value)), keyBytes: Math.max(1, num($('#ix-k', host).value)), matches: Math.max(0, num($('#ix-m', host).value)) });
      $('#ix-out', host).textContent = 'Table: ' + r.rowsPerPage + ' rows/page -> ' + r.tablePages.toLocaleString() + ' pages\nIndex: fan-out ' + r.fanout + ' -> B-tree height ' + r.height + ' levels\nMatching rows: ' + r.pctRows.toFixed(2) + '% of the table\n\nFull scan                        : ' + r.scan.toLocaleString() + ' page reads\nSeek on a COVERING index         : ' + r.covering.toLocaleString() + ' page reads\nSeek + key lookups (not covering): ' + r.seekLookup.toLocaleString() + ' page reads\n\nOptimizer would pick: ' + r.winner + '\nTip: INCLUDE the selected columns to make the index covering and avoid the lookups; high-selectivity predicates (few rows) are what indexes are for.';
    }
    $$('input', host).forEach(function (el) { el.addEventListener('input', run); }); run();
  }

  var LABS = { 'join-lab': renderJoin, 'iso-lab': renderIso, 'index-lab': renderIdx };
  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', function () {
      Object.keys(LABS).forEach(function (id) { var el = document.getElementById(id); if (el) LABS[id](el); });
    });
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = { join: join, CUSTOMERS: CUSTOMERS, ORDERS: ORDERS, possible: possible, indexCost: indexCost, LEVELS: LEVELS };
})(typeof window !== 'undefined' ? window : globalThis);
