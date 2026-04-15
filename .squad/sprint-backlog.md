# Sprint Backlog: Adaptive Mindfulness MVP

**Sprint Goal:** Ship an adaptive, engaging mindfulness MVP that measurably improves break completion and 7-day retention, with safe rollout controls.

**Sprint Duration:** 2 weeks (April 15–28, 2026)  
**Total Capacity:** 40 story points  
**Execution Strategy:** Dependency-based prioritization; P0 issues unblock P1; feature flags enable safe rollout

---

## P0 Issues (Must Complete - Unblocks P1)

### FEAT: Event Tracking Foundation for Break Lifecycle

**Story Points:** 8  
**Priority:** P0  
**Description:** Establish telemetry foundation for all adaptive features and insights dashboard.

**Acceptance Criteria:**
- [ ] Events tracked for: reminder_shown, break_started, break_completed, break_skipped, reminder_dismissed
- [ ] Each event includes timestamp and current language setting
- [ ] Events persist to LocalStorage in queryable format
- [ ] Tracking does not block UI interactions and adds no visible lag (<5ms overhead per event)
- [ ] Query API allows dashboard and adaptation logic to filter by date range, event type, and break ID

**Checklist:**
- [ ] Event schema defined in code comments
- [ ] EventTracker service created with async persistence
- [ ] Performance validated (no jank on low-end devices)
- [ ] Query utilities tested
- [ ] LocalStorage size monitored (warn at >1MB)

**Definition of Done:** Verified on phone + desktop, no regressions, feature flag ready

---

### FEAT: Energy Check-In Before Break Start

**Story Points:** 5  
**Priority:** P0  
**Description:** Allow users to self-report energy state before breaks to enable adaptive logic and insights.

**Acceptance Criteria:**
- [ ] Modal appears before break starts, asks "How's your energy?" (Low / Medium / High)
- [ ] User can skip check-in (flow continues with default "neutral" state)
- [ ] Energy entry stored with timestamp and linked to break ID
- [ ] Energy state appears in history view and insights summary
- [ ] Feature can be disabled via `energy_checkin` feature flag

**Checklist:**
- [ ] UI created; copy translated to Swedish/English
- [ ] Data model updated to track energy + break relationship
- [ ] Skip logic verified; defaults to neutral state
- [ ] History view updated to show energy indicator
- [ ] Tested on mobile (modal not cut off, tap targets ≥44px)

**Definition of Done:** Verified on phone + desktop, no regressions, feature flag ready

---

### FEAT: Adaptive Reminder Scheduler v1

**Story Points:** 10  
**Priority:** P0  
**Description:** Adjust next reminder based on 7-day completion/skip behavior; safe fallback to static schedule.

**Acceptance Criteria:**
- [ ] Scheduler analyzes last 7 days of break completion + skip data
- [ ] Logic adjusts next reminder time within configured min/max bounds
- [ ] User always sees at least `minRemindersPerDay` (default 2) reminders per day
- [ ] User never sees more than `maxRemindersPerDay` (default 4) reminders per day
- [ ] Adaptation logic can be toggled via `adaptive_scheduler_v1` feature flag
- [ ] If flag is OFF, falls back to original static schedule (no code changes needed)
- [ ] Only schedules reminders; does not delete or modify existing breaks

**Checklist:**
- [ ] Scheduler algorithm documented (comment block in code)
- [ ] First reminder always fires 24h before previous day's completion
- [ ] Min/max bounds enforced and tested
- [ ] Feature flag integration verified; fallback tested
- [ ] Edge cases: first break, empty history, no skips (all handled)
- [ ] Performance: scheduling runs in <100ms

**Definition of Done:** Verified on phone + desktop, no regressions, feature flag ready

---

### FEAT: Reminder Intensity Modes (Gentle/Standard/Persistent)

**Story Points:** 7  
**Priority:** P0  
**Description:** Empower users to control how aggressive reminders are; respects language switches and reloads.

**Acceptance Criteria:**
- [ ] Settings screen includes "Reminder Intensity" picker: Gentle / Standard / Persistent
- [ ] Gentle mode: 1 notification, waits 2h before re-notifying
- [ ] Standard mode: 1 notification, waits 1h before re-notifying  
- [ ] Persistent mode: Badge + notification, repeats every 15m until break started
- [ ] Selected mode persists to LocalStorage and survives app reload
- [ ] Selected mode persists across language switches
- [ ] Reminders respect the chosen intensity (no hardcoded behavior)

**Checklist:**
- [ ] Settings UI component updated
- [ ] Intensity modes defined as constants
- [ ] LocalStorage migration tested (existing users default to Standard)
- [ ] Reminder scheduler respects mode when determining next fire time
- [ ] Tested with language toggle (Swedish ↔ English) — mode preserved
- [ ] Tested across app reload — mode still active

**Definition of Done:** Verified on phone + desktop, no regressions, feature flag ready

---

## P1 Issues (High Value - Depends on P0)

### FEAT: Streaks with Grace Day Recovery

**Story Points:** 6  
**Priority:** P1  
**Depends On:** Event Tracking Foundation (P0 #1)  
**Description:** Gamification feature that rewards consistency while forgiving occasional missed days.

**Acceptance Criteria:**
- [ ] Streak counter increments when daily minimum (e.g., 2 breaks) is completed in a calendar day
- [ ] Grace day: user can miss 1 day per 7-day window without resetting streak to 0
- [ ] UI clearly shows: active streak length, grace days remaining, next 7-day reset date
- [ ] History view shows day-by-day streak status and grace usage
- [ ] Milestone badges appear at 7, 14, 21, 30-day streaks
- [ ] Feature can be toggled via `streaks_v1` feature flag

**Checklist:**
- [ ] Streak calculation logic tested (edge cases: DST transitions, skip month, grace used)
- [ ] UI components created; copy translated
- [ ] Milestones JSON defined and easy to extend
- [ ] Grace day re-calculation verified weekly
- [ ] Tested on phone + desktop

**Definition of Done:** Verified on phone + desktop, no regressions, feature flag ready

---

### FEAT: Weekly Insights Dashboard (Completion + Minutes + Trend)

**Story Points:** 8  
**Priority:** P1  
**Depends On:** Event Tracking Foundation (P0 #1)  
**Description:** Motivational dashboard showing 7-day summary and trends.

**Acceptance Criteria:**
- [ ] Dashboard shows: 7-day completion count, total mindful minutes, completion rate (%)
- [ ] Day-by-day trend chart (sparkline or bar chart) showing completion count per day
- [ ] Data is derived from tracked events and matches break history totals exactly
- [ ] Empty state appears with actionable guidance when <3 days of data
- [ ] Updated in real-time after each break completion
- [ ] Can export summary as .txt or .csv (stretch goal)

**Checklist:**
- [ ] Event query logic tested
- [ ] Data aggregation matches history totals (manual spot-check)
- [ ] Chart component selected (Recharts or Visx); tested on mobile/desktop
- [ ] Responsive: stacks vertically on mobile, horizontal on desktop
- [ ] Empty state copy is actionable ("Complete 3 breaks to see insights")
- [ ] Translated to Swedish/English

**Definition of Done:** Verified on phone + desktop, no regressions, feature flag ready

---

### TECH: Accessibility Baseline Pass (Mobile + Desktop)

**Story Points:** 5  
**Priority:** P1  
**Description:** Ensure app meets WCAG AA standards so all users can succeed.

**Acceptance Criteria:**
- [ ] All interactive controls keyboard accessible (Tab, Enter, Escape)
- [ ] Visible focus state on all buttons, inputs, and modals
- [ ] Color contrast ≥4.5:1 for primary text + buttons (WCAG AA)
- [ ] `prefers-reduced-motion: reduce` disables all non-essential animations (breaks, transitions, sparkles)
- [ ] Screen reader testing: landmarks, labels, and skip links work
- [ ] No console a11y warnings

**Checklist:**
- [ ] Run axe DevTools scan; fix all level AA violations
- [ ] Manual keyboard navigation test (all flows work with Tab)
- [ ] Reduced-motion tested in dev tools + real device
- [ ] Tested with screen reader (macOS VoiceOver or NVDA)
- [ ] Labels added to all form inputs and icon buttons
- [ ] Tabindex audit (no negative indices, logical tab order)

**Definition of Done:** Verified on phone + desktop, no regressions

---

### OPS: Feature Flags and Safe Rollout Controls

**Story Points:** 4  
**Priority:** P1  
**Description:** Enable rapid rollback and A/B testing without deployments.

**Acceptance Criteria:**
- [ ] Feature flags for: `adaptive_scheduler_v1`, `energy_checkin`, `streaks_v1`
- [ ] Flags defined in release config (e.g., `.env` or `config.json`)
- [ ] Flags can be switched OFF without code changes (toggle at runtime via local config)
- [ ] App behavior remains stable if any flag is disabled mid-session (no crashes, graceful fallback)
- [ ] Flag state logged to analytics for A/B segmentation
- [ ] Default state: all flags OFF in first rollout; enable incrementally

**Checklist:**
- [ ] Config loader tested for all flag combinations
- [ ] Each flag has unit test: on/off behavior verified
- [ ] Mid-session toggle tested (switch flag off while app running; no crash)
- [ ] Fallback UI/behavior clear (e.g., "Adaptive scheduler disabled")
- [ ] CI/CD updated to inject flags at build time (if applicable)

**Definition of Done:** No regressions, all rollback paths tested

---

## P2 Issues (Optional - Polish & Experimentation)

### EXP: A/B Experiment - Static vs Adaptive Reminders

**Story Points:** 6  
**Priority:** P2  
**Depends On:** Adaptive Reminder Scheduler v1 (P0 #3), Feature Flags (P1 #4)  
**Description:** Measure impact of adaptive scheduling on completion rate and retention.

**Acceptance Criteria:**
- [ ] Users assigned deterministically (based on user ID hash) to Control (static) or Variant (adaptive)
- [ ] Assignment stored in LocalStorage, stable across reloads
- [ ] Metrics captured per variant: completion rate, skip rate, median time-to-start, 7-day retention
- [ ] Event payload includes variant assignment; all events filterable by variant in analytics
- [ ] After 7+ days of data, export results as JSON or CSV
- [ ] Experiment runs alongside feature flag rollout; can be stopped by toggling `adaptive_scheduler_v1` OFF

**Checklist:**
- [ ] Experiment framework (assignment, logging) created
- [ ] Mutation hash algorithm tested (deterministic, uniform distribution)
- [ ] Event schema extended: includes `experiment_variant` field
- [ ] Query tooling: filter events by variant, compute per-variant metrics
- [ ] Results export format documented
- [ ] Power analysis: 80 users per variant = 90% power to detect 15% uplift

**Definition of Done:** Experiment running, metrics flowing, first dashboard deployed

---

## Definition of Done (All Issues)

A work item is complete when:

1. **Implemented and tested on phone + desktop**  
   - Manual smoke test on actual hardware or representative emulator
   - No jank or layout shifts
   - Touch targets ≥44px on mobile

2. **No build errors and no new high-severity UI regressions**  
   - `npm run build` succeeds with no errors or warnings
   - No console errors/warnings related to this feature
   - Existing screens (home, history, settings) still work

3. **Localized strings added for Swedish and English where applicable**  
   - UI text added to TRANSLATABLE_PHRASES array
   - Tested with language toggle (sv ↔ en)
   - Non-translatable strings (e.g., metric values) never stored as Swedish

4. **Feature flag fallback path verified**  
   - If applicable, flag OFF behavior tested
   - App gracefully degrades (no crashes, clear UX)
   - Feature appears only when flag is ON

5. **Acceptance criteria demonstrated in sprint review**  
   - Live demo covering all acceptance criteria
   - Edge cases and error conditions shown
   - Performance metrics shared if applicable

6. **Code committed and linked to issue**  
   - PR merged to `main`
   - Deployed to GitHub Pages automatically
   - Commit message references issue number

7. **Scribe updates history.md and decisions.md**  
   - Decisions logged if trade-offs were made
   - Key learnings captured for future sprints

---

## Execution Timeline

**Week 1 (Apr 15–21):**
- Mon–Tue: P0 #1 + P0 #2 (Event Tracking + Energy Check-In)
- Wed–Thu: P0 #3 + P0 #4 (Adaptive Scheduler + Intensity Modes)
- Fri: Testing & early P1 planning

**Week 2 (Apr 22–28):**
- Mon–Tue: P1 #1 + P1 #2 (Streaks + Insights Dashboard)
- Wed: P1 #3 + P1 #4 (Accessibility + Feature Flags)
- Thu: P2 #1 integration + experiment setup
- Fri: Sprint Review + Retro

---

## Success Metrics

By end of sprint:

- **Deployment:** All 9 issues merged to `main`; app live and stable for 3 days
- **Quality:** 0 high-severity regressions; feature flags OFF by default; rollback plan documented
- **UX:** 100% keyboard accessible; language toggle still working; no visible performance regressions
- **Data:** Event tracking capturing >95% of user actions with <5ms overhead
- **Experiment:** 50+ users per variant; statistically valid preliminary data ready for decision

---

## Notes

- All new UI strings go into `TRANSLATABLE_PHRASES` in `src/app/App.tsx`
- All async operations (event persistence) must not block UI (use `queueMicrotask` or `setTimeout(..., 0)`)
- Local storage quota is ~5MB on most browsers; monitor with `localStorage.getItem('__dbsize')` if needed
- Change CI/CD pipeline to inject feature flags at build time for future rollouts
