import type { Band } from "./model";

const W = 760;
const H = 340;
const M = { t: 16, r: 16, b: 36, l: 48 };

/** Round tick step (1, 2, 2.5 or 5 × 10^k) giving about 4 intervals up to v. */
function niceStep(v: number) {
  const raw = Math.max(v, 1) / 4;
  const p = Math.pow(10, Math.floor(Math.log10(raw)));
  for (const f of [1, 2, 2.5, 5, 10]) if (f * p >= raw) return Math.max(1, f * p);
  return 10 * p;
}

export function drawChart(el: HTMLElement, bands: Band[], base: Band[] | undefined, layoffMonth: number) {
  const n = bands.length - 1;
  const top = Math.max(...bands.map((b) => Math.max(b.headcount, b.p90)), ...(base ?? []).map((b) => b.headcount));
  const step = niceStep(top);
  const ymax = Math.ceil(top / step - 1e-9) * step;
  const x = (m: number) => M.l + (m / n) * (W - M.l - M.r);
  const y = (v: number) => H - M.b - (v / ymax) * (H - M.t - M.b);
  const line = (pts: [number, number][]) => pts.map(([a, b], i) => `${i ? "L" : "M"}${x(a).toFixed(1)},${y(b).toFixed(1)}`).join("");

  const area =
    bands.map((b, i) => `${i ? "L" : "M"}${x(b.month).toFixed(1)},${y(b.p90).toFixed(1)}`).join("") +
    [...bands].reverse().map((b) => `L${x(b.month).toFixed(1)},${y(b.p10).toFixed(1)}`).join("") +
    "Z";

  const yTicks = Array.from({ length: Math.round(ymax / step) + 1 }, (_, i) => i * step);
  const xStep = n <= 24 ? 3 : n <= 48 ? 6 : 12;
  const xTicks = Array.from({ length: Math.floor(n / xStep) + 1 }, (_, i) => i * xStep);

  el.innerHTML = `
<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Headcount versus real output over time">
  ${yTicks.map((v) => `<line class="grid" x1="${M.l}" x2="${W - M.r}" y1="${y(v)}" y2="${y(v)}"/><text class="ax" x="${M.l - 8}" y="${y(v) + 4}" text-anchor="end">${+v.toFixed(1)}</text>`).join("")}
  ${xTicks.map((m) => `<text class="ax" x="${x(m)}" y="${H - M.b + 18}" text-anchor="middle">${m}</text>`).join("")}
  <text class="ax" x="${W - M.r}" y="${H - 4}" text-anchor="end">months</text>
  ${layoffMonth ? `<line class="layoff" x1="${x(layoffMonth)}" x2="${x(layoffMonth)}" y1="${M.t}" y2="${H - M.b}"/><text class="ax layoff-t" x="${x(layoffMonth) + 4}" y="${M.t + 10}">layoff</text>` : ""}
  ${base ? `<path class="base" d="${line(base.map((b) => [b.month, b.median]))}"/>` : ""}
  <path class="band" d="${area}"/>
  <path class="head" d="${line(bands.map((b) => [b.month, b.headcount]))}"/>
  <path class="real" d="${line(bands.map((b) => [b.month, b.median]))}"/>
  <line class="cursor" y1="${M.t}" y2="${H - M.b}" visibility="hidden"/>
  <rect class="hit" x="${M.l}" y="${M.t}" width="${W - M.l - M.r}" height="${H - M.t - M.b}"/>
</svg>
<div class="tip" hidden></div>`;

  const svg = el.querySelector("svg")!;
  const tip = el.querySelector<HTMLDivElement>(".tip")!;
  const cursor = el.querySelector<SVGLineElement>(".cursor")!;
  const move = (ev: PointerEvent) => {
    const r = svg.getBoundingClientRect();
    const sx = ((ev.clientX - r.left) / r.width) * W;
    const m = Math.max(0, Math.min(n, Math.round(((sx - M.l) / (W - M.l - M.r)) * n)));
    const b = bands[m];
    cursor.setAttribute("x1", String(x(m)));
    cursor.setAttribute("x2", String(x(m)));
    cursor.setAttribute("visibility", "visible");
    const eff = b.headcount > 0 ? Math.round((b.median / b.headcount) * 100) : 0;
    tip.innerHTML = `<b>Month ${m}</b><br>Headcount ${b.headcount.toFixed(0)}<br>Real output ${b.median.toFixed(1)} (${eff}%)${base ? `<br>Without layoff ${base[m].median.toFixed(1)}` : ""}`;
    tip.hidden = false;
    const px = (x(m) / W) * r.width;
    tip.style.left = `${Math.min(px + 12, r.width - 170)}px`;
    tip.style.top = `8px`;
  };
  svg.addEventListener("pointermove", move);
  svg.addEventListener("pointerdown", move);
  svg.addEventListener("pointerleave", () => {
    tip.hidden = true;
    cursor.setAttribute("visibility", "hidden");
  });
}
