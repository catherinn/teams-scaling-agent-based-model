import { DEFAULTS, insights, runMany, withoutLayoff, type Params, type Summary } from "./model";
import { drawChart } from "./chart";

type Key = keyof Params;

interface Control {
  key: Key;
  label: string;
  min: number;
  max: number;
  step: number;
  unit?: string;
  help?: string;
  format?: (v: number) => string;
}

const pct = (v: number) => `${v}%`;
const months = (v: number) => (v === 0 ? "none" : `month ${v}`);

const GROUPS: { title: string; advanced?: boolean; controls: (Control | { key: "established"; label: string; toggle: true; help?: string })[] }[] = [
  {
    title: "Your organisation",
    controls: [
      { key: "startHeadcount", label: "People today", min: 1, max: 500, step: 1 },
      { key: "established", label: "Already working together", toggle: true, help: "On: an established, ramped-up organisation. Off: a brand-new team." },
      { key: "months", label: "Time horizon", min: 12, max: 96, step: 6, format: (v) => `${v} months` },
    ],
  },
  {
    title: "Hiring",
    controls: [
      { key: "hiresPerYear", label: "New hires per year", min: 0, max: 300, step: 1 },
      { key: "seniorShare", label: "Seniors among new hires", min: 0, max: 100, step: 5, format: pct },
      { key: "attritionPerYear", label: "Staff turnover per year", min: 0, max: 50, step: 1, format: pct, help: "Share of people who leave voluntarily each year." },
    ],
  },
  {
    title: "Layoff",
    controls: [
      { key: "layoffMonth", label: "Layoff in", min: 0, max: 96, step: 1, format: months },
      { key: "layoffPercent", label: "People laid off", min: 0, max: 80, step: 5, format: pct },
    ],
  },
  {
    title: "Advanced assumptions",
    advanced: true,
    controls: [
      { key: "splitAt", label: "Split teams at size", min: 6, max: 20, step: 1 },
      { key: "minTeamSize", label: "Merge teams below size", min: 2, max: 5, step: 1 },
      { key: "pairCost", label: "Cost per communication pair", min: 0, max: 0.05, step: 0.001, format: (v) => `${(v * 100).toFixed(1)}%`, help: "Efficiency lost per pair of people in a team." },
      { key: "crossTeamCost", label: "Overhead per extra team", min: 0, max: 0.03, step: 0.001, format: (v) => `${(v * 100).toFixed(1)}%` },
      { key: "disruption", label: "Team setback per joiner/leaver", min: 0, max: 0.25, step: 0.01, format: (v) => `${Math.round(v * 100)}%` },
      { key: "reorgPenalty", label: "Team setback per split/merge", min: 0, max: 0.4, step: 0.01, format: (v) => `${Math.round(v * 100)}%` },
      { key: "monthsToPerform", label: "Months for a new team to perform", min: 2, max: 24, step: 1 },
      { key: "seniorRampMonths", label: "Senior ramp-up (months)", min: 1, max: 12, step: 1 },
      { key: "juniorRampMonths", label: "Junior ramp-up (months)", min: 1, max: 18, step: 1 },
      { key: "juniorToSeniorMonths", label: "Junior to full speed (months)", min: 6, max: 48, step: 1 },
      { key: "knowledgeLoss", label: "Knowledge lost per leaver", min: 0, max: 1, step: 0.05, format: (v) => `${Math.round(v * 100)}%`, help: "Share of a leaver's capability their teammates must rebuild." },
      { key: "moraleDrop", label: "Survivor morale drop", min: 0, max: 40, step: 1, format: pct, help: "Output lost by remaining staff right after a layoff, recovering over 12 months." },
      { key: "survivorAttritionBoost", label: "Extra turnover after a layoff", min: 0, max: 40, step: 1, format: (v) => `+${v}%/yr` },
      { key: "seniorCost", label: "Senior salary vs junior", min: 1, max: 3, step: 0.1, format: (v) => `${v.toFixed(1)}×` },
      { key: "runs", label: "Simulated runs", min: 10, max: 200, step: 10 },
    ],
  },
];

const PRESETS: { name: string; p: Partial<Params> }[] = [
  { name: "Startup, steady growth", p: { startHeadcount: 5, established: false, hiresPerYear: 12, seniorShare: 50, attritionPerYear: 0, layoffMonth: 0, layoffPercent: 0, months: 48 } },
  { name: "Hypergrowth", p: { startHeadcount: 20, established: true, hiresPerYear: 80, seniorShare: 40, attritionPerYear: 12, layoffMonth: 0, layoffPercent: 0, months: 48 } },
  { name: "Hire fast, then cut", p: { startHeadcount: 20, established: true, hiresPerYear: 80, seniorShare: 40, attritionPerYear: 12, layoffMonth: 24, layoffPercent: 25, months: 48 } },
  { name: "20% layoff", p: { startHeadcount: 100, established: true, hiresPerYear: 10, seniorShare: 50, attritionPerYear: 10, layoffMonth: 6, layoffPercent: 20, months: 36 } },
  { name: "Hiring freeze", p: { startHeadcount: 100, established: true, hiresPerYear: 0, seniorShare: 50, attritionPerYear: 10, layoffMonth: 0, layoffPercent: 0, months: 36 } },
  { name: "Juniors only", p: { startHeadcount: 5, established: false, hiresPerYear: 20, seniorShare: 0, attritionPerYear: 0, layoffMonth: 0, layoffPercent: 0, months: 48 } },
];

// ---------- state & URL ----------

const params: Params = { ...DEFAULTS };

function readUrl() {
  const q = new URLSearchParams(location.search);
  for (const k of Object.keys(DEFAULTS) as Key[]) {
    const v = q.get(k);
    if (v === null) continue;
    if (typeof DEFAULTS[k] === "boolean") (params as any)[k] = v === "1" || v === "true";
    else if (Number.isFinite(Number(v))) (params as any)[k] = Number(v);
  }
}

function writeUrl() {
  const q = new URLSearchParams();
  for (const k of Object.keys(DEFAULTS) as Key[]) {
    if (params[k] !== DEFAULTS[k]) q.set(k, typeof params[k] === "boolean" ? (params[k] ? "1" : "0") : String(params[k]));
  }
  const s = q.toString();
  history.replaceState(null, "", s ? `?${s}` : location.pathname);
}

function sanitize() {
  params.minTeamSize = Math.max(2, Math.round(params.minTeamSize));
  params.splitAt = Math.max(params.splitAt, params.minTeamSize * 2);
  if (params.layoffMonth > params.months) params.layoffMonth = 0;
}

// ---------- controls ----------

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const inputs = new Map<Key, { input: HTMLInputElement; out?: HTMLOutputElement; c?: Control }>();

function buildControls() {
  const root = $("controls");
  for (const g of GROUPS) {
    const box = document.createElement(g.advanced ? "details" : "fieldset");
    const title = document.createElement(g.advanced ? "summary" : "legend");
    title.textContent = g.title;
    box.appendChild(title);
    for (const c of g.controls) {
      const row = document.createElement("label");
      row.className = "control";
      if ("toggle" in c) {
        row.classList.add("toggle");
        row.innerHTML = `<input type="checkbox"><span>${c.label}</span>`;
        const input = row.querySelector("input")!;
        input.addEventListener("change", () => {
          (params as any)[c.key] = input.checked;
          update();
        });
        inputs.set(c.key, { input });
      } else {
        row.innerHTML = `<span class="row"><span>${c.label}</span><output></output></span><input type="range" min="${c.min}" max="${c.max}" step="${c.step}">`;
        const input = row.querySelector("input")!;
        const out = row.querySelector("output")!;
        input.addEventListener("input", () => {
          (params as any)[c.key] = Number(input.value);
          out.textContent = (c.format ?? String)(Number(input.value));
          update();
        });
        inputs.set(c.key, { input, out, c });
      }
      if (c.help) {
        row.title = c.help;
        const h = document.createElement("small");
        h.textContent = c.help;
        row.appendChild(h);
      }
      box.appendChild(row);
    }
    root.appendChild(box);
  }
}

function syncControls() {
  for (const [k, { input, out, c }] of inputs) {
    if (input.type === "checkbox") input.checked = Boolean(params[k]);
    else {
      if (k === "layoffMonth") input.max = String(params.months);
      input.value = String(params[k]);
      if (out && c) out.textContent = (c.format ?? String)(Number(params[k]));
    }
  }
}

function buildPresets() {
  const root = $("presets");
  for (const pr of PRESETS) {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = pr.name;
    b.addEventListener("click", () => {
      Object.assign(params, DEFAULTS, pr.p);
      update(true);
    });
    root.appendChild(b);
  }
}

// ---------- rendering ----------

const fmt = (v: number, d = 0) => v.toLocaleString("en", { maximumFractionDigits: d, minimumFractionDigits: d });
let summary: Summary;

function render(base?: Summary) {
  const i = insights(params, summary, base);
  const last = summary.bands[summary.bands.length - 1];

  let headline = `After ${params.months} months you have <b>${fmt(i.finalHeadcount)} people</b>, but they deliver what <b>${fmt(i.finalOutput, 1)}</b> fully productive people would: <b>${fmt(i.efficiency * 100)}%</b> of what headcount suggests.`;
  if (i.layoff) {
    headline = `Three months after the layoff you have <b>${fmt(i.layoff.headcountCut)}% fewer people</b> than without it, but <b>${fmt(i.layoff.outputCut)}% less output</b>. ` + headline;
  }
  $("headline").innerHTML = headline;

  const cards: [string, string, string][] = [
    ["Headcount", fmt(i.finalHeadcount), `in month ${params.months}`],
    ["Real output", fmt(i.finalOutput, 1), "fully productive people"],
    ["Efficiency", `${fmt(i.efficiency * 100)}%`, "real output ÷ headcount"],
    ["Lost to friction", fmt(i.lostPersonMonths), "person-months over the period"],
    ["Teams", fmt(last.teams, 1), `in month ${params.months}`],
  ];
  if (i.layoff) {
    cards.push(["Layoff: output lost", fmt(i.layoff.lostPersonMonths), `person-months vs ${fmt(i.layoff.savedPersonMonths)} salary-months saved`]);
  }
  $("cards").innerHTML = cards.map(([t, v, s]) => `<div class="card"><div class="t">${t}</div><div class="v">${v}</div><div class="s">${s}</div></div>`).join("");

  $("nruns").textContent = String(params.runs);
  $("legend-base").hidden = !base;
  drawChart($("chart"), summary.bands, base?.bands, params.layoffMonth > 0 && params.layoffPercent > 0 ? params.layoffMonth : 0);

  const slider = $<HTMLInputElement>("month-slider");
  slider.max = String(params.months);
  if (Number(slider.value) > params.months || slider.dataset.follow !== "0") slider.value = String(params.months);
  renderTeams();
}

function renderTeams() {
  const slider = $<HTMLInputElement>("month-slider");
  const m = Number(slider.value);
  $("team-month").textContent = String(m);
  const snap = summary.sample.snapshots[m] ?? [];
  const teams = [...snap].sort((a, b) => a.id - b.id);
  const shown = teams.slice(0, 120);
  $("teams").innerHTML =
    shown
      .map(
        (t) =>
          `<div class="team st-${t.stage}" title="Team of ${t.size}, ${t.stage}: output ${t.output.toFixed(1)}">${"<i></i>".repeat(t.size)}</div>`,
      )
      .join("") + (teams.length > shown.length ? `<div class="more">+${teams.length - shown.length} more teams</div>` : "");
}

let timer = 0;
function update(syncInputs = false) {
  sanitize();
  if (syncInputs) syncControls();
  writeUrl();
  clearTimeout(timer);
  timer = window.setTimeout(() => {
    summary = runMany(params);
    const hasLayoff = params.layoffMonth > 0 && params.layoffPercent > 0;
    render(hasLayoff ? runMany(withoutLayoff(params)) : undefined);
  }, 60);
}

// ---------- boot ----------

readUrl();
buildPresets();
buildControls();
$<HTMLInputElement>("month-slider").addEventListener("input", (e) => {
  const s = e.target as HTMLInputElement;
  s.dataset.follow = s.value === s.max ? "1" : "0";
  renderTeams();
});
$("share").addEventListener("click", async () => {
  const b = $("share");
  try {
    await navigator.clipboard.writeText(location.href);
    b.textContent = "Link copied";
  } catch {
    b.textContent = "Copy the address bar";
  }
  setTimeout(() => (b.textContent = "Copy link to this scenario"), 1600);
});
$("reset").addEventListener("click", () => {
  Object.assign(params, DEFAULTS);
  update(true);
});
update(true);
