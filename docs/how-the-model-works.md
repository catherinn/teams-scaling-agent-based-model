# How the model works

The full description of the Team Scaling simulator: what it simulates, every rule, every default, and where the ideas come from. The website shows the short version; this page is for anyone who wants to check the reasoning.

The code is in [`src/model.ts`](../src/model.ts). Every default below is in `DEFAULTS` there and can be changed on the website under *Advanced assumptions*.

## What kind of model this is

An **agent-based model**: every person and every team is simulated individually, month by month. Hiring, departures and team assignments involve chance, so each scenario is run many times (60 by default) with different random seeds. The chart shows the median run and a band covering 80% of runs (10th to 90th percentile).

## What "output" means

Output is measured in **people at today's productivity**.

- **Existing team (default):** your organisation as it is today counts as 100%. With 100 people and no changes, output stays at 100. The model makes no claim about how productive you are today, only about what a change costs from there.
- **Brand-new team:** everyone is newly hired today, so output starts low and rises as people ramp up and the team gels.

The orange line, **headcount**, is what leaders often implicitly expect: every person delivering full output. The gap between the two lines is the cost of change.

Technically, a team's output each month is:

```
team output = sum of members' skill × team cohesion × team-size efficiency
organisation output = sum of team outputs × coordination efficiency × morale
```

and everything is divided by the per-person output of the starting organisation once ramped up, so an existing team starts at exactly its headcount.

## 1. People ramp up

| Rule | Default |
|---|---|
| A new senior starts at | 40% productivity |
| A new junior starts at | 20% productivity |
| Seniors reach 100% after | 6 months |
| Juniors reach 60% after | 6 months |
| Juniors reach 100% after | 24 months in total |
| Share of seniors among new hires | 50% |
| Senior salary relative to a junior | 1.6× (used for output per cost) |

**Mentoring:** newcomers learn from experienced colleagues (6+ months in). When a team has more newcomers than experienced people, ramp-up slows down in proportion, to 30% of normal speed at the slowest.

People in an existing team start fully ramped up.

## 2. Teams need time together

Each team has a **cohesion** value that models Tuckman's stages of group development (Tuckman, 1965):

| Stage | Cohesion |
|---|---|
| Forming | below 0.7 |
| Storming | 0.7 to 0.8 |
| Norming | 0.8 to 0.9 |
| Performing | 0.9 and above |

- A new team starts at 0.6 (forming) and reaches performing after **10 months** together.
- Every person who **joins or leaves** a team lowers its cohesion by **0.08**.
- **Splitting or merging** teams lowers cohesion by **0.15** (merging: half of that for each person moved in).
- Cohesion never falls below 0.5.

Cohesion multiplies the team's output directly, so a forming team delivers about 60% of what the same people would deliver as a performing team.

## 3. Bigger isn't automatically better

**Inside a team:** the number of communication paths between n people is n(n−1)/2 (Brooks, 1975). Each path costs a little efficiency:

```
team-size efficiency = 1 / (1 + 0.015 × n(n−1)/2)
```

With this default, a team's total output peaks at around 10 to 12 people. Beyond that, adding people makes the team slower (diminishing marginal returns, Ricardo, 1817).

**Team structure:**

- A team that reaches **10 people** is split into two halves.
- A team that shrinks below **3 people** is dissolved and its members join the smallest other teams.
- New hires join a random existing team.

**Between teams:** each additional team adds coordination overhead:

```
coordination efficiency = 1 / (1 + 0.005 × (number of teams − 1))
```

The overhead your organisation already has today is part of the 100% baseline. Only changes to it count.

## 4. Every exit has a hidden price

**Knowledge loss.** When someone leaves, their teammates have to take over what they knew. Half of the leaver's capability (default **50%**) is taken from the remaining teammates, spread evenly across them, and rebuilt over the following months.

**Turnover and replacements.**

| Rule | Default |
|---|---|
| Voluntary turnover per year | 0% (set it on the website) |
| Leavers are replaced | yes |
| Months until a vacancy is filled | 3 |

A replacement is a new hire: they start from scratch and have to ramp up.

**Atmosphere.** Turnover above a healthy level makes everyone who stays less productive. The model looks at voluntary departures over the last 12 months:

```
atmosphere = 1 − 0.5 × max(0, yearly turnover − 10%)
```

So 30% turnover (20 points above healthy) costs everyone 10% of their output.

**Layoffs.**

| Rule | Default |
|---|---|
| Survivors' morale drop right after a layoff | 15% of output, recovering linearly over 12 months |
| Extra voluntary turnover after a layoff | +15% per year, for 12 months |

People laid off are chosen at random and not replaced. Layoff scenarios are compared with the same organisation without the layoff (dashed line).

Morale and atmosphere together never reduce output by more than half.

## What the model leaves out

It is a thinking tool, not a forecast. Some things it does not model:

- Differences between individuals beyond junior and senior.
- Who is laid off (the model picks at random; in reality, it is rarely random).
- Better onboarding, documentation or tooling that would shorten ramp-up (you can approximate this with the ramp-up settings).
- Turnover that feeds itself (people leaving because others left), beyond the extra turnover after a layoff.
- Team-to-team dependencies and the type of work.

The defaults are calibrated to be plausible and to match the original NetLogo model, not fitted to measured data. Real-world data to calibrate them is very welcome.

## Where it comes from

This is a rewrite of an agent-based model built in NetLogo in 2023, kept in [`netlogo/`](../netlogo/). [`model-changes.md`](model-changes.md) lists what changed and why.

- Tuckman, B. W. (1965). Developmental sequence in small groups. *Psychological Bulletin*, 63(6).
- Ricardo, D. (1817). *On the Principles of Political Economy and Taxation.*
- Brooks, F. P. (1975). *The Mythical Man-Month.*

Research that supports the assumptions (the defaults are not fitted to these studies):

- Hackman, J. R. (2002). *Leading Teams: Setting the Stage for Great Performances.* Harvard Business School Press.
- Huckman, R. S., Staats, B. R. & Upton, D. M. (2009). Team familiarity, role experience, and performance: Evidence from Indian software services. *Management Science*, 55(1).
- Ton, Z. & Huckman, R. S. (2008). Managing the impact of employee turnover on performance: The role of process conformance. *Organization Science*, 19(1).
- Hausknecht, J. P. & Trevor, C. O. (2011). Collective turnover at the group, unit, and organizational levels. *Journal of Management*, 37(1).
- Brockner, J. (1988). The effects of work layoffs on survivors: Research, theory, and practice. *Research in Organizational Behavior*, 10.
