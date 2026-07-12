import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const mod = await import(pathToFileURL('C:/Users/user/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@oai/artifact-tool/dist/artifact_tool.mjs').href);
const { Presentation, PresentationFile } = mod;

const OUT_DIR = 'C:/Users/user/Documents/00 CIPAA contract work dairy/QS-WFUI/outputs/manual-20260708-lados-product/presentations/lados-product-presentation/output';
const PREVIEW_DIR = 'C:/Users/user/Documents/00 CIPAA contract work dairy/QS-WFUI/outputs/manual-20260708-lados-product/presentations/lados-master-layout/preview';
const FINAL = `${OUT_DIR}/lados-product-presentation-master-layout.pptx`;
const W = 1280;
const H = 720;
const C = {
  bg: '#090B10', panel: '#111827', panel2: '#172033', line: '#2B3448',
  text: '#F4F7FB', muted: '#A8B3C7', dim: '#657089',
  cyan: '#4DD8FF', copper: '#FFB86B', green: '#6EE7B7', red: '#FF6B6B', violet: '#BFA7FF',
  clear: '#00000000',
};

function shape(container, { x, y, w, h, fill = C.clear, line = C.clear, lw = 0, geometry = 'rect' }) {
  return container.shapes.add({
    geometry,
    position: { left: x, top: y, width: w, height: h },
    fill,
    line: { fill: line, width: lw },
  });
}

function text(container, value, { x, y, w, h, size = 18, color = C.text, bold = false, align = 'left', valign = 'top', face = 'Aptos' }) {
  const s = shape(container, { x, y, w, h });
  s.text = value;
  s.text.fontSize = size;
  s.text.color = color;
  s.text.bold = bold;
  s.text.alignment = align;
  s.text.verticalAlignment = valign;
  s.text.typeface = face;
  s.text.insets = { left: 0, right: 0, top: 0, bottom: 0 };
  return s;
}

function box(slide, { x, y, w, h, label, body, color = C.cyan, fill = C.panel }) {
  shape(slide, { x, y, w, h, fill, line: color, lw: 1 });
  shape(slide, { x, y, w: 5, h, fill: color });
  text(slide, label, { x: x + 20, y: y + 15, w: w - 36, h: 24, size: 16, bold: true, face: 'Aptos Display' });
  if (body) text(slide, body, { x: x + 20, y: y + 44, w: w - 36, h: h - 54, size: 13, color: C.muted });
}

function kicker(slide, label) {
  shape(slide, { x: 64, y: 54, w: 42, h: 3, fill: C.cyan });
  text(slide, label.toUpperCase(), { x: 116, y: 43, w: 360, h: 24, size: 12, color: C.muted, bold: true, valign: 'mid', face: 'Aptos Mono' });
}

function title(slide, value, opts = {}) {
  text(slide, value, { x: opts.x ?? 64, y: opts.y ?? 88, w: opts.w ?? 760, h: opts.h ?? 118, size: opts.size ?? 42, bold: true, face: 'Aptos Display' });
}

function page(slide, n) {
  text(slide, String(n).padStart(2, '0'), { x: 1186, y: 670, w: 40, h: 20, size: 11, color: C.dim, align: 'right', face: 'Aptos Mono' });
}

function setLayout(slide, layout) {
  slide.setLayout(layout);
}

const p = Presentation.create({ slideSize: { width: W, height: H } });
const master = p.masters.add({ name: 'Lados Dark Master' });
shape(master, { x: 0, y: 0, w: W, h: H, fill: C.bg });
shape(master, { x: 64, y: 680, w: 760, h: 1, fill: C.line });
text(master, 'Source: project docs, Graphify findings, and inspected repo structure', {
  x: 66, y: 684, w: 760, h: 14, size: 10, color: C.dim, face: 'Aptos',
});

const contentLayout = p.layouts.add({ name: 'Lados Content Layout' });
contentLayout.setParentLayoutId(master.id);
shape(contentLayout, { x: 0, y: 0, w: W, h: H, fill: C.bg });
shape(contentLayout, { x: 64, y: 680, w: 760, h: 1, fill: C.line });
text(contentLayout, 'Source: project docs, Graphify findings, and inspected repo structure', {
  x: 66, y: 684, w: 760, h: 14, size: 10, color: C.dim, face: 'Aptos',
});

function addSlide(k, fn) {
  const s = p.slides.add();
  setLayout(s, contentLayout);
  fn(s);
  page(s, k);
}

addSlide(1, (slide) => {
  kicker(slide, 'Product Presentation');
  title(slide, 'Lados is the operating layer for governed business workflows.', { y: 112, w: 790, h: 150, size: 52 });
  text(slide, 'A pack-based platform where workflows, humans, AI, resources, and audit trails execute through one shared engine.', { x: 68, y: 285, w: 650, h: 72, size: 22, color: C.muted });
  shape(slide, { x: 820, y: 96, w: 330, h: 330, fill: '#0E1421', line: C.line, lw: 1 });
  shape(slide, { x: 867, y: 143, w: 236, h: 236, fill: '#101C2D', line: C.cyan, lw: 2 });
  shape(slide, { x: 914, y: 190, w: 142, h: 142, fill: '#152338', line: C.copper, lw: 2 });
  shape(slide, { x: 955, y: 231, w: 60, h: 60, fill: C.cyan });
  text(slide, 'LADOS', { x: 884, y: 432, w: 210, h: 34, size: 28, bold: true, align: 'center', face: 'Aptos Display' });
  text(slide, 'Universal workflow engine', { x: 832, y: 468, w: 316, h: 22, size: 14, color: C.muted, align: 'center', face: 'Aptos Mono' });
  [['21+', 'official capability packs'], ['5/5', 'Phase 22 sprints complete'], ['1', 'engine for every domain']].forEach(([v, l], i) => {
    const x = 68 + i * 218;
    text(slide, v, { x, y: 500, w: 180, h: 46, size: 36, bold: true, color: i === 1 ? C.green : C.cyan, face: 'Aptos Display' });
    text(slide, l, { x, y: 548, w: 178, h: 34, size: 13, color: C.muted });
  });
  text(slide, 'Built from project documentation and Graphify code navigation; no unverified logo or screenshot assets used.', { x: 66, y: 620, w: 740, h: 24, size: 12, color: C.dim });
});

addSlide(2, (slide) => {
  kicker(slide, 'System Model');
  title(slide, 'The platform separates workflow logic from industry capability.', { w: 790 });
  [
    ['Experience layer', 'Next.js app: canvas, approvals, resources, marketplace, operations dashboard', C.violet],
    ['API orchestration', 'NestJS modules: workflow, execution, approvals, pack registry, analytics, retention', C.cyan],
    ['Execution core', 'Runner, queue fallback, port-aware input resolution, state, event, audit, security', C.green],
    ['Capability packs', 'Official L0/L1/L2 packs: foundation, human work, document, finance, QS, procurement, asset, payroll', C.copper],
    ['Data foundation', 'Supabase resources, workflow versions, runs, tasks, rollups, storage, knowledge/catalogue data', C.muted],
  ].forEach(([label, body, color], i) => box(slide, { x: 95 + i * 18, y: 210 + i * 72, w: 770 - i * 36, h: 60, label, body, color, fill: i % 2 ? '#0E1625' : C.panel }));
  shape(slide, { x: 900, y: 220, w: 280, h: 238, fill: '#0E1421', line: C.line, lw: 1 });
  text(slide, 'Why it matters', { x: 928, y: 248, w: 210, h: 28, size: 22, bold: true, face: 'Aptos Display' });
  text(slide, 'A construction workflow, a procurement workflow, and a payroll workflow all inherit the same execution, audit, approval, resource, and retention mechanics.', { x: 928, y: 296, w: 220, h: 100, size: 15, color: C.muted });
  shape(slide, { x: 926, y: 405, w: 226, h: 42, fill: '#122034', line: C.cyan, lw: 1 });
  text(slide, 'Foundation first; domain packs second.', { x: 944, y: 418, w: 190, h: 16, size: 13, bold: true, color: C.cyan, align: 'center' });
});

addSlide(3, (slide) => {
  kicker(slide, 'Pack Ecosystem');
  title(slide, 'Packs turn domain expertise into installable execution capability.', { w: 830, h: 92, size: 38 });
  shape(slide, { x: 540, y: 305, w: 200, h: 110, fill: '#122034', line: C.cyan, lw: 2 });
  text(slide, 'Lados\nEngine', { x: 575, y: 330, w: 130, h: 54, size: 30, bold: true, align: 'center', valign: 'mid', face: 'Aptos Display' });
  [['Workflow foundation', 250, 205, C.cyan], ['Human work', 520, 185, C.green], ['Document intelligence', 790, 205, C.violet], ['Procurement', 210, 380, C.copper], ['QS commercial', 500, 495, C.copper], ['Asset & fleet', 805, 380, C.green]].forEach(([label, x, y, color]) => {
    shape(slide, { x, y, w: 190, h: 64, fill: '#0F1727', line: color, lw: 1 });
    text(slide, label, { x: x + 14, y: y + 17, w: 162, h: 28, size: 16, bold: true, align: 'center', valign: 'mid' });
    if (x + 190 <= 540) shape(slide, { x: x + 190, y: y + 31, w: 110, h: 2, fill: color });
    else if (x >= 740) shape(slide, { x: 740, y: y + 31, w: x - 740, h: 2, fill: color });
    else shape(slide, { x: x + 95, y: y + 64, w: 2, h: 56, fill: color });
  });
  text(slide, 'Capability packs are not just palette items. They define manifests, nodes, ports, events, config fields, and runtime executors that the engine can govern.', { x: 140, y: 600, w: 1000, h: 40, size: 19, color: C.muted, align: 'center' });
});

addSlide(4, (slide) => {
  kicker(slide, 'Execution Path');
  title(slide, 'Every run follows one auditable path from trigger to outcome.', { w: 780 });
  [['Trigger', 'manual, schedule,\nwebhook, event', C.violet], ['Resolve', 'bindings, inputs,\npack executors', C.cyan], ['Execute', 'port-aware\nnode runner', C.green], ['Pause', 'approval or\nrequest_input', C.copper], ['Record', 'logs, events,\naudit, rollups', C.cyan], ['Outcome', 'resource update\nor artifact', C.green]].forEach(([label, body, color], i) => {
    const x = 70 + i * 195;
    shape(slide, { x, y: 268, w: 150, h: 150, fill: '#101827', line: color, lw: 1 });
    text(slide, String(i + 1).padStart(2, '0'), { x: x + 16, y: 296, w: 42, h: 24, size: 15, color, bold: true, face: 'Aptos Mono' });
    text(slide, label, { x: x + 16, y: 327, w: 118, h: 29, size: 22, bold: true, face: 'Aptos Display' });
    text(slide, body, { x: x + 16, y: 365, w: 118, h: 32, size: 11, color: C.muted });
    if (i < 5) shape(slide, { x: x + 150, y: 338, w: 45, h: 3, fill: C.line });
  });
  shape(slide, { x: 220, y: 470, w: 840, h: 76, fill: '#0E1421', line: C.line, lw: 1 });
  text(slide, 'The queue can fall back to in-process execution, while the watchdog, analytics, and retention services keep operational state visible after the run starts.', { x: 250, y: 493, w: 780, h: 28, size: 18, color: C.muted, align: 'center' });
});

addSlide(5, (slide) => {
  kicker(slide, 'Human Governance');
  title(slide, 'Human input is a workflow primitive, not a side channel.', { w: 760 });
  box(slide, { x: 95, y: 245, w: 260, h: 120, label: 'request_approval', body: 'A human decision gates commercial facts. AI remains advisory.', color: C.copper });
  box(slide, { x: 510, y: 245, w: 260, h: 120, label: 'request_input', body: 'Structured data can be inserted or corrected mid-run with an auditable task.', color: C.green });
  box(slide, { x: 925, y: 245, w: 260, h: 120, label: 'delegation / escalation', body: 'Named users, role inboxes, admin override, watchdog escalation.', color: C.cyan });
  shape(slide, { x: 355, y: 302, w: 155, h: 3, fill: C.line });
  shape(slide, { x: 770, y: 302, w: 155, h: 3, fill: C.line });
  shape(slide, { x: 226, y: 420, w: 828, h: 82, fill: '#0D1524', line: C.violet, lw: 1 });
  text(slide, 'One task table, two task types', { x: 312, y: 441, w: 270, h: 24, size: 22, bold: true, align: 'center', face: 'Aptos Display' });
  text(slide, 'approval_tasks now carries approval and input lifecycles: pending -> resolved, with assignment, delegation, escalation, audit log, and resume.', { x: 595, y: 438, w: 390, h: 40, size: 15, color: C.muted });
});

addSlide(6, (slide) => {
  kicker(slide, 'Resource Model');
  title(slide, 'Workspace Resources anchor workflows to real business objects.', { w: 780 });
  ['Job', 'Invoice', 'Vehicle', 'BOQ', 'Claim', 'Variation', 'Defect', 'Task'].forEach((label, i) => {
    const x = 100 + (i % 4) * 135, y = 245 + Math.floor(i / 4) * 78;
    shape(slide, { x, y, w: 108, h: 48, fill: C.panel, line: C.copper, lw: 1 });
    text(slide, label, { x: x + 10, y: y + 14, w: 88, h: 20, size: 15, bold: true, align: 'center' });
  });
  text(slide, 'Workspace Resources', { x: 165, y: 210, w: 320, h: 26, size: 22, bold: true, color: C.copper, align: 'center', face: 'Aptos Display' });
  shape(slide, { x: 650, y: 215, w: 230, h: 170, fill: '#0F1727', line: C.cyan, lw: 2 });
  text(slide, 'Resource Binding', { x: 685, y: 244, w: 160, h: 28, size: 22, bold: true, align: 'center', face: 'Aptos Display' });
  text(slide, 'workflow field key\n-> governed resource id\n-> resolved at run time', { x: 692, y: 292, w: 150, h: 68, size: 15, color: C.muted, align: 'center', face: 'Aptos Mono' });
  shape(slide, { x: 575, y: 303, w: 75, h: 3, fill: C.line });
  shape(slide, { x: 880, y: 303, w: 80, h: 3, fill: C.line });
  shape(slide, { x: 960, y: 240, w: 220, h: 120, fill: '#122034', line: C.green, lw: 1 });
  text(slide, 'Execution context', { x: 990, y: 264, w: 160, h: 24, size: 20, bold: true, align: 'center', face: 'Aptos Display' });
  text(slide, 'Nodes receive validated business objects instead of loose IDs.', { x: 990, y: 302, w: 160, h: 42, size: 14, color: C.muted, align: 'center' });
  text(slide, 'This is the difference between automation that moves text around and automation that safely touches the actual business record.', { x: 210, y: 505, w: 860, h: 50, size: 22, color: C.muted, align: 'center' });
});

addSlide(7, (slide) => {
  kicker(slide, 'Maturity');
  title(slide, 'Phase 21/22 moved Lados from prototype to enterprise foundation.', { w: 850 });
  const stages = [['Prototype freeze', 'Archived old packs; official assets become the product line.', C.dim], ['Official runtime', 'Manifest loader, validator, real executors, node registry.', C.cyan], ['Engine hardening', 'Queue fallback, watchdog, SSE node status, publish regression tests.', C.green], ['Enterprise foundation', 'Departments, idempotency, HITL upgrade, analytics, branching.', C.copper], ['Retention live', 'Export-before-disposal archival service with audit summaries.', C.violet]];
  shape(slide, { x: 130, y: 350, w: 1010, h: 4, fill: C.line });
  stages.forEach(([label, body, color], i) => {
    const x = 120 + i * 245;
    shape(slide, { x, y: 324, w: 56, h: 56, fill: color });
    text(slide, String(i + 1), { x, y: 337, w: 56, h: 24, size: 22, bold: true, color: C.bg, align: 'center', valign: 'mid', face: 'Aptos Display' });
    text(slide, label, { x: x - 45, y: 410, w: 150, h: 36, size: 18, bold: true, align: 'center', face: 'Aptos Display' });
    text(slide, body, { x: x - 64, y: 455, w: 188, h: 80, size: 13, color: C.muted, align: 'center' });
  });
  text(slide, 'Current standing: Phase 22 handover notes mark S22.1-S22.5 complete/live; remaining items are productization and operational launch readiness.', { x: 160, y: 590, w: 960, h: 40, size: 19, color: C.green, align: 'center' });
});

addSlide(8, (slide) => {
  kicker(slide, 'Commercial Logic');
  title(slide, 'The engine compounds value through efficiency, quality, and expansion.', { w: 830 });
  [['Workflow templates', 130, 250, C.cyan], ['Faster implementation', 420, 230, C.green], ['More trusted runs', 730, 250, C.copper], ['Marketplace packs', 730, 445, C.violet], ['Reusable evidence', 420, 528, C.green], ['Lower delivery cost', 130, 445, C.copper]].forEach(([label, x, y, color]) => {
    shape(slide, { x, y, w: 190, h: 72, fill: '#101827', line: color, lw: 1 });
    text(slide, label, { x: x + 18, y: y + 20, w: 154, h: 28, size: 18, bold: true, align: 'center', valign: 'mid', face: 'Aptos Display' });
  });
  [[320, 286, 420, 286], [610, 266, 730, 286], [825, 322, 825, 445], [730, 546, 610, 546], [225, 445, 225, 322], [320, 481, 420, 481]].forEach(([x1, y1, x2, y2]) => {
    if (x1 === x2) shape(slide, { x: x1, y: Math.min(y1, y2), w: 3, h: Math.abs(y2 - y1), fill: '#39455F' });
    else shape(slide, { x: Math.min(x1, x2), y: y1, w: Math.abs(x2 - x1), h: 3, fill: '#39455F' });
  });
  shape(slide, { x: 505, y: 324, w: 270, h: 92, fill: '#122034', line: C.cyan, lw: 2 });
  text(slide, 'Expansion loop', { x: 552, y: 348, w: 176, h: 26, size: 24, bold: true, align: 'center', face: 'Aptos Display' });
  text(slide, 'more packs -> more workflows -> more\ngoverned outcomes', { x: 530, y: 384, w: 220, h: 24, size: 12, color: C.muted, align: 'center', face: 'Aptos Mono' });
});

addSlide(9, (slide) => {
  kicker(slide, 'Readiness');
  title(slide, 'Lados is foundation-ready; launch readiness now depends on operational gates.', { w: 880 });
  const rows = [['Official packs', 'runtime packs built and validated', 'green'], ['Enterprise foundation', 'departments, analytics, HITL, branching, retention', 'green'], ['Queue infrastructure', 'fallback works; live Upstash credential verification remains a known watch item', 'amber'], ['Product templates', 'first official template set and browser E2E remain the next productization gate', 'amber'], ['Production launch', 'staging, observability, load/chaos drills, go-live runbook', 'amber']];
  shape(slide, { x: 118, y: 224, w: 1044, h: 330, fill: '#0D1422', line: C.line, lw: 1 });
  rows.forEach(([area, status, tone], i) => {
    const y = 246 + i * 58;
    if (i > 0) shape(slide, { x: 142, y: y - 12, w: 996, h: 1, fill: C.line });
    text(slide, area, { x: 154, y, w: 250, h: 24, size: 18, bold: true, face: 'Aptos Display' });
    text(slide, status, { x: 420, y, w: 560, h: 24, size: 15, color: C.muted });
    const color = tone === 'green' ? C.green : C.copper;
    shape(slide, { x: 1020, y: y - 2, w: 86, h: 28, fill: color });
    text(slide, tone === 'green' ? 'LIVE' : 'NEXT', { x: 1020, y: y + 5, w: 86, h: 14, size: 11, color: C.bg, bold: true, align: 'center', valign: 'mid', face: 'Aptos Mono' });
  });
  text(slide, 'Positioning: strong product foundation, not yet a polished public launch package.', { x: 202, y: 600, w: 876, h: 30, size: 22, color: C.cyan, bold: true, align: 'center' });
});

addSlide(10, (slide) => {
  kicker(slide, 'Next Moves');
  title(slide, 'The next product step is packaging the engine into repeatable, sellable workflows.', { w: 900 });
  [
    ['Template productization', 'Ship first official workflow templates with browser E2E: invoice, document review, RFQ, BOQ, progress claim.', C.cyan],
    ['Marketplace layer', 'Surface Knowledge Packs and Catalogue Providers without renaming technical data-pack identifiers.', C.violet],
    ['Operational launch', 'Staging, observability, Redis verification, queue drills, Sentry, runbook, production smoke tests.', C.green],
    ['Commercial edition', 'Contractor/QS workflows become the first proof market, while the engine remains universal.', C.copper],
  ].forEach(([label, body, color], i) => box(slide, { x: 100 + (i % 2) * 545, y: 220 + Math.floor(i / 2) * 150, w: 470, h: 104, label, body, color, fill: '#0F1727' }));
  shape(slide, { x: 295, y: 558, w: 690, h: 54, fill: '#122034', line: C.cyan, lw: 1 });
  text(slide, 'Decision frame: build the launch package around one excellent workflow story, then expand the pack catalogue around proven use.', { x: 325, y: 574, w: 630, h: 22, size: 17, bold: true, align: 'center' });
});

await fs.mkdir(OUT_DIR, { recursive: true });
await fs.mkdir(PREVIEW_DIR, { recursive: true });
const pptx = await PresentationFile.exportPptx(p);
await pptx.save(FINAL);
for (let i = 0; i < p.slides.count; i += 1) {
  const slide = p.slides.getItem(i);
  const preview = await p.export({ slide, format: 'png', scale: 1 });
  await fs.writeFile(path.join(PREVIEW_DIR, `slide-${String(i + 1).padStart(2, '0')}.png`), Buffer.from(await preview.arrayBuffer()));
}
console.log(JSON.stringify({ output: FINAL, slideCount: p.slides.count, masterId: master.id, layoutId: contentLayout.id }, null, 2));
