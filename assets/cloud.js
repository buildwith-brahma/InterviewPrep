/* Labs for the Cloud Fundamentals guide:
   - composite SLA / availability calculator
   - monthly cost estimator (on-demand vs reserved vs spot, storage, egress)
   - Azure <-> AWS service finder
   Pure logic is exported for Node testing. */
(function (root) {
  'use strict';
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); };
  var num = function (v) { var n = parseFloat(v); return isNaN(n) ? 0 : n; };

  /* ============================ SLA ============================ */
  // serial: all must be up -> multiply. parallel (redundant): at least one up -> 1 - prod(1 - a)
  function serial(list) { return list.reduce(function (p, a) { return p * a; }, 1); }
  function parallel(list) { return 1 - list.reduce(function (p, a) { return p * (1 - a); }, 1); }
  function downtime(avail) {
    var min = (1 - avail) * 365 * 24 * 60;
    return { perYearMin: min, perMonthMin: min / 12 };
  }
  function fmtMin(m) { if (m >= 120) return (m / 60).toFixed(1) + ' hours'; if (m >= 1) return m.toFixed(1) + ' min'; return (m * 60).toFixed(0) + ' sec'; }
  function renderSla(host) {
    host.innerHTML = '<h4>Lab: composite SLA calculator</h4><p>Dependencies in <b>series</b> multiply (every one must work), so the whole is <i>less</i> available than the weakest link. <b>Redundant</b> copies in parallel improve availability: P(all fail) = product of (1 - a). Enter percentages.</p>' +
      '<div class="row"><label>Front door / gateway % <input id="sl-a" type="number" step="any" value="99.99" style="width:80px"></label><label>App service % <input id="sl-b" type="number" step="any" value="99.95" style="width:80px"></label><label>Database % <input id="sl-c" type="number" step="any" value="99.99" style="width:80px"></label><label>Third-party API % <input id="sl-d" type="number" step="any" value="99.9" style="width:80px"></label></div>' +
      '<div class="row"><label>Deploy the app in <select id="sl-n"><option value="1">1 instance/zone</option><option value="2" selected>2 zones</option><option value="3">3 zones</option></select></label><label><input id="sl-ind" type="checkbox" checked> zones fail independently</label></div><div class="out" id="sl-out"></div>';
    function run() {
      var a = num($('#sl-a', host).value) / 100, b = num($('#sl-b', host).value) / 100, c = num($('#sl-c', host).value) / 100, d = num($('#sl-d', host).value) / 100, n = +$('#sl-n', host).value;
      var app = $('#sl-ind', host).checked ? parallel(new Array(n).fill(b)) : b;
      var single = serial([a, b, c, d]), redundant = serial([a, app, c, d]);
      var f = function (x) { return (x * 100).toFixed(4) + '%  (~' + fmtMin(downtime(x).perMonthMin) + ' down per month)'; };
      $('#sl-out', host).textContent = 'Single app instance, all in series: ' + f(single) + '\nWith ' + n + ' independent app copies  : ' + f(redundant) + '\n  (app tier alone becomes ' + (app * 100).toFixed(6) + '%)\n\nThe composite is never higher than the weakest dependency (' + (Math.min(a, b, c, d) * 100).toFixed(2) + '%).\nRedundancy only helps the tier it is applied to: here the database and the third-party API now dominate the downtime.\nSLA is a financial credit promise, not a guarantee; design for failure and test it.';
    }
    $$('input,select', host).forEach(function (el) { el.addEventListener('input', run); el.addEventListener('change', run); }); run();
  }

  /* ============================ Cost ============================ */
  // Illustrative pay-as-you-go style numbers (NOT real price lists).
  var RATES = { vmHour: 0.096, reservedDisc: 0.40, spotDisc: 0.70, storageGbMonth: 0.023, egressGb: 0.087, freeEgressGb: 100, hoursMonth: 730 };
  function cost(o) {
    var r = RATES, vmOn = o.vms * o.hoursPerDay * (r.hoursMonth / 24) * r.vmHour * o.size;
    var always = o.vms * r.hoursMonth * r.vmHour * o.size;
    var storage = o.storageGb * r.storageGbMonth, egress = Math.max(0, o.egressGb - r.freeEgressGb) * r.egressGb;
    return { onDemand: vmOn, reserved: always * (1 - r.reservedDisc), spot: vmOn * (1 - r.spotDisc), always: always, storage: storage, egress: egress, totalOnDemand: vmOn + storage + egress, totalReserved: always * (1 - r.reservedDisc) + storage + egress, totalSpot: vmOn * (1 - r.spotDisc) + storage + egress };
  }
  function renderCost(host) {
    host.innerHTML = '<h4>Lab: monthly cost estimator (illustrative rates)</h4><p>Not a real price list: it shows how <b>usage patterns</b> drive the bill. On-demand is flexible; a commitment (reserved instance / savings plan) is cheaper only for steady 24x7 load; spot is cheapest but can be evicted. Data leaving the cloud (egress) is charged; most inbound traffic is free.</p>' +
      '<div class="row"><label>VM count <input id="co-v" type="number" value="4" style="width:60px"></label><label>Size multiplier (1 = 2 vCPU) <input id="co-s" type="number" step="any" value="2" style="width:60px"></label><label>Hours/day running <input id="co-h" type="number" value="10" style="width:60px"></label><label>Storage GB <input id="co-g" type="number" value="500" style="width:80px"></label><label>Egress GB/month <input id="co-e" type="number" value="800" style="width:80px"></label></div><div class="out" id="co-out"></div>';
    function run() {
      var c = cost({ vms: num($('#co-v', host).value), size: num($('#co-s', host).value), hoursPerDay: Math.min(24, num($('#co-h', host).value)), storageGb: num($('#co-g', host).value), egressGb: num($('#co-e', host).value) });
      var m = function (x) { return ('$' + x.toFixed(0)).padStart(7); };
      $('#co-out', host).textContent = 'Compute (VM)            On-demand (hours/day) : ' + m(c.onDemand) + '\n                         Reserved (24x7, -40%) : ' + m(c.reserved) + '\n                         Spot (hours/day, -70%): ' + m(c.spot) + '\nStorage                                        : ' + m(c.storage) + '\nEgress (first ' + RATES.freeEgressGb + ' GB free)                  : ' + m(c.egress) + '\n\nTotal, on-demand : ' + m(c.totalOnDemand) + '\nTotal, reserved  : ' + m(c.totalReserved) + '\nTotal, spot      : ' + m(c.totalSpot) + '\n\n' + (c.reserved < c.onDemand ? 'Running 24x7 makes the commitment cheaper than on-demand.' : 'With part-time usage, on-demand beats a 24x7 commitment: shut dev/test down at night, or autoscale.') + '\nCost levers: right-size, schedule off-hours, autoscale, reserved/savings plans for baseline, spot for batch, lifecycle storage tiers, keep traffic in-region, tag everything and set budgets/alerts.';
    }
    $$('input', host).forEach(function (el) { el.addEventListener('input', run); }); run();
  }

  /* ============================ Service finder ============================ */
  var MAP = [
    ['Virtual machines', 'Azure Virtual Machines', 'Amazon EC2', 'IaaS', 'Full OS control, lift-and-shift'],
    ['Managed web apps', 'Azure App Service', 'AWS Elastic Beanstalk / App Runner', 'PaaS', 'Deploy code, platform runs it'],
    ['Serverless functions', 'Azure Functions', 'AWS Lambda', 'FaaS', 'Event-driven code, pay per execution'],
    ['Containers (managed K8s)', 'Azure Kubernetes Service (AKS)', 'Amazon EKS', 'Containers', 'Orchestrate containers'],
    ['Containers (simple)', 'Azure Container Apps / ACI', 'AWS ECS Fargate', 'Containers', 'Run containers without managing nodes'],
    ['Object storage', 'Azure Blob Storage', 'Amazon S3', 'Storage', 'Files, images, backups, static sites'],
    ['Block storage', 'Azure Managed Disks', 'Amazon EBS', 'Storage', 'Disks attached to VMs'],
    ['File shares', 'Azure Files', 'Amazon EFS / FSx', 'Storage', 'SMB/NFS shares'],
    ['Managed SQL database', 'Azure SQL Database', 'Amazon RDS / Aurora', 'Database', 'Relational, managed patching and backups'],
    ['NoSQL document / key-value', 'Azure Cosmos DB', 'Amazon DynamoDB', 'Database', 'Global scale, low-latency'],
    ['In-memory cache', 'Azure Cache for Redis', 'Amazon ElastiCache', 'Database', 'Caching, sessions'],
    ['Virtual network', 'Azure Virtual Network (VNet)', 'Amazon VPC', 'Networking', 'Private network, subnets'],
    ['Load balancer (L7)', 'Application Gateway / Front Door', 'ALB / CloudFront', 'Networking', 'HTTP routing, TLS, WAF'],
    ['Load balancer (L4)', 'Azure Load Balancer', 'Network Load Balancer', 'Networking', 'TCP/UDP balancing'],
    ['DNS', 'Azure DNS', 'Amazon Route 53', 'Networking', 'Name resolution, health routing'],
    ['CDN', 'Azure Front Door / CDN', 'Amazon CloudFront', 'Networking', 'Edge caching'],
    ['Identity', 'Microsoft Entra ID', 'AWS IAM / IAM Identity Center / Cognito', 'Security', 'Users, roles, SSO'],
    ['Secrets and keys', 'Azure Key Vault', 'AWS Secrets Manager / KMS', 'Security', 'Secrets, certificates, keys'],
    ['Web application firewall', 'Azure WAF', 'AWS WAF', 'Security', 'Block OWASP-style attacks'],
    ['Message queue', 'Azure Service Bus / Storage Queues', 'Amazon SQS', 'Messaging', 'Decouple services'],
    ['Pub/sub events', 'Azure Event Grid', 'Amazon SNS / EventBridge', 'Messaging', 'Fan-out events'],
    ['Streaming', 'Azure Event Hubs', 'Amazon Kinesis / MSK', 'Messaging', 'High-volume event streams'],
    ['Monitoring', 'Azure Monitor / Application Insights', 'Amazon CloudWatch / X-Ray', 'Operations', 'Metrics, logs, traces, alerts'],
    ['Infrastructure as code', 'Bicep / ARM', 'CloudFormation / CDK', 'Operations', 'Declarative environments (Terraform works on both)'],
    ['CI/CD', 'Azure DevOps / GitHub Actions', 'CodePipeline / CodeBuild / GitHub Actions', 'Operations', 'Build and release pipelines'],
    ['Data warehouse', 'Azure Synapse / Fabric', 'Amazon Redshift', 'Analytics', 'Large-scale analytics'],
    ['API management', 'Azure API Management', 'Amazon API Gateway', 'Integration', 'Publish, secure, throttle APIs'],
    ['Container registry', 'Azure Container Registry', 'Amazon ECR', 'Containers', 'Store images']
  ];
  function find(q, cat) {
    q = (q || '').toLowerCase();
    return MAP.filter(function (r) { return (!cat || cat === 'All' || r[3] === cat) && (!q || r.join(' ').toLowerCase().indexOf(q) >= 0); });
  }
  function renderFinder(host) {
    var cats = ['All'].concat(MAP.map(function (r) { return r[3]; }).filter(function (v, i, a) { return a.indexOf(v) === i; }));
    host.innerHTML = '<h4>Lab: Azure &harr; AWS service finder</h4><p>Type a capability or a product name ("queue", "Lambda", "Key Vault") to see the equivalents.</p>' +
      '<div class="row"><label>Search <input id="sf-q" style="width:200px" placeholder="e.g. storage, lambda"></label><label>Category <select id="sf-c">' + cats.map(function (c) { return '<option>' + c + '</option>'; }).join('') + '</select></label></div><div id="sf-t"></div>';
    function run() {
      var rows = find($('#sf-q', host).value, $('#sf-c', host).value);
      $('#sf-t', host).innerHTML = '<div class="tblwrap"><table><tr><th>Capability</th><th>Azure</th><th>AWS</th><th>Model</th><th>Use</th></tr>' + rows.map(function (r) { return '<tr><td>' + esc(r[0]) + '</td><td>' + esc(r[1]) + '</td><td>' + esc(r[2]) + '</td><td>' + esc(r[3]) + '</td><td>' + esc(r[4]) + '</td></tr>'; }).join('') + '</table></div><small>' + rows.length + ' of ' + MAP.length + ' services</small>';
    }
    $('#sf-q', host).oninput = run; $('#sf-c', host).onchange = run; run();
  }

  var LABS = { 'sla-lab': renderSla, 'cost-lab': renderCost, 'svc-lab': renderFinder };
  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', function () {
      Object.keys(LABS).forEach(function (id) { var el = document.getElementById(id); if (el) LABS[id](el); });
    });
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = { serial: serial, parallel: parallel, downtime: downtime, cost: cost, find: find, MAP: MAP };
})(typeof window !== 'undefined' ? window : globalThis);
