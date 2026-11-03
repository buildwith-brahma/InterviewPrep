/* Labs for the Leadership & Communication guide:
   - STAR story builder with a quality checklist
   - SBI feedback composer that flags judgemental / absolute language
   - Eisenhower task triage
   Pure logic is exported for Node testing. */
(function (root) {
  'use strict';
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); };

  /* ============================ STAR ============================ */
  function words(s) { return (s.trim().match(/\S+/g) || []).length; }
  function starCheck(o) {
    var tips = [], total = words(o.s) + words(o.t) + words(o.a) + words(o.r);
    if (!words(o.s) || !words(o.t) || !words(o.a) || !words(o.r)) tips.push('Fill all four parts: Situation, Task, Action, Result.');
    if (words(o.s) + words(o.t) > words(o.a)) tips.push('Too much set-up: Situation + Task should be shorter than Action (aim for about 20% / 60% / 20%).');
    if (/\b(we|our|the team)\b/i.test(o.a) && !/\b(i)\b/i.test(o.a)) tips.push('Action uses only "we": say what YOU personally did.');
    if (words(o.a) && !/\b(i)\b/i.test(o.a) && !/\b(we|our|the team)\b/i.test(o.a)) tips.push('Use "I" statements in the Action.');
    if (words(o.r) && !/\d/.test(o.r)) tips.push('Result has no number: add a metric (time saved, % fewer bugs, revenue, users, NPS).');
    if (words(o.r) && !/(learn|learnt|learned|next time|since then|now )/i.test(o.r)) tips.push('Close with what you learned or what changed afterwards.');
    if (total > 330) tips.push('Long: ' + total + ' words. Spoken answers should take 1.5-2 minutes (about 200-300 words).');
    if (total && total < 80) tips.push('Very short: ' + total + ' words. Add concrete detail (what, how, why you chose that approach).');
    return { words: total, tips: tips, minutes: Math.round(total / 130 * 10) / 10 };
  }
  function renderStar(host) {
    host.innerHTML = '<h4>Lab: STAR story builder</h4><p>Write one real story. The checker looks for the usual weaknesses: too much context, "we" instead of "I", no measurable result, no lesson.</p>' +
      '<div class="row"><label>Situation<br><textarea id="st-s" rows="3" style="width:280px">Our checkout API timed out during a sale and orders were failing.</textarea></label><label>Task<br><textarea id="st-t" rows="3" style="width:280px">As the on-call developer I had to restore it and stop it happening again.</textarea></label></div>' +
      '<div class="row"><label>Action<br><textarea id="st-a" rows="4" style="width:280px">We looked at the logs. I traced the slow query, added a covering index and a 2 second timeout with retry, and wrote a runbook.</textarea></label><label>Result<br><textarea id="st-r" rows="4" style="width:280px">p95 latency dropped from 4.2 s to 300 ms and there were no failures in the next sale.</textarea></label></div><div class="out" id="st-out"></div>';
    function run() {
      var o = { s: $('#st-s', host).value, t: $('#st-t', host).value, a: $('#st-a', host).value, r: $('#st-r', host).value }, c = starCheck(o);
      $('#st-out', host).textContent = 'About ' + c.words + ' words (about ' + c.minutes + ' min spoken)\n\n' + (c.tips.length ? 'Improve:\n - ' + c.tips.join('\n - ') : 'Looks strong: balanced, personal, measurable.') + '\n\nHave 6 stories ready: conflict, failure, leadership, tight deadline, technical decision, learning. Each can answer many questions.';
    }
    $$('textarea', host).forEach(function (el) { el.addEventListener('input', run); }); run();
  }

  /* ============================ SBI feedback ============================ */
  var JUDGE = ['lazy', 'careless', 'sloppy', 'unprofessional', 'bad attitude', 'stupid', 'incompetent', 'always', 'never', 'terrible', 'useless', 'irresponsible', 'immature', 'difficult'];
  function feedbackCheck(o) {
    var text = (o.s + ' ' + o.b + ' ' + o.i).toLowerCase(), flagged = [];
    JUDGE.forEach(function (w) { if (new RegExp('\\b' + w + '\\b').test(text)) flagged.push(w); });
    var tips = [];
    if (!o.s.trim() || !o.b.trim() || !o.i.trim()) tips.push('Complete Situation, Behaviour and Impact.');
    if (flagged.length) tips.push('Replace judgements/absolutes (' + flagged.join(', ') + ') with what an observer could see or hear.');
    if (o.b.trim() && /\b(you are|you\'re)\b/i.test(o.b)) tips.push('Describe an action, not a trait: "you interrupted twice" instead of "you are rude".');
    if (o.i.trim() && !/(i |we |team|customer|release|sprint|client|users?|deadline|trust)/i.test(o.i)) tips.push('Impact should name the effect on you, the team, the customer or the goal.');
    if (!/\?/.test(o.ask || '')) tips.push('End with a question to invite their view ("How did that look from your side?").');
    return { tips: tips, flagged: flagged };
  }
  function renderFeedback(host) {
    host.innerHTML = '<h4>Lab: SBI feedback composer</h4><p><b>S</b>ituation (when/where), <b>B</b>ehaviour (observable facts), <b>I</b>mpact (effect). Then ask. Keep it specific, timely and private for corrective feedback.</p>' +
      '<div class="row"><label>Situation<br><input id="fb-s" style="width:300px" value="In yesterday\'s sprint review"></label><label>Behaviour<br><input id="fb-b" style="width:300px" value="you showed the demo without testing the payment step"></label></div>' +
      '<div class="row"><label>Impact<br><input id="fb-i" style="width:300px" value="it failed in front of the client and we lost some trust"></label><label>Your question<br><input id="fb-q" style="width:300px" value="What happened from your side, and what would help next time?"></label></div><div class="out" id="fb-out"></div>';
    function run() {
      var o = { s: $('#fb-s', host).value, b: $('#fb-b', host).value, i: $('#fb-i', host).value, ask: $('#fb-q', host).value }, c = feedbackCheck(o);
      $('#fb-out', host).textContent = '"' + o.s.trim() + ', ' + o.b.trim() + '. The impact was that ' + o.i.trim() + '. ' + o.ask.trim() + '"\n\n' + (c.tips.length ? 'Check:\n - ' + c.tips.join('\n - ') : 'Specific, factual, with impact and an invitation to respond.') + '\n\nPraise works the same way: say what they did and what it enabled. Aim for frequent small feedback instead of rare big reviews.';
    }
    $$('input', host).forEach(function (el) { el.addEventListener('input', run); }); run();
  }

  /* ============================ Eisenhower ============================ */
  function quadrant(urgent, important) {
    if (important && urgent) return { q: 1, name: 'Do now', note: 'Crises and deadlines. Handle, then ask why it became urgent.' };
    if (important) return { q: 2, name: 'Schedule', note: 'Where growth lives: design, mentoring, automation, health. Protect time for it.' };
    if (urgent) return { q: 3, name: 'Delegate / shorten', note: 'Interruptions, many meetings and messages. Delegate, batch or decline.' };
    return { q: 4, name: 'Drop', note: 'Time wasters. Say no or remove.' };
  }
  function triage(tasks) {
    return tasks.map(function (t) { var r = quadrant(t.urgent, t.important); return { name: t.name, q: r.q, action: r.name, note: r.note }; }).sort(function (a, b) { return a.q - b.q; });
  }
  function renderEisen(host) {
    var init = [['Production bug in checkout', 1, 1], ['Design the new reporting module', 0, 1], ['Reply to non-critical Slack threads', 1, 0], ['Browse tech news', 0, 0], ['Prepare for tomorrow\'s demo', 1, 1], ['Mentor the new joiner', 0, 1]];
    host.innerHTML = '<h4>Lab: Eisenhower triage</h4><p>Tick <b>Urgent</b> (needs action soon) and <b>Important</b> (moves a goal). Leaders spend most time in quadrant 2, preventing quadrant 1.</p>' +
      '<div class="tblwrap"><table><tr><th>Task</th><th>Urgent</th><th>Important</th></tr>' + init.map(function (r, i) { return '<tr><td><input data-i="' + i + '" data-f="n" value="' + esc(r[0]) + '" style="width:260px"></td><td><input type="checkbox" data-i="' + i + '" data-f="u"' + (r[1] ? ' checked' : '') + '></td><td><input type="checkbox" data-i="' + i + '" data-f="m"' + (r[2] ? ' checked' : '') + '></td></tr>'; }).join('') + '</table></div><div class="out" id="ei-out"></div>';
    function run() {
      var tasks = init.map(function () { return { name: '', urgent: false, important: false }; });
      $$('input', host).forEach(function (el) { var i = +el.getAttribute('data-i'), f = el.getAttribute('data-f'); if (f === 'n') tasks[i].name = el.value; else if (f === 'u') tasks[i].urgent = el.checked; else tasks[i].important = el.checked; });
      var r = triage(tasks), cnt = [0, 0, 0, 0, 0];
      r.forEach(function (x) { cnt[x.q]++; });
      $('#ei-out', host).textContent = r.map(function (x) { return 'Q' + x.q + ' ' + x.action.padEnd(20) + x.name; }).join('\n') + '\n\nQ1: ' + cnt[1] + '  Q2: ' + cnt[2] + '  Q3: ' + cnt[3] + '  Q4: ' + cnt[4] + '\n' + (cnt[1] > cnt[2] ? 'More firefighting than planning: look for root causes and automate.' : 'Healthy: planning time is protected.');
    }
    $$('input', host).forEach(function (el) { el.addEventListener('input', run); el.addEventListener('change', run); }); run();
  }

  var LABS = { 'star-lab': renderStar, 'fb-lab': renderFeedback, 'ei-lab': renderEisen };
  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', function () {
      Object.keys(LABS).forEach(function (id) { var el = document.getElementById(id); if (el) LABS[id](el); });
    });
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = { starCheck: starCheck, feedbackCheck: feedbackCheck, quadrant: quadrant, triage: triage };
})(typeof window !== 'undefined' ? window : globalThis);
