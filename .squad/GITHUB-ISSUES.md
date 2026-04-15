# GitHub Issue Bodies - Ready to Paste

> Copy each section below directly into GitHub Issues. Labels and assignees are suggested but can be customized.

---

## ISSUE #1: FEAT: Event Tracking Foundation for Break Lifecycle

**Labels:** `squad`, `feature`, `p0`, `sprint:2026-04-15`  
**Assignee:** Developer  
**Story Points:** 8  
**Depends On:** None

```markdown
# FEAT: Event Tracking Foundation for Break Lifecycle

## Description
Establish telemetry foundation for all adaptive features and insights dashboard. This issue creates the event tracking system that will power adaptive scheduling, streaks, and the weekly insights dashboard.

## Acceptance Criteria
- [ ] Events tracked for: `reminder_shown`, `break_started`, `break_completed`, `break_skipped`, `reminder_dismissed`
- [ ] Each event includes timestamp (ISO 8601) and current language setting (sv/en)
- [ ] Events persist to LocalStorage in queryable format
- [ ] Tracking does not block UI interactions and adds no visible lag (<5ms overhead per event)
- [ ] Query API allows dashboard and adaptation logic to filter by date range, event type, and break ID

## Technical Checklist
- [ ] Event schema defined in code comments (at least 10 lines)
- [ ] EventTracker service created with async persistence (use `queueMicrotask` to avoid blocking UI)
- [ ] Performance validated: no jank on Pixel 2 (slow device)
- [ ] Query utilities tested (filter by date, event type, break ID)
- [ ] LocalStorage size monitored; log warning if >1MB

## Definition of Done
- [ ] Verified on phone + desktop, no jank
- [ ] No build errors or console warnings
- [ ] Localized strings added to TRANSLATABLE_PHRASES (if any UI text)
- [ ] Feature flag `event_tracking` fallback verified (if applicable)
- [ ] Acceptance criteria demonstrated live in sprint review
- [ ] Commit message references this issue (#1)

## Notes
- See `.squad/sprint-backlog.md` for full details
- Unblocks: P1 #1 (Streaks), P1 #2 (Insights Dashboard)
```

---

## ISSUE #2: FEAT: Energy Check-In Before Break Start

**Labels:** `squad`, `feature`, `p0`, `sprint:2026-04-15`  
**Assignee:** Developer  
**Story Points:** 5  
**Depends On:** None

```markdown
# FEAT: Energy Check-In Before Break Start

## Description
Allow users to self-report energy state before breaks to enable adaptive logic and insights. This modal appears before each break starts, asking "How's your energy?" with Low/Medium/High options.

## Acceptance Criteria
- [ ] Modal appears before break starts, asks "How's your energy?" (Low / Medium / High)
- [ ] User can skip check-in (flow continues with default "neutral" state)
- [ ] Energy entry stored with timestamp and linked to break ID
- [ ] Energy state appears in history view and insights summary
- [ ] Feature can be disabled via `energy_checkin` feature flag (defaults to OFF)

## UI Checklist
- [ ] Modal copy translated to Swedish/English
- [ ] Tap targets ≥44px on mobile
- [ ] Modal not cut off on small screens (test on iPhone SE)
- [ ] Skip button clearly visible

## Data Model Checklist
- [ ] Energy entry added to break history object
- [ ] Timeline: energy checked at `break_started` event time
- [ ] Skip defaults to "neutral" in system logic (not shown to user)

## Integration Checklist
- [ ] History screen shows energy indicator (low=red, medium=yellow, high=green, or emoji)
- [ ] Insights dashboard can filter/summarize by energy
- [ ] Language toggle (sv↔en) works; energy state persists

## Definition of Done
- [ ] Verified on phone (iPhone SE, Android) + desktop
- [ ] No build errors or console warnings
- [ ] Localized strings in TRANSLATABLE_PHRASES
- [ ] Feature flag fallback verified (can disable and app still works)
- [ ] Acceptance criteria demonstrated in sprint review
- [ ] Commit message references this issue (#2)

## Notes
- See `.squad/sprint-backlog.md` for full details
- Works with: Energy Check-In (this issue), Adaptive Scheduler (P0 #3)
```

---

## ISSUE #3: FEAT: Adaptive Reminder Scheduler v1

**Labels:** `squad`, `feature`, `p0`, `sprint:2026-04-15`  
**Assignee:** Developer  
**Story Points:** 10  
**Depends On:** FEAT: Event Tracking Foundation (#1)

```markdown
# FEAT: Adaptive Reminder Scheduler v1

## Description
Adjust next reminder time based on last 7 days of break completion and skip behavior. Scheduler learns from user patterns and optimizes reminder timing within configured bounds, with safe fallback to static schedule if issues occur.

## Acceptance Criteria
- [ ] Scheduler analyzes last 7 days of break completion + skip data from Event Tracking
- [ ] Logic adjusts next reminder time within configured min/max bounds
- [ ] User always sees at least `minRemindersPerDay` (default 2) reminders per day
- [ ] User never sees more than `maxRemindersPerDay` (default 4) reminders per day
- [ ] Adaptation logic can be toggled via `adaptive_scheduler_v1` feature flag (defaults to OFF)
- [ ] If flag is OFF, falls back to original static schedule (no code changes needed)
- [ ] Only schedules reminders; does not delete or modify existing breaks

## Algorithm Checklist
- [ ] Scheduler algorithm documented in code comment block (≥15 lines)
- [ ] First reminder always fires 24h before previous day's completion
- [ ] Min/max bounds enforced and tested with unit tests
- [ ] Feature flag integration verified; fallback tested
- [ ] Edge cases tested:
  - [ ] First break (no history)
  - [ ] Empty history (no completions)
  - [ ] No skips (all completions)
  - [ ] All skips (no completions)
  - [ ] Boundary days (midnight UTC / device timezone)

## Performance Checklist
- [ ] Scheduling runs in <100ms (time it in DevTools)
- [ ] No jank when scheduler runs in background
- [ ] Query to past 7 days uses indexed lookups

## Definition of Done
- [ ] Verified on phone + desktop, no jank
- [ ] No build errors or console warnings
- [ ] Localized strings in TRANSLATABLE_PHRASES (if any)
- [ ] Feature flag fallback verified; disable flag and verify static schedule works
- [ ] Acceptance criteria demonstrated in sprint review
- [ ] Commit message references this issue (#3)

## Notes
- See `.squad/sprint-backlog.md` for full details
- Unblocks: P1 #4 (Feature Flags), P2 #1 (A/B Experiment)
- Related: FEAT: Reminder Intensity Modes (P0 #4) — scheduler respects intensity mode
- Critical for retention; measure completion rate before/after
```

---

## ISSUE #4: FEAT: Reminder Intensity Modes (Gentle/Standard/Persistent)

**Labels:** `squad`, `feature`, `p0`, `sprint:2026-04-15`  
**Assignee:** Developer  
**Story Points:** 7  
**Depends On:** None

```markdown
# FEAT: Reminder Intensity Modes (Gentle/Standard/Persistent)

## Description
Empower users to control how aggressive reminders are. Three modes offer different notification cadences; selected mode persists across reloads and language switches and is respected by adaptive scheduler.

## Acceptance Criteria
- [ ] Settings screen includes "Reminder Intensity" picker: Gentle / Standard / Persistent
- [ ] **Gentle mode:** 1 notification, waits 2h before re-notifying
- [ ] **Standard mode:** 1 notification, waits 1h before re-notifying
- [ ] **Persistent mode:** Badge + notification, repeats every 15m until break started
- [ ] Selected mode persists to LocalStorage and survives app reload
- [ ] Selected mode persists across language switches (sv↔en)
- [ ] Reminders respect the chosen intensity (not hardcoded elsewhere)

## UI Checklist
- [ ] Settings screen has radio button or picker UI for three modes
- [ ] Labels translated to Swedish/English
- [ ] Default mode: Standard
- [ ] Current mode clearly indicated in Settings

## Data Model Checklist
- [ ] `userPreferences.reminderIntensity` stored in LocalStorage
- [ ] Defaults to "standard" on first load
- [ ] Persists across language switches (data not translated)

## Integration Checklist
- [ ] Reminder scheduler queries `reminderIntensity` when firing
- [ ] Intensity mode respected: delay times enforced per mode
- [ ] Can toggle intensity mode at any time (even mid-break)
- [ ] Tested with language toggle: sv→en→sv, mode preserved

## Definition of Done
- [ ] Verified on phone + desktop, no jank
- [ ] No build errors or console warnings
- [ ] Localized strings in TRANSLATABLE_PHRASES
- [ ] Tested across app reload — mode still active
- [ ] Tested with language toggle — mode preserved
- [ ] Acceptance criteria demonstrated in sprint review
- [ ] Commit message references this issue (#4)

## Notes
- See `.squad/sprint-backlog.md` for full details
- Works with: Adaptive Scheduler (P0 #3) — scheduler respects mode
```

---

## ISSUE #5: FEAT: Streaks with Grace Day Recovery

**Labels:** `squad`, `feature`, `p1`, `sprint:2026-04-15`  
**Assignee:** Developer  
**Story Points:** 6  
**Depends On:** FEAT: Event Tracking Foundation (#1)

```markdown
# FEAT: Streaks with Grace Day Recovery

## Description
Gamification feature that rewards consistency while forgiving occasional missed days. Users unlock milestones at 7, 14, 21, and 30-day streaks. Grace day prevents harsh resets and encourages comeback attempts.

## Acceptance Criteria
- [ ] Streak counter increments when daily minimum (e.g., 2 breaks) is completed in a calendar day
- [ ] Grace day: user can miss 1 day per 7-day window without resetting streak to 0
- [ ] UI clearly shows: active streak length, grace days remaining, next 7-day reset date
- [ ] History view shows day-by-day streak status and grace usage
- [ ] Milestone badges appear at 7, 14, 21, 30-day streaks (with celebration animation)
- [ ] Feature can be toggled via `streaks_v1` feature flag (defaults to OFF)

## Calculation Checklist
- [ ] Streak increments only when daily minimum (2) breaks completed in UTC day (same as event tracking)
- [ ] Grace day logic: after grace used, resets at end of current 7-day window
- [ ] Edge cases tested:
  - [ ] DST transitions (spring forward / fall back)
  - [ ] Skip month (February)
  - [ ] Grace already used, then miss day (streak resets)
  - [ ] Complete break on grace day (grace not consumed)

## UI Checklist
- [ ] Home screen shows: "🔥 7 Day Streak" + "1 grace day left"
- [ ] Milestone badges appear with animation (respect `prefers-reduced-motion`)
- [ ] History view shows day status: ✅ (completed), 💤 (grace used), ❌ (missed)
- [ ] Settings show grace day usage per 7-day cycle
- [ ] Copy translated to Swedish/English

## Data Model Checklist
- [ ] `streaks` object tracks: `currentStreak`, `longestStreak`, `lastCompletionDate`, `graceDaysUsed`
- [ ] Milestone milestones array: `[7, 14, 21, 30]` (easy to extend)

## Definition of Done
- [ ] Verified on phone + desktop, no jank
- [ ] No build errors or console warnings
- [ ] Localized strings in TRANSLATABLE_PHRASES
- [ ] Feature flag fallback verified (disable flag, streak UI hidden)
- [ ] Acceptance criteria demonstrated in sprint review
- [ ] Commit message references this issue (#5)

## Notes
- See `.squad/sprint-backlog.md` for full details
- Unblocks: Nothing; can start once P0 #1 (Event Tracking) is done
- Related: P1 #2 (Insights Dashboard) — streaks visible in insights summary
```

---

## ISSUE #6: FEAT: Weekly Insights Dashboard (Completion + Minutes + Trend)

**Labels:** `squad`, `feature`, `p1`, `sprint:2026-04-15`  
**Assignee:** Developer  
**Story Points:** 8  
**Depends On:** FEAT: Event Tracking Foundation (#1)

```markdown
# FEAT: Weekly Insights Dashboard (Completion + Minutes + Trend)

## Description
Motivational dashboard showing 7-day summary and trends. Users see completion count, total mindful minutes, and day-by-day trend chart to understand their meditation progress at a glance.

## Acceptance Criteria
- [ ] Dashboard shows: 7-day completion count, total mindful minutes, completion rate (%)
- [ ] Day-by-day trend chart (sparkline or bar chart) showing completion count per day
- [ ] Data is derived from tracked events and matches break history totals exactly (manual spot-check required)
- [ ] Empty state appears with actionable guidance when <3 days of data
- [ ] Updated in real-time after each break completion
- [ ] Can export summary as .txt or .csv (stretch goal, can defer if time-constrained)

## Chart Checklist
- [ ] Chart component selected (e.g., Recharts or Visx)
- [ ] Works on mobile (stacks vertically) and desktop (horizontal)
- [ ] Responsive: no overflow, readable on small/large screens
- [ ] Tested on iPhone SE (small) and iPad (large)
- [ ] Respects `prefers-reduced-motion` (no animation if user prefers)

## Data Integrity Checklist
- [ ] Event query logic tested: filter by past 7 days
- [ ] Data aggregation matches history totals (developer spot-checks 3 days)
- [ ] Empty state shows when 0–2 days of data (copy: "Complete 3 breaks to see your insights")
- [ ] Updated live: after user completes break, dashboard refreshes automatically

## Localization Checklist
- [ ] All labels translated to Swedish/English
- [ ] Chart days-of-week respect locale (Mon–Sun in English, opposite in Swedish if applicable)
- [ ] Empty state copy translated

## Definition of Done
- [ ] Verified on phone + desktop, no jank
- [ ] No build errors or console warnings
- [ ] Localized strings in TRANSLATABLE_PHRASES
- [ ] Data verification: manual spot-check that totals match history
- [ ] Acceptance criteria demonstrated in sprint review
- [ ] Commit message references this issue (#6)

## Notes
- See `.squad/sprint-backlog.md` for full details
- Depends on: Event Tracking (P0 #1)
- Works with: Streaks (P1 #1) — streaks visible in insights summary
- Stretch goal: CSV export (skip if short on time)
```

---

## ISSUE #7: TECH: Accessibility Baseline Pass (Mobile + Desktop)

**Labels:** `squad`, `tech-debt`, `a11y`, `p1`, `sprint:2026-04-15`  
**Assignee:** Accessibility/QA  
**Story Points:** 5  
**Depends On:** None (but applies to entire app)

```markdown
# TECH: Accessibility Baseline Pass (Mobile + Desktop)

## Description
Ensure app meets WCAG AA standards so all users can succeed. This includes keyboard navigation, color contrast, screen reader support, and reduced-motion support.

## Acceptance Criteria
- [ ] All interactive controls keyboard accessible (Tab to navigate, Enter to activate, Escape to close)
- [ ] Visible focus state on all buttons, inputs, and modals (2px outline minimum)
- [ ] Color contrast ≥4.5:1 for primary text + buttons (WCAG AA standard)
- [ ] `prefers-reduced-motion: reduce` disables all non-essential animations (breaks slide-in, transitions, sparkles)
- [ ] Screen reader testing: landmarks, labels, and skip links work (tested with VoiceOver or NVDA)
- [ ] No console accessibility warnings

## Keyboard Navigation Checklist
- [ ] Tab order is logical (left→right, top→bottom)
- [ ] No negative `tabindex` values (remove all)
- [ ] All buttons, inputs, modals reachable via Tab
- [ ] Escape closes modals and dropdowns
- [ ] Enter/Space activates buttons
- [ ] Tested flows: Onboarding → Create Break → Start Break → History

## Color Contrast Checklist
- [ ] Text color (foreground) vs background ≥4.5:1 (use WAVE or axe DevTools)
- [ ] Primary buttons meet contrast
- [ ] Secondary buttons meet contrast
- [ ] Links have underline or other non-color indicator (not color alone)
- [ ] No "pink on red" or other low-contrast combinations

## Reduced-Motion Checklist
- [ ] DevTools: Settings → Rendering → Emulate CSS media feature prefers-reduced-motion: reduce
- [ ] All animations disabled: breaks don't slide in, transitions don't fade, no sparkles
- [ ] App still fully usable and readable (no layout shifts)
- [ ] Tested on macOS (System Preferences → Accessibility → Display → Reduce motion)

## Screen Reader Checklist
- [ ] All form inputs have `<label>` associated via `htmlFor`
- [ ] Icon buttons have `aria-label` (e.g., `<button aria-label="Close">✕</button>`)
- [ ] Modals have `role="dialog"` and `aria-labelledby`
- [ ] Tested with: macOS VoiceOver (Cmd+F5) or NVDA (Windows)
- [ ] Landmarks exist: `<main>`, `<nav>` if applicable

## Tools Checklist
- [ ] Run axe DevTools browser extension; 0 level AA violations
- [ ] Run WAVE browser extension; 0 errors + <5 warnings (mostly info)
- [ ] Manual keyboard navigation test (all flows work)
- [ ] Manual screen reader test (landmarks, labels audible)

## Definition of Done
- [ ] All checklist items verified
- [ ] No build errors or console warnings
- [ ] Commit message: "Add WCAG AA accessibility baseline: keyboard navigation, color contrast, reduced-motion, screen reader support"
- [ ] Demonstrated in sprint review (live keyboard navigation + DevTools validation)

## Notes
- See `.squad/sprint-backlog.md` for full details
- Applies to entire app, not a single feature
- Related: All P0/P1 issues must respect accessibility (inheritance)
```

---

## ISSUE #8: OPS: Feature Flags and Safe Rollout Controls

**Labels:** `squad`, `ops`, `p1`, `sprint:2026-04-15`  
**Assignee:** Developer/DevOps  
**Story Points:** 4  
**Depends On:** FEAT: Adaptive Scheduler (P0 #3)

```markdown
# OPS: Feature Flags and Safe Rollout Controls

## Description
Enable rapid rollback and A/B testing without code deployments. All new features toggle-able via config; flags OFF by default for safe rollout; each flag has documented fallback behavior.

## Acceptance Criteria
- [ ] Feature flags for: `adaptive_scheduler_v1`, `energy_checkin`, `streaks_v1`
- [ ] Flags defined in release config (e.g., `.squad/config.json` initially; move to `.env` in future)
- [ ] Flags can be switched OFF without code changes (toggle in config, no rebuild needed)
- [ ] App behavior remains stable if any flag is disabled mid-session (no crashes, graceful fallback)
- [ ] Flag state logged to analytics for A/B segmentation (if analytics enabled)
- [ ] Default state: all flags OFF in first rollout; enable incrementally via config

## Config Checklist
- [ ] Flag schema defined in code comment (which flags, default values, descriptions)
- [ ] `.squad/config.json` updated with all flags (all `false` initially)
- [ ] Config loader reads flags on app init
- [ ] Flags accessible to all components that need them

## Testing Checklist
- [ ] Unit test: each flag ON/OFF behavior verified
- [ ] Unit test: mid-session toggle (switch flag off while app running; no crash)
- [ ] Integration test: all flag combinations tested (2^3 = 8 combinations)
- [ ] Fallback UI/behavior clear: e.g., "Adaptive controller disabled" if flag OFF
- [ ] App is stable in all 8 flag combinations

## Deployment Checklist
- [ ] Initial rollout: all flags OFF
- [ ] Documentation: how to toggle flags (add comment in `.squad/decisions.md`)
- [ ] Rollback plan: if `adaptive_scheduler_v1` causes issues, just toggle OFF (no redeploy)
- [ ] Feature flag state visible in UI (optional; can log to console for now)

## Definition of Done
- [ ] All flags toggleable without code changes
- [ ] No crashes or regressions in any flag combination
- [ ] Fallback paths tested and working
- [ ] Commit message references this issue (#8)

## Notes
- See `.squad/sprint-backlog.md` for full details
- Enables: P2 #1 (A/B Experiment)
- Critical for safe rollout; if unsure, **disable flag first**, then debug
```

---

## ISSUE #9: EXP: A/B Experiment - Static vs Adaptive Reminders

**Labels:** `squad`, `experiment`, `p2`, `sprint:2026-04-15`  
**Assignee:** Developer  
**Story Points:** 6  
**Depends On:** FEAT: Adaptive Scheduler (P0 #3), OPS: Feature Flags (P1 #4)  
**Priority:** P2 (optional; pull in if ahead of schedule)

```markdown
# EXP: A/B Experiment - Static vs Adaptive Reminders

## Description
Measure impact of adaptive scheduling on completion rate and retention. Users assigned to Control (static schedule) or Variant (adaptive schedule); metrics captured per variant to enable data-driven decision on full rollout.

## Acceptance Criteria
- [ ] Users assigned deterministically (based on user ID hash) to Control (static) or Variant (adaptive)
- [ ] Assignment stored in LocalStorage, stable across reloads
- [ ] Metrics captured per variant: completion rate, skip rate, median time-to-start, 7-day retention
- [ ] Event payload includes `experiment_variant` field; all events filterable by variant
- [ ] After 7+ days of data, export results as JSON or CSV
- [ ] Experiment runs alongside feature flag rollout; can be stopped by toggling `adaptive_scheduler_v1` OFF

## Assignment Checklist
- [ ] Deterministic hash algorithm (e.g., `hash(userId) % 2 = 0 ? 'control' : 'variant'`)
- [ ] 50/50 split (verify distribution after 100 users)
- [ ] Assignment stored in `userProfile.experimentVariant`
- [ ] Assignment survives language switch
- [ ] Assignment survives app reload

## Event Logging Checklist
- [ ] All events include: `timestamp`, `eventType`, `experimentVariant`, `language`, `userId`
- [ ] Metrics queryable: filter by `experimentVariant` and date range
- [ ] Sample events logged for testing (100 events minimum)

## Metrics Calculation Checklist
- [ ] **Completion rate:** (completed breaks / total breaks shown) × 100 per variant
- [ ] **Skip rate:** (skipped reminders / total reminders shown) × 100 per variant
- [ ] **Median time-to-start:** median seconds from reminder shown to break started
- [ ] **7-day retention:** users with ≥1 break on day 7 / users on day 1 (per variant)
- [ ] Manual spot-check: verify calculations on first 10 days of data

## Export Checklist
- [ ] Results export as JSON: `{ control: { completion_rate, skip_rate, median_time_to_start }, variant: {...} }`
- [ ] Export available after 7 days of min 50 users per variant
- [ ] Filename: `ab_experiment_results_YYYY-MM-DD.json`

## Definition of Done
- [ ] Experiment running, metrics flowing
- [ ] Assignment deterministic and balanced
- [ ] First dashboard deployed (manual query or simple visualization)
- [ ] Acceptance criteria demonstrated in sprint review
- [ ] Commit message references this issue (#9)

## Notes
- See `.squad/sprint-backlog.md` for full details
- Depends on: P0 #3 (Adaptive Scheduler), P1 #4 (Feature Flags)
- **P2 priority:** Start only if P0/P1 ahead of schedule (by Wed 20th end-of-day)
- Success: 80 users per variant enables 90% power to detect 15% uplift in completion rate
- Related: Feature Flags (P1 #4) — experiment uses `adaptive_scheduler_v1` flag to switch variants
```

---

## How to Use These

1. **Copy each section** (between the triple backticks)
2. **Go to GitHub Issues** → New Issue
3. **Paste into the issue body**
4. **Fill in:**
   - Title (already provided in header)
   - Labels (suggested in header)
   - Assignee (suggested in header)
5. **Submit and link to sprint backlog**

---

## Suggested Order in GitHub

| # | Title | Suggested Order |
|---|-------|-----------------|
| 1 | FEAT: Event Tracking Foundation | Create first (P0 blockers) |
| 2 | FEAT: Energy Check-In Before Break Start | Create 1–2 |
| 3 | FEAT: Adaptive Reminder Scheduler v1 | Create 3–4 |
| 4 | FEAT: Reminder Intensity Modes | Create 3–4 |
| 5 | FEAT: Streaks with Grace Day Recovery | Create after P0 done |
| 6 | FEAT: Weekly Insights Dashboard | Create after P0 done |
| 7 | TECH: Accessibility Baseline Pass | Create with P1 batch |
| 8 | OPS: Feature Flags and Safe Rollout | Create with P1 batch |
| 9 | EXP: A/B Experiment | Create last (P2 optional) |

**Batch creation workflow:**
- Mon 15th AM: Create all 9 issues at once → add `squad` label to all → Lead triages and assigns `squad:{developer}:P0` labels to issues 1–4
- Dev starts on P0 #1–4 in parallel where dependencies allow
- P1 (issues 5–8) created but marked `blocked` until P0 completes

---

## Labels to Create (if they don't exist)

- `p0` — Critical path blocker
- `p1` — High-value feature
- `p2` — Optional / nice-to-have
- `squad` — Triaged and ready for assignment
- `sprint:2026-04-15` — Sprint identifier (all sprint issues tagged)
- `a11y` — Accessibility-related
- `experiment` — A/B test or research

These labels help filter sprint work and track progress across the backlog.
