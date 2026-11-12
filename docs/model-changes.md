# What changed from the NetLogo model

The original NetLogo model (`netlogo/product_team_collab_agent_based_model.nlogo`) showed the core idea: perceived output (headcount × full productivity) versus real output. Reviewing it turned up these issues. Each one is fixed in `src/model.ts`.

| # | Original behaviour | Problem | Now |
|---|---|---|---|
| 1 | Seniors start at 3 points and juniors at 1.5. Both gain 1.5 points every 3 months up to the same 7.5 cap. | Seniors are only about 3 months ahead, and identical after a year. "Seniors produce much more" only held briefly. | Seniors ramp to 100% in about 6 months. Juniors ramp to 60%, then grow to 100% over about 2 years. Salary ratio is a parameter, so output per cost can be compared. |
| 2 | A team that reaches 10 splits into two teams of 5 at no cost. | With 6% decay, splitting instantly raised output by about 36%, so reorgs looked like free wins. | Splits and merges cost cohesion (the team falls back a Tuckman stage). |
| 3 | Team output = points × 0.94^(n-1). | This peaks at about 16 people, not 10 as the README says. | Pairwise communication overhead, 1 / (1 + c·n(n-1)/2), calibrated to peak at 10-12. Tested. |
| 4 | No cost between teams. | At steady state 20 teams = 20 × one team, so the model only showed a temporary dip, never a scale penalty. | Coordination overhead per extra team. |
| 5 | Hires are random 0-3 per month, with the remainder dumped every 11 ticks (`ticks mod 11`). | Years were 11 months long, and the remainder created artificial hiring spikes. | Hires spread evenly over a 12-month year. Tested to hit the exact yearly number. |
| 6 | No departures. | Layoffs, turnover and knowledge loss could not be shown. | Layoff event, yearly turnover, knowledge loss per leaver, survivor morale drop and extra turnover after a layoff. Compared against a no-layoff baseline. |
| 7 | One random run. | Results were noisy, especially early on. | Many seeded runs, median plus 10-90% band. Deterministic per seed. |
| 8 | Teams are identified by colour; a split team could get the grey colour reserved for new joiners. | That team never received new members again. | Teams have ids; colour is only used for display. |
| - | Team stage was derived from absolute team points (≤15, ≤20, ≤30). | Stage depended on team size and seniority rather than time together. | Each team has a cohesion value that grows with time together and drops on change. Stage comes from cohesion. |
| - | Licensed CC BY-NC-SA 4.0. | Made for creative works rather than code. | All rights reserved: code public for reference, simulator free to use. |
| - | Output was measured against a frictionless ideal (every person 100% productive, no overhead). | Even an established organisation with no changes started at about 72%, which suggested knowledge about the current team that the model does not have. | Output is relative to today's organisation once ramped up: an established team starts at 100% and stays there if nothing changes. |
| - | People who left were never replaced, and turnover did not affect anyone who stayed. | Even 49% yearly turnover looked harmless: output simply shrank with headcount. | Leavers are replaced after a vacancy period (toggle) and replacements ramp up from scratch. Turnover above a healthy level lowers everyone's output (atmosphere). |
