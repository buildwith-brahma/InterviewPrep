/* ===== helpers ===== */
var $ = function (id) { return document.getElementById(id); };
function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
function sum(a, f) { var t = 0; for (var i = 0; i < a.length; i++) { t += f(a[i]); } return t; }
function by(a, f) { var m = {}; a.forEach(function (x) { m[f(x)] = x; }); return m; }
function fmt(n) { return Number(n).toLocaleString("en-GB"); }
function r1(n) { return Math.round(n * 10) / 10; }
function prCls(p) { return { Critical: "crit", High: "high", Medium: "med", Low: "low" }[p] || "med"; }
function prPill(p) { return '<span class="pr ' + prCls(p) + '">' + p + '</span>'; }
function sevPill(s) { return '<span class="pr sev' + s + '">Sev ' + s + '</span>'; }
function pPill(p) { return '<span class="pr p' + p + '">P' + p + '</span>'; }
function bE(id) { return '<span class="badge b-epic">' + id + '</span>'; }
function bF(id) { return '<span class="badge b-feat">' + id + '</span>'; }
function bS(id) { return '<span class="badge b-story">' + id + '</span>'; }
function bT(id) { return '<span class="badge b-task">' + id + '</span>'; }
function bD(id) { return '<span class="badge b-bug">' + id + '</span>'; }
function bI(id) { return '<span class="badge b-inc">' + id + '</span>'; }
function stCls(s) {
  s = String(s).toLowerCase();
  if (/^(done|closed|resolved|approved|complete|released|live|accepted)/.test(s)) { return "done"; }
  if (/reopen/.test(s)) { return "reopen"; }
  if (/progress|active|monitor|assigned/.test(s)) { return "prog"; }
  if (/review|ready|retest|qa/.test(s)) { return "review"; }
  if (/fail|block|open/.test(s)) { return "blocked"; }
  if (/deferred|backlog|planned|new/.test(s)) { return "plan"; }
  return "plan";
}
function stB(s) { return '<span class="st ' + stCls(s) + '">' + esc(s) + '</span>'; }
function li(a) { return "<ul class='small'>" + a.map(function (x) { return "<li>" + x + "</li>"; }).join("") + "</ul>"; }
function link(id) {
  if (/^US-/.test(id)) { return '<a href="#st-' + id + '" class="id story">' + id + '</a>'; }
  if (/^FEAT-/.test(id)) { return '<a href="#ft-' + id + '" class="id feat">' + id + '</a>'; }
  if (/^EPIC-/.test(id)) { return '<a href="#ep-' + id + '" class="id epic">' + id + '</a>'; }
  if (/^DEF-/.test(id)) { return '<a href="#df-' + id + '" class="id bug">' + id + '</a>'; }
  return '<span class="id">' + id + '</span>';
}
function links(a) { return a.length ? a.map(link).join(" ") : "&mdash;"; }
function det(cls, head, right, body, open) {
  return '<details class="' + cls + '"' + (open ? " open" : "") + '><summary>' + head + '<span class="dsum-r">' + (right || "") + '</span></summary><div class="dbody">' + body + '</div></details>';
}
function tbl(heads, rows, cls) {
  return '<div class="tw"><table class="t ' + (cls || "compact") + '"><thead><tr>' + heads.map(function (h) { return "<th>" + h + "</th>"; }).join("") +
    "</tr></thead><tbody>" + rows.join("") + "</tbody></table></div>";
}
function tr(cells, cls) { return "<tr" + (cls ? ' class="' + cls + '"' : "") + ">" + cells.map(function (c) { return "<td>" + c + "</td>"; }).join("") + "</tr>"; }
function bar(p, cls) { return '<div class="bar ' + (cls || "") + '"><i style="width:' + Math.min(100, Math.round(p)) + '%"></i></div>'; }
function kv(pairs) { return '<dl class="kv">' + pairs.map(function (p) { return "<dt>" + p[0] + "</dt><dd>" + p[1] + "</dd>"; }).join("") + "</dl>"; }

/* ===== EPICS ===== */
var EPICS = [
  { id: "EPIC-001", n: "Customer Case Management", br: "BR-001", objs: "OBJ-3, OBJ-5", pr: "Critical", spr: "S1&ndash;S2",
    obj: "One system where agents create, find, update and enrich cases, replacing re-keying into CaseTracker and Excel.",
    desc: "Core case record: create with duplicate warning, search/filter, view/update with concurrency protection, comments and virus-scanned attachments, reference data for categories and priorities.",
    dep: "EPIC-004 sign-in and roles (US-401); EPIC-004 history interface (US-403); Entra app registration (D3)",
    ac: ["Agent can create a case in &lt; 3 min with unique case number, SLA due date and duplicate warning", "Search returns results in p95 &lt; 800 ms on 500k cases", "Two agents cannot silently overwrite each other (409)", "Attachments up to 25 MB are scanned before download"] },
  { id: "EPIC-002", n: "Assignment &amp; Workflow", br: "BR-002", objs: "OBJ-1, OBJ-2", pr: "Critical", spr: "S3",
    obj: "Reduce time to first assignment from 5.5 h to under 30 min and manage every case against an SLA.",
    desc: "Manual and automatic assignment (skill and workload), reassignment and escalation, controlled status workflow, SLA calculation, timer function and priority-driven recalculation.",
    dep: "EPIC-001 case record; US-106 reference data; SLA policy approved by Operations; Service Bus namespace (US-601)",
    ac: ["New cases auto-assigned in &lt; 1 min where an eligible agent exists", "Only valid status transitions are accepted", "SLA due date and breach flag calculated for every case", "Reassign/escalate always records a reason"] },
  { id: "EPIC-003", n: "Notifications &amp; Integrations", br: "BR-003", objs: "OBJ-1, OBJ-2", pr: "High", spr: "S4",
    obj: "Keep people informed automatically and avoid double entry with CRM and ERP/Billing.",
    desc: "Asynchronous e-mail (creation, assignment, SLA warning/breach) via Service Bus and Functions with templates, retry and dead-letter handling; CRM customer lookup; ERP adjustment sync on closure.",
    dep: "CRM sandbox (D1), ERP contract (D2), Azure Communication Services domain (A5), EPIC-002 events",
    ac: ["E-mails sent within 2 min of the event, never duplicated", "Failed messages retried then dead-lettered and visible to support", "CRM outage degrades gracefully (circuit breaker)", "ERP adjustment posted exactly once per closed case"] },
  { id: "EPIC-004", n: "Security, Roles &amp; Audit", br: "BR-004", objs: "OBJ-4", pr: "Critical", spr: "S1, S2, S3, S4, S5",
    obj: "Only the right people do the right things, and every change can be evidenced to Audit (AUD-2025-07).",
    desc: "Entra ID sign-in, five roles enforced in UI and API, user and team maintenance, automatic append-only history, timeline and compliance search, PII masking and retention.",
    dep: "Identity team groups (D3); Network private endpoints (D4)",
    ac: ["100% of create/update/assign/status changes in history with old/new values", "Role matrix enforced by API policies (403) and hidden in UI", "Compliance role is read-only", "PII masked in logs and non-production data"] },
  { id: "EPIC-005", n: "Dashboards &amp; Reporting", br: "BR-005", objs: "OBJ-6", pr: "High", spr: "S5",
    obj: "Self-service operational visibility; remove the 3-day manual monthly report.",
    desc: "Agent &lsquo;My cases&rsquo; dashboard, supervisor team dashboard, standard reports (SLA, volume, ageing), Excel/CSV export.",
    dep: "EPIC-001/002 data; Redis cache (US-502); reporting read model indexes",
    ac: ["Dashboards load in &lt; 2 s", "Report figures reconcile to case data", "Export honours role and row limits"] },
  { id: "EPIC-006", n: "Platform, Migration &amp; Readiness", br: "BR-006", objs: "OBJ-7", pr: "Critical", spr: "S1, S5, S6",
    obj: "A secure, observable, repeatable platform, migrated data and a supported go-live; retire CaseTracker.",
    desc: "Pipelines, environments and IaC; logging and monitoring; legacy migration; cut-over rehearsal and rollback; performance, security hardening; runbooks, alerts, knowledge transfer and training.",
    dep: "Azure landing zone (A3); Network approvals (D4); Pen-test slot (D5); ServiceNow integration (D6)",
    ac: ["Same artifact promoted DEV&rarr;PROD with config-only differences", "&ge; 99.9% migration reconciliation (BAC-6)", "Perf test meets NFR-01 at 600 users (BAC-4)", "Runbooks accepted by ITSM (BAC-7)"] }
];

/* ===== FEATURES ===== */
var FEATS = [
  { id: "FEAT-101", ep: "EPIC-001", n: "Case Creation", desc: "Create cases with mandatory fields, duplicate warning, SLA due date; maintain categories and priorities.", val: "Single validated entry point; removes 7-minute re-keying (OBJ-5).", dep: ["FEAT-401", "FEAT-402"], ac: ["Valid case saved with CF-yyyy-nnnnnn", "Duplicate warning shown", "Ref data admin-maintained"] },
  { id: "FEAT-102", ep: "EPIC-001", n: "Search &amp; Update", desc: "Find cases by number, customer, status, assignee, date; view detail; edit with optimistic concurrency.", val: "Agents find any case in seconds; no lost updates.", dep: ["FEAT-101"], ac: ["Filters + paging p95 &lt; 800 ms", "Stale edit returns 409"] },
  { id: "FEAT-103", ep: "EPIC-001", n: "Comments &amp; Attachments", desc: "Internal/customer-visible comments; attachment upload/download with antivirus scan.", val: "All evidence on the case instead of mailboxes and personal drives.", dep: ["FEAT-101", "COMP-15 Blob storage"], ac: ["Comment visible in timeline", "Infected file quarantined"] },
  { id: "FEAT-201", ep: "EPIC-002", n: "Case Assignment", desc: "Manual, automatic (skill/workload), reassign and escalate.", val: "Cuts first-assignment time (OBJ-1).", dep: ["FEAT-101", "FEAT-401"], ac: ["Auto-assign picks least-loaded skilled agent", "Reason mandatory on reassign"] },
  { id: "FEAT-202", ep: "EPIC-002", n: "Status, Priority &amp; SLA", desc: "Workflow state machine, SLA engine and timer, priority change recalculation.", val: "Predictable handling and early breach warning (OBJ-2).", dep: ["FEAT-101", "COMP-10 Service Bus"], ac: ["Illegal transition rejected", "Breach flag set by timer"] },
  { id: "FEAT-301", ep: "EPIC-003", n: "Email Notifications", desc: "Event-driven e-mails with templates, retry and dead-letter handling.", val: "Customers and agents informed without manual e-mails.", dep: ["FEAT-201", "FEAT-202", "COMP-26 Outbox"], ac: ["No duplicate e-mails", "DLQ visible and replayable"] },
  { id: "FEAT-302", ep: "EPIC-003", n: "CRM Integration", desc: "Customer lookup against CRM with caching and resilience.", val: "Correct customer first time; no re-typing.", dep: ["D1 CRM sandbox"], ac: ["Lookup &lt; 1 s p95", "Circuit breaker on CRM failure"] },
  { id: "FEAT-303", ep: "EPIC-003", n: "ERP Integration", desc: "Post financial adjustments to ERP/Billing when a case is closed.", val: "Refunds and credits applied without double entry.", dep: ["D2 ERP contract", "FEAT-202"], ac: ["Exactly-once adjustment", "Failed sync alerted"] },
  { id: "FEAT-401", ep: "EPIC-004", n: "Authentication &amp; RBAC", desc: "Entra ID sign-in, role claims, API policies, user and team administration.", val: "Least privilege and SSO with MFA (NFR-04).", dep: ["D3 Entra groups"], ac: ["Unauthenticated 401, unauthorised 403", "Role changes via Entra group"] },
  { id: "FEAT-402", ep: "EPIC-004", n: "Audit &amp; History", desc: "Automatic append-only history, timeline view, compliance search, PII masking and retention.", val: "Closes audit finding AUD-2025-07 (OBJ-4).", dep: ["FEAT-101"], ac: ["Every change has who/when/old/new", "PII masked in logs"] },
  { id: "FEAT-501", ep: "EPIC-005", n: "Dashboards", desc: "Agent and supervisor dashboards.", val: "Real-time workload and SLA visibility.", dep: ["FEAT-201", "FEAT-202"], ac: ["Counts match case list", "Load &lt; 2 s"] },
  { id: "FEAT-502", ep: "EPIC-005", n: "Reports &amp; Export", desc: "Standard reports and Excel/CSV export.", val: "Removes manual monthly reporting (OBJ-6).", dep: ["FEAT-501"], ac: ["Reports reconcile", "Export row limit 50k"] },
  { id: "FEAT-601", ep: "EPIC-006", n: "Platform Foundation", desc: "CI/CD, environments, IaC, logging and monitoring baseline.", val: "Fast, repeatable, observable delivery.", dep: ["A3 landing zone", "D4 network"], ac: ["Pipeline builds, tests, deploys DEV automatically", "Correlation id on every request"] },
  { id: "FEAT-602", ep: "EPIC-006", n: "Data Migration &amp; Cut-over", desc: "Migrate open legacy cases, rehearse cut-over and rollback, legacy read-only.", val: "Safe retirement of CaseTracker (OBJ-7).", dep: ["FEAT-101", "FEAT-402"], ac: ["Reconciliation &ge; 99.9%", "Rollback rehearsed"] },
  { id: "FEAT-603", ep: "EPIC-006", n: "Hardening &amp; Readiness", desc: "Performance, security fixes, runbooks, alerts, training.", val: "Supportable on day one.", dep: ["All functional features"], ac: ["NFR-01 met", "No Critical/High pen-test findings", "Runbooks accepted"] }
];
/* ===== STORIES (33) ===== */
/* s = sprint number, comps = COMP numbers, prof = task profile letters (see TK), x = custom task text, tasks = explicit [desc, role, weight] */
var STORIES = [
  { id: "US-101", ft: "FEAT-101", n: "Create customer case", sp: 5, s: 2, pr: "High", who: "customer service agent",
    want: "to create a case for an existing customer with category, priority and description",
    so: "the customer's problem is recorded once, tracked against an SLA, and duplicates are avoided",
    ac: ["Valid case saved with number CF-yyyy-nnnnnn, status New and SLA due date", "Mandatory fields validated with field-level messages", "Duplicate warning for same customer + category within 24 h", "Submitting the same request twice creates one case (AC7)"],
    dep: ["US-401", "US-106", "US-403"], comps: [1, 2, 3, 4, 7, 8, 9, 16, 17, 26],
    fixed: true, tasks: [
      ["Refine story, acceptance criteria and agree API contract (OpenAPI)", "BA / Architect", 3],
      ["Domain model, CreateCaseCommand and FluentValidation validator", "Backend Dev", 5],
      ["POST /api/cases controller, handler, SLA due-date calculation, outbox write", "Backend Dev", 8],
      ["Database migration: Cases, CaseNumberSeq, OutboxMessages, indexes (DBA review)", "DB Dev", 4],
      ["Authorisation policy CanCreateCase and ProblemDetails error handling", "Backend Dev", 3],
      ["Angular New Case form: reactive form, customer lookup stub, duplicate dialog", "Frontend Dev", 9],
      ["Duplicate-check query, logging and telemetry event CaseCreated with correlation id", "Backend Dev", 4],
      ["Integrate IHistoryRecorder so CaseCreated history is written in the same transaction", "Backend Dev", 3],
      ["Unit tests: validator, handler, SLA calculation (xUnit)", "Backend Dev", 4],
      ["Unit tests: Angular component and CaseService (Jasmine)", "Frontend Dev", 3],
      ["API and integration tests with WebApplicationFactory and Testcontainers", "QA Engineer", 3],
      ["UI test automation (Playwright) and exploratory testing", "QA Engineer", 2],
      ["Code review, PR-318 rework and Sonar fixes", "Backend Dev", 2],
      ["OpenAPI documentation, feature flag DuplicateCheck, deployment configuration", "DevOps Engineer", 1]
    ] },
  { id: "US-102", ft: "FEAT-102", n: "Search &amp; filter cases", sp: 8, s: 2, pr: "High", who: "customer service agent",
    want: "to search cases by number, customer, status, assignee, category and date range",
    so: "I can find a customer's case in seconds instead of searching mailboxes",
    ac: ["Filters combine; results paged (25/50/100) and sortable", "Search p95 &lt; 800 ms with 500,000 cases (NFR-01)", "Agents see all cases they are allowed to see; Compliance read-only", "Query text is parameterised, no injection"],
    dep: ["US-101", "US-401"], comps: [1, 3, 4, 7, 8, 14, 16, 17], prof: "ABCDEFGHIJKLM",
    x: { C: "GET /api/cases search endpoint with Dapper query, keyset paging and sort whitelist", F: "Angular search screen: filter form, results grid, paging, saved filters", B: "Indexes for search (status, assignee, customer, created) and covering columns" } },
  { id: "US-103", ft: "FEAT-102", n: "View &amp; update case details", sp: 5, s: 2, pr: "High", who: "customer service agent",
    want: "to open a case and update its details",
    so: "the record always reflects the latest customer information without overwriting a colleague's change",
    ac: ["Case detail shows fields, comments, attachments and history tabs", "PUT requires If-Match; stale version returns 409", "Only editable fields can be changed", "Every change creates a history row"],
    dep: ["US-101", "US-403"], comps: [1, 3, 4, 7, 8, 16], prof: "ABCDEFGHIJKLM",
    x: { C: "GET /api/cases/{id} and PUT /api/cases/{id} with RowVersion concurrency", F: "Angular case detail page with edit mode and conflict dialog", B: "RowVersion column usage and update stored-procedure/EF configuration" } },
  { id: "US-104", ft: "FEAT-103", n: "Add comments", sp: 3, s: 2, pr: "Medium", who: "customer service agent",
    want: "to add internal or customer-visible comments to a case",
    so: "everyone sees the conversation and decisions in one place",
    ac: ["Comment 1&ndash;4000 chars saved with author and time", "Internal comments hidden from customer-facing outputs", "Compliance role cannot post comments", "Comment appears in the timeline"],
    dep: ["US-103", "US-401"], comps: [1, 3, 4, 7, 8], prof: "ACDEFGHIKL",
    x: { C: "POST /api/cases/{id}/comments endpoint and CommentService", F: "Angular comments panel with add form and list" } },
  { id: "US-105", ft: "FEAT-103", n: "Upload / download attachments", sp: 8, s: 2, pr: "High", who: "customer service agent",
    want: "to attach files to a case and download them later",
    so: "evidence is kept with the case and not in e-mails or personal drives",
    ac: ["Upload up to 25 MB; allowed types only", "File stored in Blob Storage; metadata in SQL", "Antivirus scan before download; infected files quarantined", "Download via short-lived SAS link after permission check"],
    dep: ["US-103", "US-601"], comps: [1, 3, 4, 7, 8, 13, 15, 10, 16], prof: "ABCDEFGHIJKLM",
    x: { C: "POST/GET attachment endpoints streaming to Blob Storage; SAS generation", F: "Angular upload control with progress, type/size checks and download link", B: "CaseAttachments table with ScanStatus and BlobPath; Service Bus scan queue binding" } },
  { id: "US-106", ft: "FEAT-101", n: "Maintain categories &amp; priorities", sp: 5, s: 1, pr: "High", who: "administrator",
    want: "to maintain case categories, priorities and SLA hours",
    so: "reference data can change without a release",
    ac: ["Admin can add/disable categories and priorities", "SLA hours per priority editable with audit", "Disabled items hidden from new cases but kept on old ones", "Cached reference data refreshes within 5 min"],
    dep: ["US-401"], comps: [1, 3, 4, 7, 8, 14, 18], prof: "ABCDEFGHIJKL",
    x: { C: "Reference-data endpoints with cache-aside using Redis", F: "Angular admin screens for categories and priorities", B: "CaseCategories, CasePriorities, SlaPolicies tables with seed data" } },

  { id: "US-201", ft: "FEAT-201", n: "Assign case manually", sp: 5, s: 3, pr: "High", who: "team lead",
    want: "to assign a case to an agent or a team",
    so: "work reaches the right person immediately",
    ac: ["Assign to active agent in my team", "CaseAssignments row and history written", "Assignment event published for notification", "Agents cannot assign to others unless TeamLead/Supervisor"],
    dep: ["US-101", "US-402", "US-403"], comps: [1, 3, 4, 6, 7, 8, 26], prof: "ABCDEFGHIJKLM",
    x: { C: "POST /api/cases/{id}/assign with ownership and role checks", F: "Angular assign dialog with agent search and workload hint", B: "CaseAssignments table and AssignedToUserId update" } },
  { id: "US-202", ft: "FEAT-201", n: "Auto-assign by skill / workload", sp: 8, s: 3, pr: "High", who: "supervisor",
    want: "new cases to be assigned automatically to the least-loaded agent with the right skill",
    so: "first assignment takes minutes rather than hours (OBJ-1)",
    ac: ["Rules by category skill, shift and open-case count", "Falls back to team queue when nobody is eligible", "Assignment decision logged with the rule used", "Rules configurable by Admin without redeploy"],
    dep: ["US-201", "US-106", "US-402"], comps: [3, 4, 6, 7, 8, 10, 18, 26], prof: "ABCDEGHIKLM",
    x: { C: "Assignment engine: eligibility filter, scoring and tie-breaks; consumes CaseCreated", B: "AgentSkills and workload query/view; assignment decision log" } },
  { id: "US-203", ft: "FEAT-201", n: "Reassign &amp; escalate", sp: 3, s: 3, pr: "Medium", who: "team lead",
    want: "to reassign or escalate a case with a reason",
    so: "stuck or high-risk cases reach a senior person quickly",
    ac: ["Reason mandatory", "Escalation raises priority one level and notifies supervisor", "History shows previous and new owner", "Escalation visible on dashboards"],
    dep: ["US-201", "US-206"], comps: [1, 3, 4, 6, 7, 8], prof: "ACDEFGHIKL",
    x: { C: "Reassign/escalate commands reusing assignment service", F: "Angular escalate dialog with reason" } },
  { id: "US-204", ft: "FEAT-202", n: "Controlled status workflow", sp: 5, s: 3, pr: "High", who: "customer service agent",
    want: "to move a case through allowed statuses only",
    so: "cases follow the agreed process and reports are trustworthy",
    ac: ["Allowed transitions: New&rarr;Assigned&rarr;In Progress&rarr;Pending Customer&rarr;Resolved&rarr;Closed (+ Reopen)", "Invalid transition returns 422 with allowed list", "Close requires resolution code", "Every transition recorded in history"],
    dep: ["US-201", "US-403"], comps: [1, 3, 4, 5, 7, 8], prof: "ABCDEFGHIJKLM",
    x: { C: "POST /api/cases/{id}/status backed by workflow state machine", F: "Angular status control showing only allowed next states", B: "CaseStatuses transitions table and resolution codes" } },
  { id: "US-205", ft: "FEAT-202", n: "SLA calculation &amp; breach flag", sp: 8, s: 3, pr: "Critical", who: "supervisor",
    want: "the system to calculate SLA due dates and flag breaches automatically",
    so: "I no longer check SLAs by hand each morning (OBJ-2)",
    ac: ["Due date from priority policy and business calendar", "Timer Function runs every minute and flags At Risk (80%) and Breached", "Pending Customer pauses the clock", "Events published for warning and breach"],
    dep: ["US-204", "US-106", "US-601"], comps: [3, 4, 5, 7, 8, 10, 12, 16, 17, 18], prof: "ABCDGHIKLM",
    x: { C: "SLA engine library and timer-triggered Azure Function scanning due cases", B: "SlaDueAt, SlaState columns and filtered index for the timer scan" } },
  { id: "US-206", ft: "FEAT-202", n: "Priority change recalculates SLA", sp: 3, s: 3, pr: "Medium", who: "team lead",
    want: "SLA to be recalculated when a case priority changes",
    so: "the clock always reflects the current priority",
    ac: ["New due date = created time + new priority hours less paused time", "History records old and new due date", "Breach flag recomputed", "Notification sent if now at risk"],
    dep: ["US-205"], comps: [1, 3, 4, 5, 7, 8], prof: "ACDGHIKL",
    x: { C: "Priority change handler calling SLA engine and writing history" } },

  { id: "US-301", ft: "FEAT-301", n: "Email on creation / assignment", sp: 5, s: 4, pr: "High", who: "customer service agent",
    want: "automatic e-mails when a case is created or assigned",
    so: "customers and assignees are informed without manual e-mails",
    ac: ["Event-driven via outbox and Service Bus", "Customer e-mail on creation; assignee e-mail on assignment", "No duplicate e-mail on redelivery", "Send time &lt; 2 min from event"],
    dep: ["US-101", "US-201", "US-601"], comps: [3, 10, 11, 26, 8, 16, 17, 19], prof: "ABCDGHIKLM",
    x: { C: "Notification Function: Service Bus trigger, template rendering, Azure Communication Services send", B: "Notifications table with MessageId unique key for idempotency" } },
  { id: "US-302", ft: "FEAT-301", n: "SLA warning / breach emails", sp: 3, s: 4, pr: "Medium", who: "team lead",
    want: "e-mails when a case is at risk or has breached its SLA",
    so: "I can intervene before the customer is let down",
    ac: ["Warning at 80% of SLA; breach e-mail at 100%", "Sent once per state", "Recipients: assignee and team lead", "Includes deep link to the case"],
    dep: ["US-205", "US-301"], comps: [10, 11, 12, 8], prof: "ACDGHIKL",
    x: { C: "Handlers for SlaAtRisk and SlaBreached messages with once-per-state guard" } },
  { id: "US-303", ft: "FEAT-301", n: "Templates, retry &amp; DLQ handling", sp: 5, s: 4, pr: "High", who: "support engineer",
    want: "notification templates, automatic retry and a visible dead-letter queue",
    so: "failures are recovered without losing messages",
    ac: ["Templates versioned in configuration", "Retry with exponential back-off (5 attempts)", "Dead-lettered messages raise alert ALR-05 and can be replayed", "Replay is idempotent"],
    dep: ["US-301"], comps: [10, 11, 17, 18, 8], prof: "ACDGHIKLM",
    x: { C: "Retry policy, DLQ handler and replay endpoint/runbook script", B: "Notification status and attempt count columns" } },
  { id: "US-304", ft: "FEAT-302", n: "CRM customer lookup", sp: 8, s: 4, pr: "High", who: "customer service agent",
    want: "to look up the customer in the enterprise CRM while creating a case",
    so: "I pick the right customer first time without re-typing",
    ac: ["Search by name, account number or postcode", "Calls CRM REST API with OAuth2 client credentials", "Timeout 3 s with retry and circuit breaker", "Results cached for 10 min; local Customers table updated"],
    dep: ["US-101", "US-601", "D1"], comps: [1, 3, 4, 22, 14, 19, 8, 16, 17], prof: "ABCDEFGHIJKLM",
    x: { C: "CRM client adapter with Polly (timeout, retry, circuit breaker) and GET /api/customers?q=", F: "Angular customer typeahead replacing the stub", B: "Customers cache table and last-sync columns" } },
  { id: "US-305", ft: "FEAT-303", n: "ERP adjustment sync on close", sp: 8, s: 4, pr: "High", who: "finance operations analyst",
    want: "financial adjustments on a closed case to be posted to ERP/Billing automatically",
    so: "credits and refunds are applied once, without double entry",
    ac: ["On Closed with adjustment amount, message queued", "ERP sync Function posts with idempotency key", "Failure retried then alerted", "Redelivery never creates a second adjustment"],
    dep: ["US-204", "US-601", "D2"], comps: [10, 23, 19, 26, 8, 16, 17], prof: "ABCDGHIKLM",
    x: { C: "ERP sync Function: Service Bus trigger, ERP API call with idempotency key, result recorded", B: "ErpAdjustments table with unique (CaseId, AdjustmentRef)" } },

  { id: "US-401", ft: "FEAT-401", n: "Sign in with Entra ID + RBAC", sp: 8, s: 1, pr: "Critical", who: "customer service agent",
    want: "to sign in with my corporate account and see only what my role allows",
    so: "access is secure, auditable and needs no separate password",
    ac: ["Entra ID SSO with MFA via MSAL (Angular) and JWT validation (API)", "Roles from group claims: Agent, TeamLead, Supervisor, Compliance, Admin", "Unauthenticated 401, unauthorised 403 with ProblemDetails", "Menus and buttons hidden by role"],
    dep: ["D3", "D4"], comps: [1, 2, 3, 9, 16, 19], prof: "ABCDEFGHIJKLM",
    x: { C: "JWT bearer authentication, authorisation policies and role claim mapping", F: "MSAL integration, AuthInterceptor, RoleGuard and role-based menu", B: "Users table synchronised on first sign-in" } },
  { id: "US-402", ft: "FEAT-401", n: "Manage users and teams", sp: 5, s: 3, pr: "Medium", who: "administrator",
    want: "to manage teams, skills and agent availability",
    so: "assignment and dashboards use correct organisation data",
    ac: ["Create/edit teams and membership", "Maintain agent skills and active flag", "Roles remain controlled by Entra groups", "All changes audited"],
    dep: ["US-401"], comps: [1, 3, 4, 7, 8, 9], prof: "ABCDEFGHIJKL",
    x: { C: "Users/Teams endpoints with Admin policy", F: "Angular admin screens for teams and skills", B: "Teams, TeamMembers, AgentSkills tables" } },
  { id: "US-403", ft: "FEAT-402", n: "Record case history automatically", sp: 8, s: 2, pr: "Critical", who: "compliance officer",
    want: "every change to a case to be recorded automatically with who, when, old and new values",
    so: "I can evidence any decision to Internal Audit and the regulator",
    ac: ["IHistoryRecorder writes in the same transaction as the change", "Table is append-only for the app login", "Field-level old/new values and correlation id", "Covers create, update, assign, status, comment, attachment"],
    dep: ["US-401"], comps: [3, 4, 7, 8, 25, 16], prof: "ABCDEGHIKLM",
    x: { C: "IHistoryRecorder, EF SaveChanges interceptor and change-set serialisation", B: "CaseHistory table, append-only permissions and indexes" } },
  { id: "US-404", ft: "FEAT-402", n: "History timeline &amp; compliance audit search", sp: 5, s: 5, pr: "High", who: "compliance officer",
    want: "to view a case timeline and search history across cases",
    so: "audit sampling takes minutes, not days",
    ac: ["Timeline tab shows chronological events with before/after", "Search by user, date range, case, change type", "Read-only for Compliance", "Export limited to 50,000 rows"],
    dep: ["US-403"], comps: [1, 3, 24, 25, 7, 8], prof: "ABCDEFGHIJKL",
    x: { C: "GET /api/cases/{id}/history and audit search endpoint", F: "Angular timeline component and audit search page", B: "Search indexes on CaseHistory (ChangedAt, ChangedBy)" } },
  { id: "US-405", ft: "FEAT-402", n: "PII masking &amp; retention policy", sp: 3, s: 4, pr: "High", who: "compliance officer",
    want: "personal data masked in logs and non-production data, with a retention job",
    so: "we meet UK GDPR and the 7-year retention rule",
    ac: ["Serilog destructuring masks e-mail, phone, address", "Non-prod refresh masks customer data", "Retention job flags cases past 7 years for anonymisation", "Evidence for DPIA"],
    dep: ["US-602"], comps: [16, 17, 8, 12], prof: "ACEGHIKL",
    x: { C: "PII masking policy for Serilog and anonymisation job" } },

  { id: "US-501", ft: "FEAT-501", n: "Agent 'My cases' dashboard", sp: 5, s: 5, pr: "High", who: "customer service agent",
    want: "a dashboard of my open cases by status and SLA",
    so: "I know what to work on next",
    ac: ["Tiles: open, at risk, breached, due today", "List sorted by SLA due", "Loads in &lt; 2 s", "Counts match the case search"],
    dep: ["US-205", "US-102"], comps: [1, 3, 24, 7, 8, 14], prof: "ABCEFGHIJKL",
    x: { C: "GET /api/dashboard/my-cases aggregated query", F: "Angular dashboard tiles and list", B: "Covering index for assignee + status + SlaDueAt" } },
  { id: "US-502", ft: "FEAT-501", n: "Supervisor team dashboard", sp: 8, s: 5, pr: "High", who: "supervisor",
    want: "a live view of my team's workload, SLA risk and backlog",
    so: "I can rebalance work before SLAs are breached",
    ac: ["Per-agent workload, status mix, ageing buckets", "Breached today (UK local day)", "Auto-refresh every 60 s", "Server-side cache 30 s"],
    dep: ["US-501", "US-402"], comps: [1, 3, 24, 7, 8, 14, 17], prof: "ABCEFGHIJKLM",
    x: { C: "GET /api/dashboard/team with Dapper aggregates and Redis caching", F: "Angular team dashboard with charts and agent table", B: "Indexed views/queries for ageing buckets" } },
  { id: "US-503", ft: "FEAT-502", n: "Standard reports", sp: 5, s: 5, pr: "Medium", who: "supervisor",
    want: "standard SLA, volume and ageing reports for a date range",
    so: "the monthly report is self-service (OBJ-6)",
    ac: ["Three reports with parameters", "Figures reconcile to case list", "Role-restricted to Supervisor/Compliance/Admin", "Runs in &lt; 10 s for one month"],
    dep: ["US-502"], comps: [1, 3, 24, 7, 8], prof: "ABCEFGHIJKL",
    x: { C: "GET /api/reports/{name} read-model queries", F: "Angular report pages with parameter form", B: "Reporting views and supporting indexes" } },
  { id: "US-504", ft: "FEAT-502", n: "Export to Excel / CSV", sp: 3, s: 5, pr: "Medium", who: "supervisor",
    want: "to export a report or search result to Excel or CSV",
    so: "I can share data with managers",
    ac: ["XLSX and CSV formats", "Max 50,000 rows", "Honours role and filters", "Export action written to audit"],
    dep: ["US-503", "US-102"], comps: [1, 3, 24, 25], prof: "ACDEFGHIKL",
    x: { C: "Streaming export endpoint using ClosedXML/CSV writer", F: "Angular export buttons with download progress" } },

  { id: "US-601", ft: "FEAT-601", n: "CI/CD pipelines, environments, IaC", sp: 8, s: 1, pr: "Critical", who: "DevOps engineer",
    want: "automated pipelines and Bicep-defined environments for DEV, QA, UAT and PROD",
    so: "every change is built, tested and deployed the same way",
    ac: ["PR build with unit tests and Sonar gate", "Multi-stage YAML release with approvals", "Bicep deploys App Service, SQL, Service Bus, Key Vault, Redis, Functions", "Private endpoints and managed identities"],
    dep: ["D4"], comps: [20, 21, 18, 19, 8, 10], tasks: [
      ["Design environment topology and naming; agree with Network (D4)", "Architect", 4],
      ["Bicep modules: App Service, Functions, Service Bus, Key Vault, Redis, Storage", "DevOps Engineer", 12],
      ["Bicep: Azure SQL, private endpoints, managed identities and RBAC", "DevOps Engineer", 10],
      ["PR build pipeline: restore, build, unit tests, coverage, Sonar", "DevOps Engineer", 8],
      ["Multi-stage release pipeline with approvals and environment variables", "DevOps Engineer", 10],
      ["EF Core migration bundle step and DB deployment gate", "DB Dev", 6],
      ["Angular build, lint, Jasmine and Playwright smoke in pipeline", "Frontend Dev", 6],
      ["Branch policies, PR templates and work-item linking rules in Azure Repos", "DevOps Engineer", 4],
      ["Pipeline security: service connections, secret scanning, dependency scan", "Security Engineer", 6],
      ["Test deployments DEV and QA; fix findings", "QA Engineer", 6],
      ["Runbook and pipeline documentation", "DevOps Engineer", 3],
      ["Peer review of IaC and pipelines", "Backend Dev", 3]
    ] },
  { id: "US-602", ft: "FEAT-601", n: "Logging, monitoring &amp; correlation", sp: 5, s: 1, pr: "Critical", who: "support engineer",
    want: "structured logs, correlation ids and Application Insights telemetry in every component",
    so: "I can trace any request end to end when something fails",
    ac: ["Serilog to Application Insights with CorrelationId", "Correlation id flows UI &rarr; API &rarr; Service Bus &rarr; Functions", "Custom events and metrics for key journeys", "Base dashboards and alerts"],
    dep: ["US-601"], comps: [16, 17, 3, 11, 12, 18], tasks: [
      ["Serilog configuration, enrichers and App Insights sink", "Backend Dev", 6],
      ["Correlation-id middleware and Angular interceptor; propagate to Service Bus properties", "Backend Dev", 8],
      ["Global exception handler producing RFC 7807 ProblemDetails with traceId", "Backend Dev", 6],
      ["Functions telemetry and operation id continuation", "Backend Dev", 5],
      ["Custom events/metrics (CaseCreated, CaseCreateFailed, SlaBreached)", "Backend Dev", 5],
      ["Log Analytics workspace, workbook 'Business health' and base KQL", "DevOps Engineer", 8],
      ["Unit tests for middleware and exception handler", "Backend Dev", 4],
      ["Verify end-to-end trace in QA", "QA Engineer", 4],
      ["Operational guide: how to trace a request", "DevOps Engineer", 3],
      ["Code review", "Backend Dev", 2]
    ] },
  { id: "US-603", ft: "FEAT-602", n: "Migrate open legacy cases", sp: 8, s: 5, pr: "Critical", who: "migration lead",
    want: "open and recent closed cases from CaseTracker migrated into CaseFlow",
    so: "agents continue their work without re-keying (BAC-6)",
    ac: ["Extract-transform-load pipeline with mapping rules", "3 dry runs with reconciliation report &ge; 99.9%", "History marked as migrated", "Customer ids matched to CRM"],
    dep: ["US-304", "US-403", "US-601"], comps: [8, 7, 20, 22, 16], tasks: [
      ["Profile legacy data, quality issues and mapping specification", "BA / Architect", 10],
      ["ETL job (Azure Data Factory or console) with staging tables", "Backend Dev", 14],
      ["Transformation rules: status, category, priority, user mapping", "Backend Dev", 10],
      ["Customer matching against CRM and exceptions list", "Backend Dev", 8],
      ["Attachment migration to Blob Storage", "Backend Dev", 8],
      ["Reconciliation report (counts, checksums, samples)", "DB Dev", 8],
      ["Dry run 1, 2, 3 with fixes and timing", "QA Engineer", 12],
      ["Masked data copy for UAT", "DB Dev", 4],
      ["Migration runbook and sign-off pack", "BA / Architect", 4],
      ["Code review", "Backend Dev", 3]
    ] },
  { id: "US-604", ft: "FEAT-602", n: "Cut-over rehearsal, rollback &amp; legacy read-only", sp: 8, s: 6, pr: "Critical", who: "release manager",
    want: "a rehearsed cut-over plan with rollback and the legacy tool switched to read-only",
    so: "go-live is controlled and reversible",
    ac: ["Two timed rehearsals in UAT/pre-prod", "Rollback decision points and communications", "CaseTracker read-only switch tested", "Cut-over checklist signed by Product Owner"],
    dep: ["US-603", "US-601"], comps: [20, 21, 8, 18, 19], tasks: [
      ["Draft cut-over plan, timeline and decision points", "Release Manager", 8],
      ["Blue/green slot-swap configuration and warm-up", "DevOps Engineer", 10],
      ["Rollback scripts: slot swap back, config, DB restore decision", "DevOps Engineer", 10],
      ["Legacy CaseTracker read-only switch and redirect page", "Backend Dev", 8],
      ["Rehearsal 1 in UAT with timings", "QA Engineer", 12],
      ["Rehearsal 2 and Go/No-Go dry run", "QA Engineer", 12],
      ["Communications plan and floor-walker roster", "Scrum Master", 6],
      ["Post-deployment smoke test pack", "QA Engineer", 8],
      ["Review with ITSM and CAB pre-read", "Release Manager", 4],
      ["Code and script review", "Backend Dev", 3],
      ["Update runbooks after rehearsal findings", "DevOps Engineer", 3]
    ] },
  { id: "US-605", ft: "FEAT-603", n: "Performance &amp; load testing", sp: 8, s: 6, pr: "Critical", who: "product owner",
    want: "evidence that CaseFlow meets NFR-01 at 600 concurrent users",
    so: "peak Monday traffic does not degrade service (BAC-4)",
    ac: ["Azure Load Testing scenarios: login, search, create, update, dashboard", "p95 targets met at 600 users for 60 min", "Bottlenecks fixed (indexes, queries, caching)", "Report signed off"],
    dep: ["US-102", "US-101", "US-502"], comps: [3, 8, 14, 17, 1], tasks: [
      ["Workload model from legacy volumes and agent behaviour", "QA Engineer", 8],
      ["Azure Load Testing scripts and test data generator", "QA Engineer", 14],
      ["Baseline run and bottleneck analysis (App Insights, Query Store)", "Backend Dev", 12],
      ["Index and query tuning in Azure SQL", "DB Dev", 12],
      ["Cache tuning and App Service scale rules", "DevOps Engineer", 8],
      ["Soak and spike tests", "QA Engineer", 10],
      ["Performance defects fix and retest (DEF-006 follow-up)", "Backend Dev", 10],
      ["Performance report and sign-off", "QA Engineer", 6],
      ["Review of test design", "Architect", 4]
    ] },
  { id: "US-606", ft: "FEAT-603", n: "Security hardening &amp; pen-test fixes", sp: 8, s: 6, pr: "Critical", who: "security engineer",
    want: "the application hardened and pen-test findings fixed",
    so: "there are no Critical/High findings at go-live (BAC-5)",
    ac: ["OWASP Top 10 review complete", "Pen-test findings triaged and fixed", "Security headers, CORS, rate limiting, upload hardening", "Secrets reviewed, rotation and expiry dates set"],
    dep: ["US-105", "US-401", "US-601"], comps: [3, 19, 9, 1, 15], tasks: [
      ["Threat model review and OWASP checklist", "Security Engineer", 8],
      ["Support pen-test: access, environments, triage", "Security Engineer", 8],
      ["Fix findings: headers, CORS, rate limiting, input handling", "Backend Dev", 14],
      ["Fix findings: Angular XSS, token storage, CSP", "Frontend Dev", 8],
      ["Upload hardening: content sniffing, size limits, quarantine path", "Backend Dev", 8],
      ["Key Vault review: access policies, secret expiry, rotation procedure", "DevOps Engineer", 8],
      ["Dependency and container scans; fix vulnerable packages", "DevOps Engineer", 6],
      ["Retest all findings", "QA Engineer", 10],
      ["Security sign-off pack", "Security Engineer", 4],
      ["Code review", "Backend Dev", 3]
    ] },
  { id: "US-607", ft: "FEAT-603", n: "Runbooks, alerts, KT &amp; training", sp: 8, s: 6, pr: "High", who: "IT service manager",
    want: "runbooks, alerts, knowledge transfer and user training ready before go-live",
    so: "L1/L2 can support the service on day one (BAC-7)",
    ac: ["Alerts ALR-01..ALR-11 configured and tested with ServiceNow", "Runbooks and KB-100..KB-112 accepted by ITSM", "Knowledge-transfer sessions for L1/L2", "1-hour agent training delivered to super-users"],
    dep: ["US-602", "US-604"], comps: [17, 16, 18, 20], tasks: [
      ["Alert rules ALR-01..ALR-11 with thresholds and action groups", "DevOps Engineer", 12],
      ["ServiceNow integration (D6) and alert-to-incident test", "DevOps Engineer", 8],
      ["Runbooks and knowledge articles KB-100..KB-112", "BA / Architect", 14],
      ["Support dashboards and KQL queries pack", "Backend Dev", 8],
      ["Knowledge-transfer sessions for L1/L2 and recorded demos", "Architect", 8],
      ["User training material and super-user sessions", "BA / Architect", 12],
      ["Hypercare plan, roster and escalation matrix", "Scrum Master", 6],
      ["Alert test: simulate failures in UAT", "QA Engineer", 8],
      ["ITSM acceptance review", "Scrum Master", 4],
      ["Review of runbooks by developers", "Backend Dev", 4]
    ] }
];

/* ===== TASK GENERATION ===== */
var TK = {
  A: ["Refine story, confirm acceptance criteria and design for", "BA / Architect", 1],
  B: ["Database changes (migration, indexes, DBA review):", "DB Dev", 1.3],
  C: ["API development:", "Backend Dev", 2.2],
  D: ["Validation rules and error handling (ProblemDetails):", "Backend Dev", 1],
  E: ["Authentication / authorisation policies and role checks:", "Backend Dev", 0.9],
  F: ["UI development (Angular):", "Frontend Dev", 2.2],
  G: ["Logging, telemetry and correlation id:", "Backend Dev", 0.8],
  H: ["Unit testing (xUnit / Jasmine):", "Backend Dev", 1.5],
  I: ["Integration / API testing:", "QA Engineer", 1.2],
  J: ["UI test automation (Playwright) and exploratory testing:", "QA Engineer", 1.1],
  K: ["Code review, PR rework and Sonar fixes:", "Backend Dev", 0.7],
  L: ["Documentation (OpenAPI, wiki, runbook note):", "BA / Tech Writer", 0.5],
  M: ["Deployment configuration (pipeline variables, App Configuration, Bicep):", "DevOps Engineer", 0.6]
};
/* dependencies between kinds */
var TKDEP = { A: [], B: ["A"], C: ["A", "B"], D: ["C"], E: ["C"], F: ["A"], G: ["C"], H: ["C", "D"], I: ["C", "F"], J: ["F", "I"], K: ["H"], L: ["K"], M: ["K"] };

function allocate(weights, total) {
  var s = weights.reduce(function (a, b) { return a + b; }, 0);
  var raw = weights.map(function (w) { return w / s * total; });
  var out = raw.map(function (r) { return Math.max(1, Math.floor(r)); });
  var diff = total - out.reduce(function (a, b) { return a + b; }, 0);
  var idx = raw.map(function (r, i) { return [r - Math.floor(r), i]; }).sort(function (a, b) { return b[0] - a[0]; });
  var k = 0;
  while (diff > 0) { out[idx[k % idx.length][1]]++; diff--; k++; }
  k = out.length - 1;
  while (diff < 0 && k >= 0) { if (out[k] > 1) { out[k]--; diff++; } k--; }
  return out;
}
function pad(n) { return (n < 10 ? "0" : "") + n; }
var TASKS = [];
STORIES.forEach(function (st) {
  var num = st.id.slice(3), base = [], total;
  if (st.tasks) {
    base = st.tasks.map(function (t, i) { return { d: t[0], r: t[1], w: t[2], k: null }; });
  } else {
    st.prof.split("").forEach(function (c) {
      var t = TK[c], d = (st.x && st.x[c]) ? st.x[c] : (t[0] + " " + st.n.replace(/&amp;/g, "&"));
      base.push({ d: d, r: t[1], w: t[2], k: c });
    });
  }
  total = st.fixed ? sum(base, function (b) { return b.w; }) : Math.round(st.sp * 10.5);
  var hrs = st.fixed ? base.map(function (b) { return b.w; }) : allocate(base.map(function (b) { return b.w; }), total);
  var ids = {};
  base.forEach(function (b, i) { ids[b.k || ("#" + i)] = "TSK-" + num + "-" + pad(i + 1); });
  base.forEach(function (b, i) {
    var deps = [];
    if (st.fixed) {
      deps = [[], ["01"], ["02"], ["01"], ["03"], ["01"], ["03"], ["03"], ["02", "03"], ["06"], ["03", "04"], ["06", "11"], ["09", "10"], ["13"]][i].map(function (x) { return "TSK-" + num + "-" + x; });
    } else if (b.k) {
      deps = TKDEP[b.k].filter(function (k) { return ids[k]; }).map(function (k) { return ids[k]; });
    } else {
      deps = i === 0 ? [] : ["TSK-" + num + "-" + pad(i)];
    }
    TASKS.push({ id: "TSK-" + num + "-" + pad(i + 1), us: st.id, d: b.d, r: b.r, h: hrs[i], dep: deps, st: "Done", pr: (st.fixed && i >= 1 && i <= 9) ? "PR-318" : "" });
  });
});
/* ===== COMPONENTS (26) ===== */
/* [num, name, layer, purpose, tech, deps(COMP nums), person-days] ; stories derived from STORIES[].comps */
var COMPS = [
  [1, "Angular SPA", "Frontend", "Browser UI for agents, supervisors, compliance and admin: forms, grids, dashboards, timeline.", "Angular 17, TypeScript, Angular Material, RxJS, Jasmine, Playwright", [2, 3], 38],
  [2, "MSAL &amp; HTTP interceptors", "Frontend", "Entra ID sign-in, token acquisition, Authorization header, correlation id, error mapping, route guards.", "@azure/msal-angular, Angular interceptors/guards", [9], 6],
  [3, "ASP.NET Core Web API", "Backend API", "REST endpoints, authentication/authorisation policies, validation, ProblemDetails, versioning, OpenAPI.", "ASP.NET Core 8, C# 12, FluentValidation, Swashbuckle, Polly", [4, 9, 16], 30],
  [4, "Case service (application layer)", "Business services", "Use cases (commands/queries), domain rules, duplicate check, transactions, outbox writes.", "C#, MediatR-style handlers, domain model", [5, 7, 25, 26], 26],
  [5, "Workflow &amp; SLA engine", "Business services", "Status state machine, SLA due-date and pause logic, business calendar.", "C# class library, unit-test heavy", [7, 18], 14],
  [6, "Assignment engine", "Business services", "Eligibility, scoring and assignment decisions (skill, shift, workload).", "C# class library, rules in App Configuration", [7, 18], 12],
  [7, "Data access (EF Core + Dapper)", "Database", "EF Core for transactional writes; Dapper for search/report reads; migrations; Unit of Work.", "EF Core 8, Dapper, Microsoft.Data.SqlClient", [8], 16],
  [8, "Azure SQL", "Database", "System of record: schema cf, indexes, constraints, geo-replica, PITR backups.", "Azure SQL Database (General Purpose), private endpoint", [], 14],
  [9, "Microsoft Entra ID", "Authentication", "Identity provider: SSO, MFA, app registrations, app roles / security groups.", "Entra ID, OAuth 2.0 / OIDC, JWT", [], 5],
  [10, "Azure Service Bus", "Messaging", "Queues/topics for notifications, SLA events, ERP sync, attachment scans; DLQ.", "Service Bus Standard, sessions off, DLQ", [], 6],
  [11, "Notification Function", "Background processing", "Consumes notification messages, renders templates, sends e-mail idempotently.", "Azure Functions (isolated worker, .NET 8), Azure Communication Services", [10, 8, 19], 14],
  [12, "SLA timer Function", "Background processing", "Timer trigger every minute: marks At Risk / Breached, publishes events; retention job.", "Azure Functions timer trigger", [10, 8, 5], 10],
  [13, "Attachment scan Function", "Background processing", "Blob/Service Bus triggered antivirus scan; sets ScanStatus; quarantines infected files.", "Azure Functions, Microsoft Defender for Storage / ClamAV", [10, 15, 8], 8],
  [14, "Redis cache", "Caching", "Cache-aside for reference data, CRM lookups, dashboard KPIs (never case state, ADR-007).", "Azure Cache for Redis (Basic C1 &rarr; Standard)", [], 6],
  [15, "Blob storage", "Storage", "Binary attachments, quarantine container, migration files; SAS for download.", "Azure Blob Storage (ZRS), private endpoint", [], 5],
  [16, "Serilog logging", "Logging", "Structured logging with enrichers (correlation id, user, env), PII masking.", "Serilog, Serilog.Sinks.ApplicationInsights", [17], 8],
  [17, "Application Insights &amp; alerts", "Monitoring", "Telemetry, distributed tracing, availability tests, workbooks, alert rules to ServiceNow.", "Application Insights, Log Analytics, KQL, Azure Monitor", [], 12],
  [18, "Azure App Configuration", "Configuration", "Environment settings and feature flags (DuplicateCheck, CrmDegradedMode, assignment rules).", "Azure App Configuration + feature management", [], 4],
  [19, "Azure Key Vault", "Secrets management", "Secrets (CRM client secret, ERP key), certificates; managed-identity access; expiry alerts.", "Azure Key Vault (RBAC), Key Vault references", [9], 4],
  [20, "Azure DevOps CI/CD", "CI/CD", "Boards, Repos, YAML pipelines, environments, approvals, test and artifact feeds.", "Azure DevOps Services, YAML, SonarQube", [21], 18],
  [21, "Bicep IaC", "Infrastructure", "Repeatable infrastructure for all environments: App Service, SQL, Service Bus, Key Vault, Redis.", "Bicep, Azure CLI, Azure Policy", [], 12],
  [22, "CRM client adapter", "Integration", "Typed client for CRM customer search with OAuth2, caching and resilience policies.", "HttpClientFactory, Polly, Redis", [14, 19], 10],
  [23, "ERP sync Function", "Integration", "Posts closed-case adjustments to ERP/Billing exactly once with idempotency key.", "Azure Functions Service Bus trigger, REST", [10, 19, 8], 10],
  [24, "Reporting module", "Business services", "Dashboard aggregates, standard reports and export using read-optimised queries.", "Dapper, ClosedXML, Redis", [7, 14], 14],
  [25, "Audit service", "Business services", "IHistoryRecorder, append-only CaseHistory writes, timeline and audit search.", "C#, EF Core interceptors, JSON change sets", [7, 8], 12],
  [26, "Outbox publisher", "Integration", "Reads OutboxMessages and publishes to Service Bus with at-least-once delivery.", "BackgroundService (polling) in API / Function", [8, 10], 7]
];

/* ===== APIS ===== */
/* [method, path, purpose, request, response, validation[], errors[], story, roles, status] */
var APIS = [
  ["POST", "/api/cases", "Create a customer case.", '{ "customerId":"CUST-004512", "categoryId":3, "priorityId":2, "title":"Charged twice in March", "description":"...", "confirmDuplicate":false }\nHeaders: Authorization, Idempotency-Key, X-Correlation-Id', '201 Created + Location\n{ "caseId":"0b9f&hellip;", "caseNumber":"CF-2026-000123", "status":"New", "slaDueAt":"2026-03-06T17:42:00Z", "rowVersion":"AAAAAAAAB9E=" }',
    ["customerId, categoryId, priorityId, title (&le; 200), description (&le; 4000, not blank) required", "Category and priority must be active", "Idempotency-Key must be a GUID"], ["400 validation", "401/403", "404 customer not found", "409 likely duplicate (needs confirmDuplicate)", "200 replay of same key", "503 CRM unavailable"], "US-101", "Agent, TeamLead, Supervisor"],
  ["GET", "/api/cases/{id}", "Get case detail with current status, SLA and ETag.", "Path: id (GUID). Query: include=comments,attachments", '200 OK { caseId, caseNumber, customer, status, priority, assignee, slaDueAt, rowVersion, &hellip; }\nHeader: ETag', ["id is a valid GUID", "Caller allowed to see the case's team"], ["400 bad id", "401/403", "404 not found or soft-deleted"], "US-103", "All roles"],
  ["PUT", "/api/cases/{id}", "Update editable fields of a case with optimistic concurrency.", '{ "title":"...", "description":"...", "categoryId":3, "priorityId":1 }\nHeader: If-Match: "AAAAAAAAB9E="', '200 OK updated case + new ETag', ["If-Match required", "Only editable fields; status changes use /status", "Priority change triggers SLA recalculation (US-206)"], ["400", "403", "404", "409 stale version (DEF-003 fix)", "412 missing If-Match", "422 invalid state"], "US-103", "Agent, TeamLead, Supervisor"],
  ["GET", "/api/cases", "Search and filter cases (paged).", "Query: q, status, assigneeId, customerId, categoryId, priority, from, to, sort, page, pageSize", '200 OK { items:[&hellip;], page, pageSize, totalCount }', ["pageSize 1&ndash;100", "sort from whitelist", "date range &le; 366 days", "q parameterised (no leading-wildcard scan after DEF-006)"], ["400", "401/403", "429 rate limit"], "US-102", "All roles"],
  ["POST", "/api/cases/{id}/comments", "Add a comment to a case.", '{ "text":"Called customer, refund agreed.", "visibility":"Internal" }', '201 Created { commentId, author, createdAt }', ["text 1&ndash;4000 chars", "visibility is Internal or CustomerVisible"], ["400", "403 (Compliance read-only, DEF-005)", "404", "409 closed case"], "US-104", "Agent, TeamLead, Supervisor"],
  ["POST", "/api/cases/{id}/attachments", "Upload an attachment (multipart).", "multipart/form-data file (&le; 25 MB)\nHeader: Idempotency-Key", '202 Accepted { attachmentId, fileName, scanStatus:"Pending" }', ["Extension and content-type allow-list", "Size &le; 25 MB", "File name sanitised"], ["400", "403", "404", "413 too large", "415 type not allowed", "422 infected (after scan)"], "US-105", "Agent, TeamLead, Supervisor"],
  ["GET", "/api/cases/{id}/attachments/{aid}", "Download an attachment via short-lived link.", "Path: id, aid", '302 redirect to SAS URL (5 min) or 200 stream', ["Attachment belongs to the case", "ScanStatus must be Clean"], ["403", "404", "409 scan pending", "423 quarantined"], "US-105", "All roles"],
  ["POST", "/api/cases/{id}/assign", "Assign or reassign a case to an agent or team.", '{ "assigneeId":"u-1021", "reason":"Skill match: billing" }\nHeader: If-Match', '200 OK { caseId, assignee, assignedAt }', ["assignee active and in scope", "reason required on reassign/escalate", "TeamLead/Supervisor for others"], ["400", "403", "404", "409 stale", "422 assignee inactive"], "US-201", "TeamLead, Supervisor"],
  ["POST", "/api/cases/{id}/status", "Change case status following the workflow.", '{ "toStatus":"Resolved", "resolutionCode":"RC-07", "comment":"Refund issued" }', '200 OK { caseId, status, slaState }', ["Transition allowed from current status", "resolutionCode required for Resolved/Closed", "adjustment amount triggers ERP message (US-305)"], ["400", "403", "404", "409 stale", "422 invalid transition (returns allowed list)"], "US-204", "Agent, TeamLead, Supervisor"],
  ["GET", "/api/cases/{id}/history", "Return the case history timeline.", "Query: page, pageSize, changeType", '200 OK { items:[ { changedAt, changedBy, changeType, field, oldValue, newValue, correlationId } ] }', ["pageSize &le; 200"], ["401/403", "404"], "US-404", "Agent (own team), TeamLead, Supervisor, Compliance, Admin"],
  ["GET", "/api/customers?q=", "Look up customers in the CRM (cached).", "Query: q (&ge; 3 chars), by=name|account|postcode", '200 OK [ { customerId, name, accountNo, postcode } ]', ["q length &ge; 3", "max 20 results"], ["400", "401/403", "503 CRM unavailable (CrmDegradedMode may allow manual entry)", "504 timeout"], "US-304", "Agent, TeamLead, Supervisor"],
  ["GET", "/api/dashboard/my-cases", "Dashboard data for the signed-in agent.", "none", '200 OK { open, atRisk, breached, dueToday, items:[&hellip;] }', ["Scoped to caller automatically"], ["401", "429"], "US-501", "Agent, TeamLead, Supervisor"],
  ["GET", "/api/dashboard/team", "Dashboard data for a supervisor's team.", "Query: teamId, from, to", '200 OK { perAgent:[&hellip;], statusMix, ageing, breachedToday }', ["teamId within caller's scope", "day boundary uses Europe/London (DEF-012 fix)"], ["400", "403", "404"], "US-502", "Supervisor, Admin"],
  ["GET", "/api/reports/{name}", "Run a standard report or export it (format=xlsx|csv).", "Path: name = sla | volume | ageing\nQuery: from, to, teamId, format", '200 OK JSON or file stream', ["from/to required, &le; 366 days", "rows &le; 50,000 for export", "name from whitelist"], ["400", "403", "404", "413 too many rows"], "US-503, US-504", "Supervisor, Compliance, Admin"]
];

/* ===== DATABASE ===== */
/* [name, purpose, [ [flag, col, type] ... ] ] flag: PK, FK, UQ, '' */
var TABLES = [
  ["Users", "Agents and staff synchronised from Entra ID", [["PK", "UserId", "int"], ["UQ", "EntraObjectId", "uniqueidentifier"], ["", "DisplayName", "nvarchar(150)"], ["UQ", "Email", "nvarchar(256)"], ["FK", "TeamId", "int &rarr; Teams"], ["", "IsActive", "bit"], ["", "CreatedAt / CreatedBy", "datetime2 / int"], ["", "ModifiedAt / ModifiedBy", "datetime2 / int"]]],
  ["Teams", "Teams within contact centres", [["PK", "TeamId", "int"], ["", "Name", "nvarchar(100)"], ["", "Site", "nvarchar(50)"], ["FK", "LeadUserId", "int &rarr; Users"], ["", "Audit fields", "Created/Modified"]]],
  ["Customers", "Local cache of CRM customer master", [["PK", "CustomerId", "int"], ["UQ", "CrmCustomerId", "varchar(20)"], ["", "Name", "nvarchar(200)"], ["", "AccountNo", "varchar(20)"], ["", "LastSyncedAt", "datetime2"], ["", "Audit fields", "Created/Modified"]]],
  ["Cases", "The case record", [["PK", "CaseId", "uniqueidentifier"], ["UQ", "CaseNumber", "varchar(20)"], ["FK", "CustomerId", "int &rarr; Customers"], ["FK", "CategoryId", "smallint &rarr; CaseCategories"], ["FK", "PriorityId", "tinyint &rarr; CasePriorities"], ["FK", "StatusId", "tinyint &rarr; CaseStatuses"], ["FK", "AssignedToUserId", "int &rarr; Users"], ["", "SlaDueAt, SlaState", "datetime2, tinyint"], ["UQ", "ClientRequestId", "uniqueidentifier (DEF-002)"], ["", "RowVersion, IsDeleted", "rowversion, bit"], ["", "CreatedAt/By, ModifiedAt/By", "audit"]]],
  ["CaseComments", "Comments on a case", [["PK", "CommentId", "bigint"], ["FK", "CaseId", "uniqueidentifier &rarr; Cases"], ["", "Text", "nvarchar(4000)"], ["", "Visibility", "tinyint"], ["FK", "AuthorUserId", "int &rarr; Users"], ["", "CreatedAt/By", "audit"]]],
  ["CaseAttachments", "Attachment metadata (binary in Blob)", [["PK", "AttachmentId", "uniqueidentifier"], ["FK", "CaseId", "uniqueidentifier &rarr; Cases"], ["", "FileName, ContentType, SizeBytes", "nvarchar, varchar, bigint"], ["", "BlobPath", "nvarchar(400)"], ["", "ScanStatus", "tinyint"], ["", "CreatedAt/By", "audit"]]],
  ["CaseHistory", "Append-only audit trail", [["PK", "HistoryId", "bigint"], ["FK", "CaseId", "uniqueidentifier &rarr; Cases"], ["", "ChangeType", "varchar(40)"], ["", "FieldName, OldValue, NewValue", "nvarchar"], ["FK", "ChangedByUserId", "int &rarr; Users"], ["", "ChangedAt", "datetime2(3)"], ["", "CorrelationId", "uniqueidentifier"]]],
  ["CaseAssignments", "Assignment trail", [["PK", "AssignmentId", "bigint"], ["FK", "CaseId", "uniqueidentifier &rarr; Cases"], ["FK", "AssignedToUserId", "int &rarr; Users"], ["FK", "AssignedByUserId", "int &rarr; Users"], ["", "Reason, Method (Manual/Auto)", "nvarchar, tinyint"], ["", "AssignedAt, EndedAt", "datetime2"]]],
  ["Notifications", "Outbound e-mail log", [["PK", "NotificationId", "bigint"], ["FK", "CaseId", "uniqueidentifier &rarr; Cases"], ["UQ", "MessageId", "uniqueidentifier"], ["", "Template, Recipient", "varchar, nvarchar"], ["", "Status, Attempts", "tinyint, int"], ["", "SentAt, LastError", "datetime2, nvarchar"]]],
  ["OutboxMessages", "Transactional outbox", [["PK", "OutboxId", "bigint"], ["", "MessageType", "varchar(60)"], ["", "Payload", "nvarchar(max)"], ["", "CorrelationId", "uniqueidentifier"], ["", "CreatedAt, PublishedAt", "datetime2"], ["", "Attempts", "int"]]],
  ["CaseCategories", "Reference: categories", [["PK", "CategoryId", "smallint"], ["", "Name, RequiredSkill", "nvarchar"], ["", "IsActive", "bit"], ["", "Audit fields", "Created/Modified"]]],
  ["CasePriorities", "Reference: priorities", [["PK", "PriorityId", "tinyint"], ["", "Name (Critical/High/Medium/Low)", "nvarchar"], ["", "SortOrder", "tinyint"]]],
  ["CaseStatuses", "Reference: statuses and transitions", [["PK", "StatusId", "tinyint"], ["", "Name", "nvarchar"], ["", "AllowedNext", "varchar(50)"], ["", "IsClosedState", "bit"]]],
  ["SlaPolicies", "SLA hours by priority", [["PK", "SlaPolicyId", "int"], ["FK", "PriorityId", "tinyint &rarr; CasePriorities"], ["", "Hours (4/8/24/72)", "int"], ["", "EffectiveFrom", "date"], ["", "Audit fields", "Created/Modified"]]]
];
var DBNOTES = [
  ["Cases", "Users (AssignedToUserId, CreatedBy)", "Many-to-one", "An agent has many cases; each case has at most one current assignee."],
  ["Cases", "Customers", "Many-to-one", "Local cache row keyed to CRM id."],
  ["CaseComments / CaseAttachments / CaseHistory / CaseAssignments / Notifications", "Cases", "Many-to-one", "Child rows cascade logically with soft delete; history never deleted."],
  ["Cases", "CaseCategories / CasePriorities / CaseStatuses", "Many-to-one", "Lookup tables cached in Redis (COMP-14)."],
  ["SlaPolicies", "CasePriorities", "Many-to-one", "Critical 4 h, High 8 h, Medium 24 h, Low 72 h."],
  ["Users", "Teams", "Many-to-one", "Team membership and lead."],
  ["OutboxMessages", "(none)", "Independent", "Written in the same transaction as the business change; published by COMP-26."]
];
var DBIDX = [
  ["IX_Cases_Status_Assignee", "cf.Cases(StatusId, AssignedToUserId) INCLUDE (CaseNumber, PriorityId, SlaDueAt) WHERE IsDeleted=0", "Dashboards and My Cases", "US-501"],
  ["IX_Cases_CustomerId", "cf.Cases(CustomerId)", "Customer history and original duplicate check", "US-101"],
  ["UX_Cases_ClientRequestId", "UNIQUE cf.Cases(ClientRequestId) WHERE NOT NULL", "Idempotent create (DEF-002)", "US-101"],
  ["IX_Cases_Customer_Category_Created", "cf.Cases(CustomerId, CategoryId, CreatedAt) INCLUDE (StatusId) WHERE IsDeleted=0", "Duplicate check EXISTS (v1.0.1, DEF-011)", "US-101"],
  ["IX_CaseHistory_CaseId_ChangedAt", "cf.CaseHistory(CaseId, ChangedAt)", "Timeline", "US-404"],
  ["IX_Cases_SlaDueAt", "cf.Cases(SlaDueAt) WHERE SlaState &lt; 3 AND IsDeleted=0", "SLA timer scan", "US-205"]
];
/* ===== SPRINTS ===== */
var SPRINTS = [
  { n: 0, name: "Discovery &amp; architecture", dates: "02 &ndash; 13 Feb 2026", goal: "Understand the business problem, agree scope, architecture and the initial backlog so Sprint 1 can start building.",
    feats: ["Discovery workshops (BA-012 and others)", "Architecture and ADR-001..007 (ARCH-004)", "Backlog creation and estimation (planning poker)", "Environment and network request (D4)"],
    deps: "Landing zone (A3), stakeholder availability, CRM/ERP/Identity teams named as dependencies D1&ndash;D3",
    manual: { dev: 230, test: 32, note: "262 h discovery effort: BA 90, Architect 60, DevOps 40, Backend 40, QA 32 (test strategy)" },
    deliv: ["Approved business requirements BR-001..006 and objectives OBJ-1..7", "Epic/Feature/Story backlog (6 / 15 / 33), 198 SP estimated", "Architecture blueprint, ADR-001..007, threat model v1", "Definition of Ready / Done, working agreement, test strategy", "Release plan and risk register R-01..R-08"],
    exit: ["Product Owner approves backlog for Sprints 1&ndash;2", "Architecture signed off by Design Authority", "Azure subscriptions and Azure DevOps project created", "Team ready: access, laptops, onboarding complete"] },
  { n: 1, name: "Foundation", dates: "16 &ndash; 27 Feb 2026", goal: "A walking skeleton: sign-in works, a pipeline deploys to DEV, telemetry flows, and reference data exists.",
    deps: "D3 Entra app registration and groups; D4 private endpoints; US-601 before every other story can deploy",
    deliv: ["Bicep-created DEV and QA environments", "PR build + release pipeline (DEV automatic)", "Entra ID sign-in with 5 roles; Angular shell with role-based menu", "Serilog + Application Insights with correlation id", "Reference-data maintenance (categories, priorities, SLA hours)"],
    exit: ["All Sprint 1 stories meet Definition of Done", "Pipeline green; DEV deployment without manual steps", "Sign-in demo with Agent and Compliance role", "Sprint Review accepted by Product Owner; velocity baseline set (26 SP)"] },
  { n: 2, name: "Core case management", dates: "02 &ndash; 13 Mar 2026", goal: "An agent can create, find, update, comment on and attach files to a case, with every change in history.",
    deps: "US-401 and US-106 (done in S1); IHistoryRecorder agreed between US-101 and US-403; Blob storage from US-601",
    deliv: ["Create, search, detail/update, comments, attachments", "Append-only case history (IHistoryRecorder)", "Idempotent create (DEF-002) and optimistic concurrency (DEF-003)", "QA automation: API + Playwright regression suite v1"],
    exit: ["No open Sev 1/2 defects in sprint scope (DEF-002, DEF-003 closed)", "Sprint Review 13 Mar accepted US-101..105, US-403", "Coverage &ge; 80% on new application code", "QA build #35 deployed and smoke tested"] },
  { n: 3, name: "Assignment &amp; workflow", dates: "16 &ndash; 27 Mar 2026", goal: "Cases flow to the right agent automatically and move through a controlled, SLA-tracked workflow.",
    deps: "US-101..103 (S2); SLA policy approved; Service Bus namespace; D1 CRM sandbox and D2 ERP contract due this sprint; CRM freeze 20&ndash;31 Mar (C6)",
    deliv: ["Manual and automatic assignment, reassign, escalate", "Workflow state machine and resolution codes", "SLA engine + timer Function (COMP-12)", "User/team administration", "Fix of DEF-001 (PR-340) and DEF-005 (Compliance comment)"],
    exit: ["Auto-assign demo: 100 simulated cases distributed by skill/workload", "SLA timer runs in QA for 5 days without error", "Workflow rules signed by Product Owner", "Regression suite green (DEF-001, DEF-005 closed)"] },
  { n: 4, name: "Notifications &amp; integrations", dates: "30 Mar &ndash; 10 Apr 2026", goal: "Asynchronous e-mails and the CRM and ERP integrations work reliably; PII and retention controls in place.",
    deps: "D1 CRM sandbox, D2 ERP contract; events from US-201/US-205; Easter 3&ndash;6 Apr reduces capacity so the sprint is planned at 32 SP",
    deliv: ["Notification Function with templates, retry, DLQ", "CRM adapter with circuit breaker (DEF-004)", "ERP sync Function with idempotency", "PII masking and retention job", "Search performance fix (DEF-006)"],
    exit: ["End-to-end e-mail within 2 min in QA", "Contract tests pass against CRM sandbox and ERP test API", "DLQ replay demonstrated", "No open Sev 1/2 (DEF-004, DEF-006 closed)"] },
  { n: 5, name: "Reporting &amp; dashboards", dates: "13 &ndash; 24 Apr 2026", goal: "Self-service dashboards, reports and export; legacy data migration dry runs under way.",
    deps: "Case, assignment and SLA data from S2&ndash;S4; Redis; migration needs US-304 (customer matching) and US-403 (history)",
    deliv: ["Agent and supervisor dashboards", "Three standard reports + Excel/CSV export", "History timeline and compliance audit search", "Migration pipeline with dry run 1", "UAT environment built; UAT scripts written"],
    exit: ["Dashboard counts reconcile with case list", "Migration dry run 1 reconciliation &ge; 99.5%", "UAT entry criteria met (RC1 built, test data ready)", "Product Owner accepts S5 stories; known issues listed"] },
  { n: 6, name: "Hardening &amp; production readiness", dates: "27 Apr &ndash; 08 May 2026", goal: "Prove performance, security and cut-over readiness; hand over to support. UAT runs 28&ndash;30 Apr alongside.",
    deps: "D5 pen-test slot; D6 ServiceNow integration; all functional stories complete; UAT feedback (CR-015 deferred)",
    deliv: ["Load test report at 600 users (TC-PERF-014)", "Pen-test findings fixed and retested", "Two cut-over rehearsals; rollback scripts", "Alerts ALR-01..ALR-11, runbooks KB-100..KB-112, training", "Release candidate rc3 (build 20260514.2)"],
    exit: ["BAC-1..BAC-7 evidenced", "No open Sev 1/2 defects (DEF-009 retested before 12 May)", "UAT sign-off UAT-SO-001 on 12 May", "Go/No-Go meeting approves CHG-2010"] }
];
var SPR_EXTRA = [
  { cls: "rel", t: "RC &amp; UAT freeze", d: "11 &ndash; 15 May", x: "rc3 promoted, CAB approval 13 May, Go/No-Go" },
  { cls: "rel", t: "Production Release", d: "Sat 16 May 22:00&ndash;02:00", x: "CHG-2010 &middot; v1.0.0 &middot; build 20260514.2" },
  { cls: "sup", t: "Hypercare", d: "17 &ndash; 30 May", x: "Daily stand-up, floor-walkers, INC-1038/1040/1042" },
  { cls: "sup", t: "Post-production support", d: "From 1 Jun 2026", x: "BAU L1/L2/L3, v1.0.2, INC-1051 (Aug), CHG-2044, CHG-2060" }
];

/* ===== SDLC TICKETS ===== */
/* [id, type, env, desc, pri, sev, owner, story, status, resolution] */
var TICKETS = [
  ["BA-012", "Business Analysis", "n/a", "Workshop: case creation fields and duplicate rules with agents from Leeds, Pune, Krakow.", "High", "&mdash;", "Business Analyst", "US-101", "Done", "Field list, duplicate definition (same customer + category + open + 24 h) and wireframe approved 19 Feb."],
  ["BA-019", "Business Analysis", "n/a", "Clarify SLA pause rules for Pending Customer status and business calendar.", "Medium", "&mdash;", "Business Analyst", "US-205", "Done", "Rule agreed with Operations: clock pauses; UK working-day calendar loaded."],
  ["ARCH-004", "Architecture", "n/a", "Decision: transactional outbox + Service Bus for notifications and ERP sync.", "High", "&mdash;", "Architect (Anna)", "US-301", "Done", "ADR-002 approved by Design Authority."],
  ["ARCH-007", "Architecture", "n/a", "Decide cache scope and technology (Redis for reference data and dashboards only).", "Medium", "&mdash;", "Architect (Anna)", "US-502", "Done", "ADR-007 accepted."],
  ["DEV-231", "Development", "DEV", "Implement POST /api/cases with validator, handler, outbox write and SLA calculation.", "High", "&mdash;", "Backend Dev (Priya)", "US-101", "Done", "Merged in PR-318 (6 Mar); follow-up PR-326, PR-331 for DEF-002."],
  ["DEV-267", "Development", "DEV", "CRM adapter with timeout, retry and circuit breaker.", "High", "&mdash;", "Backend Dev", "US-304", "Done", "Merged Sprint 4 after DEF-004; contract tests added."],
  ["DB-027", "Database", "DEV / QA", "Add ClientRequestId column and unique filtered index UX_Cases_ClientRequestId.", "High", "Sev 2", "DB Developer", "US-101", "Done", "Migration 20260312_AddClientRequestId applied to all environments by pipeline."],
  ["DB-052", "Database", "UAT / PROD", "Create IX_Cases_Customer_Category_Created for duplicate check (online build).", "Critical", "Sev 2", "DB Developer", "US-101", "Done", "Delivered in v1.0.1 (CHG-2031); duplicate-check reads 140k &rarr; 12."],
  ["OPS-045", "DevOps", "DEV / QA / UAT / PROD", "Create multi-stage release pipeline with approvals and Bicep deployment.", "Critical", "&mdash;", "DevOps Engineer", "US-601", "Done", "Pipeline live Sprint 1; QA nightly deploy at 02:00."],
  ["SEC-019", "Security", "UAT", "Penetration test finding: SAS download URL valid for 60 min and re-usable.", "High", "Sev 2", "Security Engineer", "US-105", "Done", "Reduced to 5 min, bound to user and IP range; retested clean."],
  ["SEC-031", "Security", "PROD", "Key Vault secrets without expiry reminders.", "Medium", "Sev 3", "Security Engineer", "US-606", "Done", "Expiry dates set; Event Grid alert ALR-12 added later via CHG-2044."],
  ["TST-088", "Testing", "QA", "Execute TC-101-01..08 and regression pack for US-101.", "High", "&mdash;", "QA Engineer (Meera)", "US-101", "Done", "Run 1 found DEF-001, DEF-002; final run 13 Mar: all pass."],
  ["TST-140", "Testing", "Perf / UAT", "Load test 600 concurrent users (TC-PERF-014).", "Critical", "Sev 2", "QA Engineer", "US-605", "Done", "p95 create 380 ms, search 640 ms. Gap noted: uniform data only (see PRB-0007)."],
  ["REL-010", "Deployment", "PROD", "Deploy v1.0.0 (1.0.0-rc3, build 20260514.2) to production.", "Critical", "&mdash;", "Release Manager", "All", "Done", "Deployed Sat 16 May 22:00&ndash;23:20; slot swap; smoke green; business validation Sun 17 May."],
  ["INC-1042", "Production", "PROD", "Case creation slow and timing out after bank holiday (P2).", "High", "Sev 2", "L2 Support (Sarah)", "US-101", "Closed", "Workaround: DuplicateCheck flag off (48 min). Fix v1.0.1 (CHG-2031). Closed 28 May 12:00."],
  ["SR-5011", "Support", "PROD", "Grant new Pune supervisor the Supervisor role (Entra group CF-Supervisors).", "Low", "&mdash;", "L1 / Identity", "US-401", "Closed", "Added to Entra group; role effective next sign-in."],
  ["CHG-2031", "Change Request", "PROD", "Emergency change: deploy v1.0.1 (query fix + index) for INC-1042.", "High", "&mdash;", "Release Manager", "US-101", "Closed", "Approved by emergency CAB 27 May 14:00; deployed 19:00&ndash;19:40; successful."],
  ["CR-015", "Change Request", "n/a", "Add 'contact channel' (phone/e-mail/web) to case form (raised in UAT by Krakow).", "Low", "&mdash;", "Product Owner", "US-101", "Deferred", "Deferred to Release 1.1 to protect go-live (risk R-03)."]
];

/* ===== DEFECTS ===== */
/* id, type, us, env, title, steps, exp, act, sev, pri, rc, fix, retest, rel, status */
var DEFECTS = [
  { id: "DEF-001", t: "UI", us: "US-101", env: "QA #31", title: "Whitespace-only description shows generic error",
    steps: "1) Open New case 2) Enter spaces in Description 3) Press Create", exp: "'Description is required' shown under the field", act: "Client validation passes; API returns 400; UI shows generic 'Something went wrong' toast",
    sev: 3, pri: 3, rc: "Frontend / Code &mdash; missing trim validator and ProblemDetails &rarr; field-error mapping", fix: "PR-340: trim validator, ErrorInterceptor maps errors to controls", retest: "Closed 20 Mar (TC-101-03 pass)", rel: "Sprint 3", status: "Closed" },
  { id: "DEF-002", t: "API", us: "US-101", env: "QA 20260306.3", title: "Double submit creates two cases",
    steps: "1) Fill New case 2) Double-click Create (or retry on timeout / two tabs)", exp: "Exactly one case (AC7)", act: "Two cases CF-2026-000041/42, two history rows, two outbox events",
    sev: 2, pri: 1, rc: "Code / Design &mdash; create endpoint not idempotent; UI-only guard in PR-326 insufficient (reopened)", fix: "PR-326 (UI) then PR-331 / commit 3d8e771: Idempotency-Key, Cases.ClientRequestId + unique filtered index", retest: "Reopened 11 Mar; Closed 13 Mar (100 parallel requests &rarr; 1 case)", rel: "Sprint 2", status: "Closed (reopened once)" },
  { id: "DEF-003", t: "Database", us: "US-103", env: "QA", title: "Concurrent edits silently overwrite each other",
    steps: "1) Two agents open the same case 2) Agent A saves 3) Agent B saves", exp: "Second save rejected with 409 and conflict dialog", act: "B's save overwrote A's change; no warning",
    sev: 2, pri: 2, rc: "Data design &mdash; update did not compare RowVersion", fix: "RowVersion concurrency token, If-Match header, 409 handling and Angular conflict dialog", retest: "Closed (TC-103-07 two-session test)", rel: "Sprint 2", status: "Closed" },
  { id: "DEF-004", t: "Integration", us: "US-304", env: "QA", title: "CRM timeout freezes case creation",
    steps: "1) Set CRM stub to delay 30 s 2) Search customer 3) Create case", exp: "Lookup fails fast (3 s), degraded message, API remains responsive", act: "Requests queue for 30 s, threads exhausted, other users slow",
    sev: 2, pri: 2, rc: "Code &mdash; no timeout, retry or circuit breaker on HttpClient", fix: "Polly: 3 s timeout, 2 retries, circuit breaker (5 failures/30 s), fallback message; contract + resilience tests", retest: "Closed (chaos test with delayed stub)", rel: "Sprint 4", status: "Closed" },
  { id: "DEF-005", t: "Authentication", us: "US-401", env: "QA", title: "Compliance role can post a comment",
    steps: "1) Sign in as Compliance 2) Open case 3) Add comment", exp: "Comment box hidden; API returns 403", act: "Comment accepted (API allowed any authenticated user)",
    sev: 2, pri: 2, rc: "Code &mdash; endpoint missing [Authorize(Policy=CanComment)]; UI relied on hiding only", fix: "Policy added to all write endpoints; role-matrix API test generated for every endpoint", retest: "Closed (role matrix test 14 endpoints &times; 5 roles)", rel: "Sprint 3", status: "Closed" },
  { id: "DEF-006", t: "Performance", us: "US-102", env: "QA perf (500k cases)", title: "Search p95 2.9 s with free-text term",
    steps: "1) Load 500,000 cases 2) Search customer name 'smith' with 20 users", exp: "p95 &lt; 800 ms (NFR-01)", act: "p95 2.9 s",
    sev: 2, pri: 2, rc: "Code / Index &mdash; LIKE '%term%' leading wildcard forced scan", fix: "Prefix search + customer index, Dapper query with covering index, optional full-text for notes", retest: "Closed: p95 410 ms", rel: "Sprint 4", status: "Closed" },
  { id: "DEF-007", t: "UI", us: "US-502", env: "UAT", title: "Chart legend overlaps on small screens",
    steps: "1) Open team dashboard on 1280&times;720", exp: "Legend wraps below chart", act: "Legend overlaps last bar",
    sev: 4, pri: 4, rc: "Frontend CSS", fix: "Planned for Release 1.1", retest: "Not retested &mdash; deferred", rel: "Known issue v1.0.0", status: "Deferred" },
  { id: "DEF-008", t: "UI", us: "US-504", env: "UAT", title: "Excel export shows times in UTC",
    steps: "1) Export report 2) Open XLSX", exp: "UK local times", act: "UTC times (1 hour behind in BST)",
    sev: 3, pri: 4, rc: "Code &mdash; no time-zone conversion", fix: "Workaround documented; fix in Release 1.1", retest: "Not retested &mdash; deferred", rel: "Known issue v1.0.0", status: "Deferred" },
  { id: "DEF-009", t: "Integration", us: "US-305", env: "UAT", title: "Duplicate ERP adjustment on message redelivery",
    steps: "1) Close case with credit 2) Force Function restart mid-processing 3) Message redelivered", exp: "One ERP adjustment", act: "Two adjustments posted for the same case",
    sev: 2, pri: 1, rc: "Code &mdash; idempotency rule from DEF-002 not applied to ERP call", fix: "ErpAdjustments unique (CaseId, AdjustmentRef) + ERP idempotency key; DLQ replay test", retest: "Closed 12 May (before UAT sign-off)", rel: "UAT / rc3", status: "Closed" },
  { id: "DEF-010", t: "UI", us: "US-106", env: "UAT", title: "Category list not sorted alphabetically",
    steps: "1) Open New case 2) Open category dropdown", exp: "Alphabetical", act: "Insertion order",
    sev: 4, pri: 4, rc: "Code &mdash; no ORDER BY in reference query", fix: "Release 1.1", retest: "Not retested &mdash; deferred", rel: "Known issue v1.0.0", status: "Deferred" },
  { id: "DEF-011", t: "Production", us: "US-101", env: "PROD", title: "Duplicate-check COUNT scan makes create slow for large accounts",
    steps: "1) Create case for a housing-association customer with 3,000 cases at peak", exp: "p95 &lt; 500 ms", act: "p95 6.8 s, 4% timeouts (INC-1042)",
    sev: 2, pri: 1, rc: "Code + test-data gap &mdash; Count()&gt;0 instead of Any(); no composite index; uniform perf data", fix: "Commit e51c9a8 (PR-402/403): AnyAsync + IX_Cases_Customer_Category_Created; skewed-data perf test added", retest: "Closed 28 May (prod p95 55 ms)", rel: "v1.0.1 (hotfix build 20260527.2)", status: "Closed" },
  { id: "DEF-012", t: "Production", us: "US-502", env: "PROD", title: "'Breached today' uses UTC day instead of UK local day",
    steps: "1) At 00:30 BST open supervisor dashboard in Leeds", exp: "Count equals SLA report for today (UK)", act: "Dashboard misses cases breached between 00:00 and 01:00 BST (INC-1040)",
    sev: 3, pri: 3, rc: "Code &mdash; date boundary computed in UTC", fix: "Europe/London day boundary in dashboard query; regression test around DST", retest: "Closed (retest in UAT with BST data)", rel: "v1.0.2 (Sat 6 Jun)", status: "Closed" }
];

/* ===== PRODUCTION RECORDS (12) ===== */
var PROD = [
  ["INC-1038", "Incident", "P4", "Tue 19 May 2026", "Typo 'assigend' in assignment e-mail template", "US-301", "Closed"],
  ["INC-1040", "Incident", "P3", "Thu 21 May 2026", "Leeds dashboard 'breached today' differs from SLA report", "US-502", "Closed"],
  ["INC-1042", "Incident", "P2", "Tue 26 May 2026", "Case creation slow / timing out at peak", "US-101", "Closed"],
  ["INC-1051", "Incident", "P1", "Mon 17 Aug 2026", "Case creation blocked: CRM client secret expired", "US-304", "Closed"],
  ["SR-5011", "Service Request", "P4", "Wed 3 Jun 2026", "Grant Supervisor role to new Pune supervisor", "US-401", "Closed"],
  ["SR-5020", "Service Request", "P3", "Fri 12 Jun 2026", "Replay 14 dead-lettered notification messages", "US-301", "Closed"],
  ["PRB-0007", "Problem", "P2", "Tue 26 May 2026", "Root cause of slow case creation (INC-1042)", "US-101", "Closed 5 Jun"],
  ["PRB-0008", "Problem", "P1", "Mon 17 Aug 2026", "Root cause of expired CRM secret (INC-1051)", "US-304", "Closed 4 Sep"],
  ["CHG-2010", "Change (Normal)", "&mdash;", "Sat 16 May 2026", "Go-live release v1.0.0", "All", "Closed"],
  ["CHG-2031", "Change (Emergency)", "&mdash;", "Wed 27 May 2026", "Deploy v1.0.1 index + query fix", "US-101", "Closed"],
  ["CHG-2044", "Change (Normal)", "&mdash;", "Wed 2 Sep 2026", "CRM certificate auth, ALR-12 secret-expiry alert, CrmDegradedMode flag", "US-304", "Closed"],
  ["CHG-2060", "Change (Standard)", "&mdash;", "Wed 30 Sep 2026", "Decommission legacy CaseTracker", "OBJ-7", "Closed"]
];

/* ===== P1-P4 INCIDENT EXAMPLES ===== */
var INCS = [
  { id: "INC-1051", p: 1, title: "Case creation blocked: CRM client secret expired", when: "Mon 17 Aug 2026 08:05", story: "US-304", alert: "ALR-10 (business transaction) + ALR-02",
    triage: "L1 receives 6 calls in 5 min; ALR-10 fires at 08:05; auto P1 because create is down for all users (450 agents, Monday peak).",
    sev: "P1: critical function unavailable for all users. Respond 15 min (met: 5), restore 4 h (met: 50 min).",
    assign: "L2 on-call (Sarah) &rarr; Major Incident Manager; L3 Priya joins bridge at 08:20.",
    inv: "App Insights: dependency CRM &rarr; 401 invalid_client in every request; deployments none. Key Vault: secret crm-client-secret expired 17 Aug 00:00 (90-day, issued 19 May).",
    fix: "Workaround: new secret issued by CRM team, set in Key Vault (new version), App Service restart 08:55. CrmDegradedMode (manual customer entry) was not yet available.",
    val: "Create success 100% by 09:00; 50 test cases by super-users; no data loss. Closed Wed 19 Aug after 2 days monitoring.",
    close: "PRB-0008 raised (no expiry alert, secret-based auth). CHG-2044 (Sep): certificate authentication, ALR-12 Key Vault expiry alert, CrmDegradedMode flag. KB-114 updated." },
  { id: "INC-1042", p: 2, title: "Case creation slow and timing out", when: "Tue 26 May 2026 09:20", story: "US-101", alert: "ALR-03",
    triage: "Alert creates P3; L2 sees p95 6.8 s and 110 agents affected; raised to P2 at 09:30.",
    sev: "P2: key function degraded, workaround possible. Respond 30 min (met: 10), restore 8 h (met: 48 min).",
    assign: "L1 &rarr; L2 (Sarah) &rarr; L3 (Priya) at 09:55; Major Incident Manager joins.",
    inv: "Transaction view: SQL 6.1 s; Query Store: HasOpenDuplicateAsync 140,000 reads; large housing-association accounts.",
    fix: "Workaround: feature flag DuplicateCheck=off (KB-107) at 10:05. Permanent: DEF-011 fix v1.0.1 via CHG-2031.",
    val: "p95 380 ms after flag; after v1.0.1 p95 55 ms with flag on. Business confirms.",
    close: "Closed Thu 28 May 12:00; PRB-0007 closed 5 Jun; KB-113 created; skewed-data perf test and review checklist item added." },
  { id: "INC-1040", p: 3, title: "Leeds dashboard count differs from SLA report", when: "Thu 21 May 2026 10:40", story: "US-502 / US-503", alert: "User call (no alert)",
    triage: "Leeds supervisor raised via Service Desk: 'Breached today = 7 on dashboard, 9 in report'. Single team, workaround exists.",
    sev: "P3: minor function, one team, workaround. Respond 4 h (met: 1 h), resolve 3 working days.",
    assign: "L1 &rarr; L2 &rarr; L3 (Kavya, reporting).",
    inv: "KQL + SQL: dashboard uses UTC day, report uses Europe/London; difference appears 00:00&ndash;01:00 BST.",
    fix: "Workaround: use the SLA report for the official figure (KB-109). Fix DEF-012 in v1.0.2.",
    val: "UAT retest with BST data; production comparison after release.",
    close: "Closed Sat 6 Jun after v1.0.2; user confirmed." },
  { id: "INC-1038", p: 4, title: "Typo 'assigend' in assignment e-mail", when: "Tue 19 May 2026 11:15", story: "US-301", alert: "User feedback",
    triage: "Agent reports typo; cosmetic, no impact. P4.",
    sev: "P4: cosmetic. Respond 1 day (met same day).",
    assign: "L1 &rarr; L2 (template owner).",
    inv: "Template AssignmentEmail v3 in App Configuration contains the typo.",
    fix: "Template corrected as a configuration change (standard change, no deployment); cache refresh.",
    val: "Test assignment e-mail checked by L2.",
    close: "Closed 19 May 15:30; no problem record needed." }
];
/* ===== GLOSSARY ===== */
/* [term, group, definition, CaseFlow example, badge class] */
var GLOSS = [
  ["Epic", "Work items", "A large body of work that delivers a business capability and spans several sprints. Contains Features.", "EPIC-001 Customer Case Management (34 SP, Sprints 1&ndash;2).", "b-epic"],
  ["Feature", "Work items", "A deliverable capability of an Epic that can be demonstrated to the business; contains User Stories.", "FEAT-101 Case Creation (US-101, US-106).", "b-feat"],
  ["User Story", "Work items", "A small, testable requirement from the user's point of view: As a / I want / So that. Fits in one sprint.", "US-101 Create customer case (5 SP).", "b-story"],
  ["Task", "Work items", "A unit of engineering work for a story, estimated in hours and done by one person (code, test, review, deploy config).", "TSK-101-03 POST /api/cases controller and handler, 8 h.", "b-task"],
  ["Bug", "Work items", "The Azure Boards work-item type used to record something that does not work as designed; usually found before release.", "Bug DEF-001 linked to US-101 and TC-101-03.", "b-bug"],
  ["Defect", "Work items", "A deviation from the expected behaviour or requirement found by testing or users. Has severity (impact) and priority (order).", "DEF-002 double submit creates two cases (Sev 2).", "b-bug"],
  ["Story Point", "Planning", "A relative measure of effort, complexity and uncertainty (Fibonacci scale). Used with velocity to forecast, not to measure people.", "US-102 Search = 8 SP; US-104 Comments = 3 SP; release = 198 SP.", "b-story"],
  ["Sprint", "Planning", "A fixed two-week time-box in Scrum that produces a potentially releasable increment.", "Sprint 2: 2&ndash;13 Mar 2026, 37 SP delivered.", "b-blue"],
  ["Backlog", "Planning", "The ordered list of everything that may be needed. Product backlog = whole product; sprint backlog = items chosen for the sprint.", "198 SP of stories ordered by the Product Owner; CR-015 sits in the Release 1.1 backlog.", "b-blue"],
  ["Acceptance Criteria", "Quality gates", "Specific, testable conditions a story must meet to be accepted by the Product Owner.", "AC7: submitting the same request twice creates exactly one case.", "b-story"],
  ["Definition of Ready", "Quality gates", "Team checklist a story must satisfy before entering a sprint (clear AC, estimated, dependencies known).", "US-101 was ready: wireframe approved, API contract drafted, US-401 and US-106 done.", "b-green"],
  ["Definition of Done", "Quality gates", "Team-wide checklist for finished work (reviewed, tested, deployed to QA, documented, accepted).", "PR with 2 approvals, coverage &ge; 80%, no open Sev 1/2, double-submit tested (added after DEF-002).", "b-green"],
  ["UAT", "Quality gates", "User Acceptance Testing: real business users confirm the system supports their work before release.", "UAT-C01 &ldquo;Create a case&rdquo;, 9 testers, 28&ndash;30 Apr; overall sign-off UAT-SO-001 on 12 May.", "b-green"],
  ["Incident", "Operations", "An unplanned interruption or degradation of a live service. Goal: restore service quickly.", "INC-1042 P2 case creation slow, workaround in 48 minutes.", "b-inc"],
  ["Problem", "Operations", "The underlying cause of one or more incidents. Investigated to prevent recurrence.", "PRB-0007 duplicate-check query scans too many rows.", "b-inc"],
  ["Change Request", "Operations", "A formal request to modify production, classified standard, normal or emergency and approved by CAB.", "CHG-2010 go-live; CHG-2031 emergency hotfix; CR-015 is a scope change request.", "b-epic"],
  ["SLA", "Operations", "Service Level Agreement: committed response/resolve times. In CaseFlow also the per-case deadline (Critical 4 h &hellip; Low 72 h) and the support targets for P1&ndash;P4.", "P1 respond 15 min, resolve 4 h; High-priority case SLA 8 h.", "b-dark"],
  ["RCA", "Operations", "Root Cause Analysis: structured investigation (e.g. five whys) to find why a failure happened and how to prevent it.", "PRB-0007 RCA: COUNT instead of EXISTS, missing index, uniform test data.", "b-dark"],
  ["Hotfix", "Operations", "An urgent, minimal production fix released outside the normal cadence, usually under an emergency change.", "v1.0.1 (build 20260527.2) via CHG-2031.", "b-epic"],
  ["Rollback", "Operations", "Returning production to the previous known-good version when a release fails (slot swap back, config revert, DB restore decision).", "CHG-2010 rollback plan: swap slots back within 15 min; DB changes backward compatible.", "b-dark"],
  ["Hypercare", "Operations", "A short, intensive support period after go-live with developers on call, daily stand-ups and floor-walkers.", "17&ndash;30 May 2026; INC-1038/1040/1042 handled; exit approved 30 May.", "b-green"]
];

/* ===== DERIVED MODEL ===== */
var ST = by(STORIES, function (s) { return s.id; });
var FT = by(FEATS, function (f) { return f.id; });
var EP = by(EPICS, function (e) { return e.id; });
var CMP = {}; COMPS.forEach(function (c) { CMP[c[0]] = c; });
function cid(n) { return "COMP-" + pad(n); }
var TOTAL_SP = sum(STORIES, function (s) { return s.sp; });
STORIES.forEach(function (s) {
  s.tasks2 = TASKS.filter(function (t) { return t.us === s.id; });
  s.hrs = sum(s.tasks2, function (t) { return t.h; });
  s.defs = DEFECTS.filter(function (d) { return d.us === s.id; });
  s.epic = FT[s.ft].ep;
});
FEATS.forEach(function (f) {
  f.stories = STORIES.filter(function (s) { return s.ft === f.id; });
  f.sp = sum(f.stories, function (s) { return s.sp; });
  f.hrs = sum(f.stories, function (s) { return s.hrs; });
});
EPICS.forEach(function (e) {
  e.feats = FEATS.filter(function (f) { return f.ep === e.id; });
  e.stories = STORIES.filter(function (s) { return s.epic === e.id; });
  e.sp = sum(e.stories, function (s) { return s.sp; });
  e.hrs = sum(e.stories, function (s) { return s.hrs; });
});
COMPS.forEach(function (c) {
  c.stories = STORIES.filter(function (s) { return s.comps.indexOf(c[0]) >= 0; }).map(function (s) { return s.id; });
});
SPRINTS.forEach(function (sp) {
  sp.stories = STORIES.filter(function (s) { return s.s === sp.n; });
  sp.sp = sum(sp.stories, function (s) { return s.sp; });
  var tk = TASKS.filter(function (t) { return ST[t.us].s === sp.n; });
  sp.tasks = tk.length;
  sp.testH = sum(tk.filter(function (t) { return t.r === "QA Engineer"; }), function (t) { return t.h; });
  sp.devH = sum(tk.filter(function (t) { return t.r !== "QA Engineer"; }), function (t) { return t.h; });
  if (sp.manual) { sp.devH = sp.manual.dev; sp.testH = sp.manual.test; }
  sp.hrs = sp.devH + sp.testH;
  sp.epics = []; sp.stories.forEach(function (s) { if (sp.epics.indexOf(s.epic) < 0) { sp.epics.push(s.epic); } });
  sp.ftrs = []; sp.stories.forEach(function (s) { if (sp.ftrs.indexOf(s.ft) < 0) { sp.ftrs.push(s.ft); } });
});
var VELOCITY = [26, 37, 37, 32, 34, 32];
var CAP = 396;
var TOTAL_H = sum(TASKS, function (t) { return t.h; });
function dayOf(h) { return r1(h / 6); }
function dsr(a, cls) { return a.map(function (x) { return '<span class="chip ' + (cls || "") + '">' + x + '</span>'; }).join(" "); }
function dor(s) {
  return ["Story written in As a / I want / So that form and understood by the team", "Acceptance criteria agreed with the Product Owner", "Estimated by planning poker (" + s.sp + " SP; no story &gt; 8)",
    "Dependencies identified: " + (s.dep.length ? s.dep.join(", ") : "none"), "UI wireframe / API contract available where relevant", "Test data and environment available"];
}
function dod(s) {
  var a = ["Code merged by PR with 2 approvals and linked work items", "Unit tests pass; coverage &ge; 80% on new code; Sonar quality gate green", "API/UI tests automated for each acceptance criterion; no open Sev 1/2 defects",
    "Logging with correlation id, error handling and authorisation verified", "Deployed to QA with smoke test passed; OpenAPI/runbook updated", "Product Owner accepts in Sprint Review"];
  return a;
}
console.log("tasks",TASKS.length,"hours",TOTAL_H,"SP",TOTAL_SP);EPICS.forEach(function(e){console.log(e.id,e.sp,e.hrs,e.stories.length)});SPRINTS.forEach(function(s){console.log("S"+s.n,s.sp,s.tasks,s.devH,s.testH)});console.log(TASKS.filter(function(t){return t.us=="US-101"}).reduce(function(a,t){return a+t.h},0));console.log(COMPS.reduce(function(a,c){return a+c[6]},0)); COMPS.forEach(function(c){if(!c.stories.length)console.log("nostory",c[0])})
