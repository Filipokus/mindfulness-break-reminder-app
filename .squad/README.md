# Squad Sprint Execution Guide

**Active Sprint:** Adaptive Mindfulness MVP (Apr 15–28, 2026)

---

## TL;DR — How to Execute This Sprint

1. **Read:** [team.md](team.md) for sprint context
2. **Reference:** [sprint-backlog.md](sprint-backlog.md) for all 9 issues + acceptance criteria
3. **Follow:** [routing.md](routing.md) for how work flows through the squad
4. **Track Progress:** [decisions.md](decisions.md) for blockers + rollback triggers
5. **Daily Standup:** Comment in GitHub issues; Scribe logs to [history.md](history.md)
6. **Review:** [ceremonies.md](ceremonies.md) for Sprint Planning + Review structure

---

## Sprint Goal

**Ship an adaptive, engaging mindfulness MVP that measurably improves break completion and 7-day retention, with safe rollout controls.**

- **9 prioritized issues:** 4 P0 (blockers), 4 P1 (high-value), 1 P2 (optional)
- **40 story points** of capacity over 2 weeks
- **All features behind feature flags** (OFF by default) for safe rollout
- **A/B experiment** to measure adaptive scheduler impact before full rollout

---

## How Work Flows

### Week 1: Foundation (P0 Issues)

```
Mon–Tue: P0 #1 (Event Tracking) + P0 #2 (Energy Check-In) in parallel
    ↓
Wed–Thu: P0 #3 (Adaptive Scheduler) + P0 #4 (Intensity Modes) in parallel
    ↓
Fri: Testing & early P1 planning
```

**What unblocks:** All P1 issues depend on ≥1 P0 issue completing

### Week 2: Features + Quality (P1 Issues)

```
Mon–Tue: P1 #1 (Streaks) + P1 #2 (Insights)
    ↓
Wed: P1 #3 (Accessibility) + P1 #4 (Feature Flags)
    ↓
Thu: P2 #1 (A/B Experiment) if on schedule
    ↓
Fri: Sprint Review + Retrospective
```

---

## Issue Routing & Assignment

**In GitHub:**
1. Each issue gets a `squad` label by Lead (inbox)
2. Lead triages → assigns `squad:{developer}:{priority}` label
3. Developer picks up issue and executes
4. When ready for QA: add `squad:testing` label
5. When ready to merge: add `squad:deployed` label
6. After merge: Scribe logs to `history.md`

**Feature Flags:**
- All flags default to `false` in [config.json](config.json)
- Each issue documents which flags it uses
- Flags can be toggled OFF to rollback without deploying

---

## Feature Flag Philosophy

**Default Safe:** All new features OFF in production until approved

**Rollout Path:**
1. Merge code with flag OFF (safe)
2. Monitor for 24–48h (no impact)
3. Toggle flag ON for 10% of users (experiment group)
4. Monitor metrics (completion rate, crashes, LAG)
5. If good: toggle ON for 100%
6. If bad: toggle OFF (instant rollback, no redeploy)

**Flags in this sprint:**
- `adaptive_scheduler_v1` — Intelligent reminder scheduling
- `energy_checkin` — Energy state before break
- `streaks_v1` — Streak counter + grace days
- `intensity_modes` — User-controlled reminder frequency (always ON; no flag)

---

## Definition of Done (ALL Issues)

An issue is complete when:

1. ✅ **Implemented and tested** on phone + desktop (no jank, touch targets ≥44px)
2. ✅ **No build errors** and no new UI regressions (0 console errors)
3. ✅ **Localized** (Swedish + English in `TRANSLATABLE_PHRASES`)
4. ✅ **Feature flag fallback verified** (if applicable; app graceful when OFF)
5. ✅ **Acceptance criteria demonstrated** in sprint review (live demo)
6. ✅ **Committed & deployed** (PR merged to `main`; live on GitHub Pages)
7. ✅ **History logged** (Scribe updates `history.md` with what changed + learnings)

---

## Rollback Triggers

If any of these happen, **disable the feature flag immediately:**

| Issue | Trigger |
|-------|---------|
| Event Tracking | >5ms overhead; crashes; localStorage full |
| Energy Check-In | >20% users skip; UI breaks mobile |
| Adaptive Scheduler | Completion ↓10%; misses reminders; bounds broken |
| Intensity Modes | Reminders don't respect mode; breaks persist |
| Streaks | Incorrect calculation; grace day fails |
| Insights | Metrics don't match history |
| Accessibility | WCAG violations; keyboard broken |
| Feature Flags | Toggle breaks app; doesn't persist |
| A/B Experiment | Assignment not deterministic; metrics lost |

**Action:** 1. Post to `decisions.md`, 2. Disable flag, 3. Debug in standup

---

## Daily Standup Format (Async)

Comment in the GitHub issue you're working on:

```
**[UPDATE] Mon Apr 15**
- Completed: Event schema design + persistence tests
- Working today: Implement EventTracker service
- Blocked: [none]
```

**Scribe:** Logs each update to [history.md](history.md) daily

---

## Success Metrics

By end of sprint:

- ✅ All 9 issues merged to `main`
- ✅ Zero high-severity regressions
- ✅ Feature flags OFF by default; safe rollout path documented
- ✅ 100% keyboard accessible (WCAG AA)
- ✅ Event tracking <5ms overhead; >95% capture rate
- ✅ A/B experiment: 50+ users per variant for statistically valid preliminary data

---

## Key Files Reference

| File | Purpose |
|------|---------|
| [sprint-backlog.md](sprint-backlog.md) | All 9 issues, acceptance criteria, story points, dependencies |
| [team.md](team.md) | Sprint context, team roles, how to begin |
| [routing.md](routing.md) | Work assignment model, label scheme, routing rules |
| [ceremonies.md](ceremonies.md) | Sprint Planning, Daily Standup, Sprint Review |
| [decisions.md](decisions.md) | Feature flag strategy, rollback triggers, active decisions |
| [config.json](config.json) | Sprint metadata, feature flags (all OFF), timeline |
| [history.md](history.md) | Daily progress log; Scribe updates this in real-time |

---

## Next Steps

1. **Monday 15th AM:** Lead runs Sprint Planning
   - Triage all 9 issues in GitHub
   - Assign `squad:{developer}:{P0}` labels
   - Confirm team understands Definition of Done

2. **Monday 15th PM:** Development starts
   - Developer picks up first issue
   - Tester begins writing acceptance test cases
   - Scribe begins daily logging

3. **Friday 28th:** Sprint Review
   - Demo each completed issue
   - Verify acceptance criteria
   - Collect feedback for next sprint

---

## Questions?

- **"What's the acceptance criteria for issue X?"** → See [sprint-backlog.md](sprint-backlog.md)
- **"How do I route this work?"** → See [routing.md](routing.md)
- **"What's the feature flag status?"** → See [config.json](config.json)
- **"What decisions have we made?"** → See [decisions.md](decisions.md)
- **"Why did the schedule change?"** → See [history.md](history.md) + [decisions.md](decisions.md)
