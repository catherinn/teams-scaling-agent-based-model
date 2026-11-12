import { describe, expect, it } from "vitest";
import { DEFAULTS, insights, runMany, simulate, teamEfficiency, type Params, withoutLayoff } from "../src/model";

const P = (o: Partial<Params> = {}): Params => ({ ...DEFAULTS, runs: 30, ...o });

describe("model", () => {
  it("is deterministic for a seed", () => {
    expect(simulate(P(), 42)).toEqual(simulate(P(), 42));
  });

  it("team output peaks around 10-12 people", () => {
    const out = (n: number) => n * teamEfficiency(n, DEFAULTS.pairCost);
    let best = 1;
    for (let n = 1; n <= 30; n++) if (out(n) > out(best)) best = n;
    expect(best).toBeGreaterThanOrEqual(10);
    expect(best).toBeLessThanOrEqual(12);
  });

  it("an established organisation starts at 100% of its headcount", () => {
    for (const n of [5, 23, 100, 400]) {
      const r = simulate(P({ startHeadcount: n, established: true }), 2);
      expect(r.months[0].output).toBeCloseTo(n, 6);
    }
  });

  it("an established organisation with no change stays at 100%", () => {
    const r = simulate(P({ startHeadcount: 60, established: true, hiresPerYear: 0, months: 24 }), 2);
    for (const m of r.months) expect(m.output).toBeCloseTo(60, 6);
  });

  it("a brand-new team starts well below its headcount", () => {
    expect(simulate(P(), 1).months[0].output).toBeLessThan(5 * 0.5);
  });

  it("growing beyond today's structure costs output per head", () => {
    for (const r of simulate(P({ startHeadcount: 50, established: true, hiresPerYear: 40, months: 60 }), 3).months.slice(1)) {
      expect(r.output).toBeLessThan(r.headcount);
    }
  });

  it("hires exactly the planned number per year without attrition", () => {
    const r = simulate(P({ hiresPerYear: 17, months: 24 }), 1);
    expect(r.months[24].headcount).toBe(5 + 34);
    expect(r.months[12].headcount).toBe(5 + 17);
  });

  it("keeps teams within size limits", () => {
    const r = simulate(P({ hiresPerYear: 60, months: 36, attritionPerYear: 20, layoffMonth: 20, layoffPercent: 40 }), 9);
    for (const snap of r.snapshots) for (const t of snap) {
      expect(t.size).toBeLessThan(DEFAULTS.splitAt);
      if (snap.length > 1) expect(t.size).toBeGreaterThanOrEqual(DEFAULTS.minTeamSize);
    }
  });

  it("seniors are more productive than juniors in the first two years", () => {
    const at = (share: number, m: number) => runMany(P({ seniorShare: share, hiresPerYear: 0, months: 30 })).bands[m].median;
    expect(at(100, 9)).toBeGreaterThan(at(0, 9) * 1.3);
    expect(at(100, 18)).toBeGreaterThan(at(0, 18) * 1.05);
  });

  it("fast growth lowers output per head", () => {
    const eff = (h: number) => insights(P({ hiresPerYear: h }), runMany(P({ hiresPerYear: h }))).efficiency;
    expect(eff(40)).toBeLessThan(eff(6));
  });

  it("a layoff causes a dip in output", () => {
    const p = P({ startHeadcount: 100, established: true, hiresPerYear: 0, layoffMonth: 6, layoffPercent: 20 });
    const i = insights(p, runMany(p), runMany(withoutLayoff(p)));
    // Output falls by more than the headcount cut: survivors absorb the disruption.
    expect(i.layoff!.outputCut).toBeGreaterThan(i.layoff!.headcountCut);
  });
});
