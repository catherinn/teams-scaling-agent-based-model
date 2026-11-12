// Agent-based model of a product development organisation.
//
// Ported from the original NetLogo model (netlogo/), with these changes:
// - Individual skill (ramp-up) and team cohesion (Tuckman stage) are separate.
//   Joining, leaving, splitting and merging hurt cohesion; time together restores it.
// - Seniors ramp faster; juniors ramp to a lower level and then grow into seniors.
// - Team efficiency follows pairwise communication channels (n(n-1)/2), calibrated
//   so a team's output peaks around 10-12 people.
// - Splitting a team and merging teams cost cohesion (reorgs are not free).
// - Coordination between teams has a cost, so more teams means overhead.
// - Hires are spread evenly over a 12-month year.
// - Layoffs, staff turnover and extra departures after a layoff are modelled.
// - Many seeded runs are aggregated into a median and a 10-90% band.
//
// Units: 1.0 = the output of one person at TODAY's productivity: a ramped-up,
// performing member of the starting organisation. We know nothing about how
// productive the real organisation is today, so today counts as 100% and the model
// only shows what changes cost relative to it. An established organisation starts
// exactly at its headcount; a brand-new team starts lower because it still has to
// ramp up and gel. "Perceived output" is therefore simply the headcount.

export interface Params {
  months: number;
  startHeadcount: number;
  established: boolean; // true: start with a ramped, performing organisation
  hiresPerYear: number;
  seniorShare: number; // 0..100, % of new hires who are senior
  splitAt: number; // a team reaching this size splits in two
  minTeamSize: number; // smaller teams are merged into others
  pairCost: number; // efficiency cost per communication pair inside a team
  crossTeamCost: number; // organisation overhead per additional team
  disruption: number; // cohesion lost per person joining or leaving a team
  reorgPenalty: number; // cohesion lost by a team that is split or merged
  monthsToPerform: number; // months for a new team to reach "performing"
  seniorRampMonths: number;
  juniorRampMonths: number;
  juniorToSeniorMonths: number; // months for a junior to reach full productivity
  attritionPerYear: number; // 0..100 %
  backfill: boolean; // replace people who leave voluntarily
  backfillMonths: number; // months until a vacancy is filled
  healthyTurnover: number; // % per year that does not affect the atmosphere
  turnoverMoraleCost: number; // output lost per point of yearly turnover above the healthy level (0.5 = 10 points -> 5%)
  layoffMonth: number; // 0 = no layoff
  layoffPercent: number; // 0..100
  survivorAttritionBoost: number; // extra attrition, % per year, for 12 months after a layoff
  moraleDrop: number; // 0..100 % output lost by survivors right after a layoff, recovering over 12 months
  knowledgeLoss: number; // 0..1 share of a leaver's capability their teammates must rebuild
  seniorCost: number; // salary of a senior relative to a junior (1.0)
  runs: number;
  seed: number;
}

export const DEFAULTS: Params = {
  months: 48,
  startHeadcount: 20,
  established: true,
  hiresPerYear: 0,
  seniorShare: 50,
  splitAt: 10,
  minTeamSize: 3,
  pairCost: 0.015,
  crossTeamCost: 0.005,
  disruption: 0.08,
  reorgPenalty: 0.15,
  monthsToPerform: 10,
  seniorRampMonths: 6,
  juniorRampMonths: 6,
  juniorToSeniorMonths: 24,
  attritionPerYear: 0,
  backfill: true,
  backfillMonths: 3,
  healthyTurnover: 10,
  turnoverMoraleCost: 0.5,
  layoffMonth: 0,
  layoffPercent: 0,
  survivorAttritionBoost: 15,
  moraleDrop: 15,
  knowledgeLoss: 0.5,
  seniorCost: 1.6,
  runs: 60,
  seed: 1,
};

export type Stage = "forming" | "storming" | "norming" | "performing";

export const COHESION_MIN = 0.5;
const COHESION_NEW = 0.6;
const SENIOR_START = 0.4; // original: 3 of 7.5 points
const JUNIOR_START = 0.2; // original: 1.5 of 7.5 points
const JUNIOR_CAP = 0.6; // level a junior reaches after ramp-up, before growing further

interface Person {
  senior: boolean;
  skill: number; // 0..1
  monthsIn: number;
}

interface Team {
  id: number;
  members: Person[];
  cohesion: number; // COHESION_MIN..1
}

export interface TeamSnapshot {
  id: number;
  size: number;
  stage: Stage;
  output: number;
}

export interface MonthResult {
  month: number;
  headcount: number;
  output: number;
  teams: number;
  cost: number;
}

export interface RunResult {
  months: MonthResult[];
  snapshots: TeamSnapshot[][]; // per month
}

export function stageOf(cohesion: number): Stage {
  if (cohesion < 0.7) return "forming";
  if (cohesion < 0.8) return "storming";
  if (cohesion < 0.9) return "norming";
  return "performing";
}

/** Share of a team's raw capacity left after communication overhead. */
export function teamEfficiency(size: number, pairCost: number): number {
  return 1 / (1 + (pairCost * size * (size - 1)) / 2);
}

/** Share of the organisation's output left after coordination between teams. */
export function orgEfficiency(teams: number, crossTeamCost: number): number {
  return 1 / (1 + crossTeamCost * Math.max(0, teams - 1));
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function simulate(p: Params, seed = p.seed): RunResult {
  const rand = mulberry32(seed);
  const teams: Team[] = [];
  let nextId = 1;
  let hireCarry = 0;

  const newPerson = (senior: boolean, ramped: boolean): Person => ({
    senior,
    skill: ramped ? 1 : senior ? SENIOR_START : JUNIOR_START, // existing staff are fully ramped in their roles
    monthsIn: ramped ? 24 : 0,
  });
  const isSenior = () => rand() * 100 < p.seniorShare;
  const headcount = () => teams.reduce((s, t) => s + t.members.length, 0);
  const pick = <T>(xs: T[]) => xs[Math.floor(rand() * xs.length)];

  // Initial organisation: teams of about half the split size.
  {
    const start = Math.max(1, Math.round(p.startHeadcount));
    const target = Math.max(p.minTeamSize, Math.floor(p.splitAt / 2));
    const nTeams = Math.max(1, Math.round(start / target));
    for (let i = 0; i < nTeams; i++) teams.push({ id: nextId++, members: [], cohesion: p.established ? 1 : COHESION_NEW });
    for (let i = 0; i < start; i++) teams[i % nTeams].members.push(newPerson(isSenior(), p.established));
  }

  // Reference: per-person output of today's organisation once ramped up and performing.
  // Structural overhead that already exists today (team sizes, number of teams) is part
  // of the baseline, not a cost of change.
  const reference = (() => {
    const n = teams.reduce((s, t) => s + t.members.length, 0);
    const raw = teams.reduce((s, t) => s + t.members.length * teamEfficiency(t.members.length, p.pairCost), 0);
    return (raw * orgEfficiency(teams.length, p.crossTeamCost)) / n;
  })();

  const hurt = (t: Team, amount: number) => {
    t.cohesion = Math.max(COHESION_MIN, t.cohesion - amount);
  };

  const removePerson = (t: Team, idx: number) => {
    const [leaver] = t.members.splice(idx, 1);
    hurt(t, p.disruption);
    // Knowledge loss: teammates must take over and relearn what the leaver knew.
    const n = t.members.length;
    for (const m of t.members) m.skill = Math.max(0.1, m.skill - (p.knowledgeLoss * leaver.skill) / n);
  };

  const removeEmptyAndMergeSmall = () => {
    for (let i = teams.length - 1; i >= 0; i--) if (teams[i].members.length === 0) teams.splice(i, 1);
    // Merge teams below the minimum size into the smallest other teams.
    let small = teams.find((t) => t.members.length < p.minTeamSize);
    while (small && teams.length > 1) {
      teams.splice(teams.indexOf(small), 1);
      for (const m of small.members) {
        const target = teams.reduce((a, b) => (b.members.length < a.members.length ? b : a));
        target.members.push(m);
        hurt(target, p.reorgPenalty / 2);
      }
      small = teams.find((t) => t.members.length < p.minTeamSize);
    }
    // Merging can push teams over the split size.
    for (const t of [...teams]) if (t.members.length >= p.splitAt) split(t);
  };

  const split = (t: Team) => {
    if (Math.floor(t.members.length / 2) < p.minTeamSize) return;
    // Shuffle, then move half into a new team. Both halves restart team-building.
    for (let i = t.members.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [t.members[i], t.members[j]] = [t.members[j], t.members[i]];
    }
    const moved = t.members.splice(0, Math.floor(t.members.length / 2));
    hurt(t, p.reorgPenalty);
    teams.push({ id: nextId++, members: moved, cohesion: t.cohesion });
  };

  const monthlyRate = (perYear: number) => 1 - Math.pow(1 - Math.min(99.9, perYear) / 100, 1 / 12);
  let boostUntil = -1;
  let layoffAt = -1;
  const layoffMorale = (month: number) =>
    layoffAt < 0 || month - layoffAt >= 12 ? 1 : 1 - (p.moraleDrop / 100) * (1 - (month - layoffAt) / 12);

  // Atmosphere: voluntary turnover over the last 12 months (annualised) above a healthy
  // level lowers the motivation of everyone who stays.
  const leftPerMonth: number[] = [];
  const headPerMonth: number[] = [];
  const turnoverRate = () => {
    const k = Math.min(12, leftPerMonth.length);
    if (k === 0) return 0;
    const left = leftPerMonth.slice(-k).reduce((a, b) => a + b, 0);
    const avgHead = headPerMonth.slice(-k).reduce((a, b) => a + b, 0) / k;
    return avgHead > 0 ? ((left / avgHead) * 12) / k : 0;
  };
  const climate = () => 1 - p.turnoverMoraleCost * Math.max(0, turnoverRate() - p.healthyTurnover / 100);
  const morale = (month: number) => Math.max(0.5, layoffMorale(month) * climate());
  const vacancies: number[] = []; // month each pending replacement starts

  const months: MonthResult[] = [];
  const snapshots: TeamSnapshot[][] = [];

  const record = (month: number) => {
    let raw = 0;
    const snap: TeamSnapshot[] = [];
    for (const t of teams) {
      const skill = t.members.reduce((s, m) => s + m.skill, 0);
      const out = skill * t.cohesion * teamEfficiency(t.members.length, p.pairCost);
      raw += out;
      snap.push({ id: t.id, size: t.members.length, stage: stageOf(t.cohesion), output: out / reference });
    }
    const cost = teams.reduce((s, t) => s + t.members.reduce((c, m) => c + (m.senior ? p.seniorCost : 1), 0), 0);
    months.push({ month, headcount: headcount(), output: (raw * orgEfficiency(teams.length, p.crossTeamCost) * morale(month)) / reference, teams: teams.length, cost });
    snapshots.push(snap);
  };

  record(0);

  for (let month = 1; month <= p.months; month++) {
    // 1. Time passes: people ramp up, teams gel.
    for (const t of teams) {
      const ramped = t.members.filter((m) => m.monthsIn >= 6).length;
      const fresh = t.members.length - ramped;
      // Few experienced people and many newcomers means slower onboarding.
      const mentoring = fresh === 0 ? 1 : Math.max(0.3, Math.min(1, ramped / fresh));
      for (const m of t.members) {
        m.monthsIn++;
        if (m.senior) {
          m.skill = Math.min(1, m.skill + ((1 - SENIOR_START) / p.seniorRampMonths) * mentoring);
        } else if (m.skill < JUNIOR_CAP) {
          m.skill = Math.min(JUNIOR_CAP, m.skill + ((JUNIOR_CAP - JUNIOR_START) / p.juniorRampMonths) * mentoring);
        } else {
          const growMonths = Math.max(1, p.juniorToSeniorMonths - p.juniorRampMonths);
          m.skill = Math.min(1, m.skill + (1 - JUNIOR_CAP) / growMonths);
        }
      }
      t.cohesion = Math.min(1, t.cohesion + (0.9 - COHESION_NEW) / p.monthsToPerform);
    }

    // 2. Layoff.
    if (p.layoffMonth > 0 && month === p.layoffMonth && p.layoffPercent > 0) {
      let toCut = Math.round((headcount() * p.layoffPercent) / 100);
      while (toCut-- > 0 && headcount() > 1) {
        const t = pick(teams.filter((x) => x.members.length > 0));
        removePerson(t, Math.floor(rand() * t.members.length));
      }
      boostUntil = month + 12;
      layoffAt = month;
      removeEmptyAndMergeSmall();
    }

    // 3. Voluntary departures.
    const rate = monthlyRate(p.attritionPerYear + (month <= boostUntil ? p.survivorAttritionBoost : 0));
    const headBefore = headcount();
    let left = 0;
    if (rate > 0) {
      for (const t of teams) {
        for (let i = t.members.length - 1; i >= 0; i--) {
          if (headcount() > 1 && rand() < rate) {
            removePerson(t, i);
            left++;
            if (p.backfill) vacancies.push(month + p.backfillMonths);
          }
        }
      }
      removeEmptyAndMergeSmall();
    }
    leftPerMonth.push(left);
    headPerMonth.push(headBefore);

    // 4. Hiring, spread evenly over the year (fraction carried to next month).
    hireCarry += p.hiresPerYear / 12;
    let hires = Math.floor(hireCarry + 1e-9);
    hireCarry -= hires;
    // Replacements whose vacancy is filled this month.
    for (let i = vacancies.length - 1; i >= 0; i--) {
      if (vacancies[i] <= month) {
        vacancies.splice(i, 1);
        hires++;
      }
    }
    while (hires-- > 0) {
      if (teams.length === 0) teams.push({ id: nextId++, members: [], cohesion: COHESION_NEW });
      const t = pick(teams);
      t.members.push(newPerson(isSenior(), false));
      hurt(t, p.disruption);
      if (t.members.length >= p.splitAt) split(t);
    }

    record(month);
  }

  return { months, snapshots };
}

export interface Band {
  month: number;
  headcount: number;
  p10: number;
  median: number;
  p90: number;
  teams: number;
  cost: number;
}

export interface Summary {
  bands: Band[];
  sample: RunResult; // the run closest to the median, for the team view
}

const quantile = (sorted: number[], q: number) => {
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
};

export function runMany(p: Params): Summary {
  const runs = Array.from({ length: Math.max(1, p.runs) }, (_, i) => simulate(p, p.seed * 7919 + i));
  const bands: Band[] = [];
  for (let m = 0; m <= p.months; m++) {
    const outs = runs.map((r) => r.months[m].output).sort((a, b) => a - b);
    const avg = (f: (x: MonthResult) => number) => runs.reduce((s, r) => s + f(r.months[m]), 0) / runs.length;
    bands.push({
      month: m,
      headcount: avg((x) => x.headcount),
      p10: quantile(outs, 0.1),
      median: quantile(outs, 0.5),
      p90: quantile(outs, 0.9),
      teams: avg((x) => x.teams),
      cost: avg((x) => x.cost),
    });
  }
  const dist = (r: RunResult) => r.months.reduce((s, x, m) => s + Math.abs(x.output - bands[m].median), 0);
  const sample = runs.reduce((a, b) => (dist(b) < dist(a) ? b : a));
  return { bands, sample };
}

export interface Insights {
  finalHeadcount: number;
  finalOutput: number;
  efficiency: number; // real / perceived at the end
  lostPersonMonths: number; // sum over time of (perceived - real)
  outputPerCost: number; // at the end, relative to an all-junior ramped person = 1
  layoff?: {
    headcountCut: number; // % fewer people than without the layoff, 3 months after it
    outputCut: number; // % less output than without the layoff, 3 months after it
    lostPersonMonths: number; // output lost vs. no layoff, in fully-productive person-months
    savedPersonMonths: number; // headcount months saved vs. no layoff
  };
}

/** `baseline` is the same scenario without the layoff (see withoutLayoff). */
export function insights(p: Params, s: Summary, baseline?: Summary): Insights {
  const b = s.bands;
  const last = b[b.length - 1];
  const res: Insights = {
    finalHeadcount: last.headcount,
    finalOutput: last.median,
    efficiency: last.headcount > 0 ? last.median / last.headcount : 0,
    lostPersonMonths: b.slice(1).reduce((sum, x) => sum + Math.max(0, x.headcount - x.median), 0),
    outputPerCost: last.cost > 0 ? last.median / last.cost : 0,
  };
  if (baseline && p.layoffMonth > 0 && p.layoffPercent > 0 && p.layoffMonth <= p.months) {
    const m = Math.min(p.months, p.layoffMonth + 3);
    const a = b[m];
    const z = baseline.bands[m];
    const after = (xs: Band[]) => xs.slice(p.layoffMonth);
    res.layoff = {
      headcountCut: z.headcount > 0 ? (1 - a.headcount / z.headcount) * 100 : 0,
      outputCut: z.median > 0 ? (1 - a.median / z.median) * 100 : 0,
      lostPersonMonths: after(baseline.bands).reduce((sum, x, k) => sum + x.median - after(b)[k].median, 0),
      savedPersonMonths: after(baseline.bands).reduce((sum, x, k) => sum + x.headcount - after(b)[k].headcount, 0),
    };
  }
  return res;
}

export const withoutLayoff = (p: Params): Params => ({ ...p, layoffMonth: 0, layoffPercent: 0 });
