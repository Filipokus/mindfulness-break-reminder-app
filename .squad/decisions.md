# Squad Decisions

## Active Decisions

### Decision: Sprint Goal - Adaptive Mindfulness MVP (Apr 15–28)

**Context:**
Product has reached MVP status (bilingual, responsive, basic break tracking deployed). Next phase: ship adaptive features (event tracking, energy check-in, intelligent scheduling) and engagement mechanics (streaks, insights) to improve 7-day retention and completion rate.

**Option A:** Build features incrementally, one at a time, deploy as-is
- ✅ Simpler rollout
- ❌ Risk: users see incomplete experience; no A/B data to validate impact

**Option B (CHOSEN):** Ship coordinated P0→P1 sprint with feature flags and A/B test
- All adaptive features behind flags (OFF by default)
- 9 prioritized issues totaling 40 SP over 2 weeks
- Feature flags enable safe rollout: start with control group, expand to variant group after confidence built
- A/B experiment measures impact before full rollout

**Decision:** Option B — Feature flags + A/B testing model

**Rationale:**
- Risk is lower if we can disable features instantly
- Data-driven: we'll know if adaptive scheduling works before committing
- Scaleability: experiment framework enables future A/B tests
- Rollback path: if adaptive scheduler causes issues, just toggle `adaptive_scheduler_v1` OFF

**Accountability:** Lead  
**Status:** ✅ Approved (Apr 15, 2026)

---

### Decision: Feature Flags Default to OFF

**Context:**
All new features (adaptive_scheduler_v1, energy_checkin, streaks_v1) must default to OFF in production until we have confidence and rollout approval.

**Options:**
1. Default OFF, manually toggle per user (too slow)
2. Default OFF in code, toggle ON at build time in CI/CD (CHOSEN)
3. Randomized rollout via A/B framework (defer to experiment)

**Decision:** Option 2 — Config-driven feature flags, all OFF by default

**Implementation:**
- `.squad/config.json` defines all flags
- Flags can be toggled in runtime config without code changes
- CI/CD injects flags at build time
- Experiment framework (P2 #1) enables gradual rollout

**Accountability:** Lead  
**Status:** ✅ Approved (Apr 15, 2026)

---

### Decision: Streaming Updates to `.squad/history.md` During Sprint

**Context:**
Need real-time visibility into what each team member is shipping, blockers, and decisions made.

**Options:**
1. Weekly summary only (too late to catch blockers)
2. **Daily Scribe updates to `.squad/history.md`** (CHOSEN)
3. Slack thread (not searchable, not version-controlled)

**Decision:** Option 2 — Scribe logs daily to `.squad/history.md` in real-time; team comments on blockers in GitHub issues

**Format:**
- Section per day (Apr 15, Apr 16, etc.)
- Completed issues listed
- Blockers/decisions logged with context

**Accountability:** Scribe  
**Status:** ✅ Approved (Apr 15, 2026)

---

### Decision: P0 Issues Unblock P1 Strictly

**Context:**
9 issues; can't do all in parallel. Need dependency discipline.

**Dependency Graph:**
- P0 #1–4 (Event Tracking, Energy Check-In, Adaptive Scheduler, Intensity Modes) must complete BEFORE P1 work can proceed
  - P1 #1 (Streaks) depends on P0 #1 (Event Tracking)
  - P1 #2 (Insights Dashboard) depends on P0 #1 (Event Tracking)
  - P1 #4 (Feature Flags OPS) depends on P0 #3 (Adaptive Scheduler)
- P2 #1 (A/B Experiment) depends on P0 #3 + P1 #4; optional if behind schedule

**Rule:** Do not start a P1 issue until its P0 dependency has merged to `main`.

**Accountability:** Lead (enforce; escalate blockers immediately)  
**Status:** ✅ Approved (Apr 15, 2026)

---

## Governance

- All meaningful changes to sprint scope require team consensus documented here
- Architectural decisions logged with context and accountability
- Keep history focused on work, decisions focused on direction
- Any scope creep beyond 9 issues requires Lead + Developer approval

---

## Rollback Triggers

If any of these conditions occur, disable the related feature flag immediately:

| Issue | Flag | Rollback Trigger |
|-------|------|------------------|
| P0 #1 Event Tracking | `event_tracking` | >5ms overhead measured; >10% app crash rate; localStorage quota exceeded |
| P0 #2 Energy Check-In | `energy_checkin` | >20% skip rate; UI breaks on mobile; reminders not linked |
| P0 #3 Adaptive Scheduler | `adaptive_scheduler_v1` | Completion rate drops >10%; reminders missed; min/max bounds violated |
| P0 #4 Intensity Modes | `intensity_modes` | Reminders not respecting mode; persistence broken across reloads |
| P1 #1 Streaks | `streaks_v1` | Streak calculation incorrect; grace day not working; data persists incorrectly |
| P1 #2 Insights | No flag | Metrics don't match history totals; slow to render on low-end devices |
| P1 #3 Accessibility | No flag | WCAG violations found; keyboard navigation broken; reduced-motion not working |
| P1 #4 Feature Flags | No flag | Flag toggle breaks app; doesn't persist across reloads |
| P2 #1 A/B Experiment | `ab_experiment` | Assignment not deterministic; metrics don't flow; >5% data loss |

**Action:** If trigger occurs:
1. Scribe posts to decisions.md with timestamp + reason
2. Lead disables flag in config
3. Team debugs in next standup; log findings to decisions.md
4. Fix issue and re-enable flag after verification
