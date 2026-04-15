$repo = "Filipokus/mindfulness-break-reminder-app"

Write-Host "Creating issue 1/9..."
gh issue create --repo $repo --title "FEAT: Event Tracking Foundation for Break Lifecycle" --label "enhancement" --body @"
## Description
Establish telemetry foundation for all adaptive features and insights dashboard.

## Acceptance Criteria
- [ ] Events tracked for: reminder_shown, break_started, break_completed, break_skipped, reminder_dismissed
- [ ] Each event includes timestamp (ISO 8601) and current language setting (sv/en)
- [ ] Events persist to LocalStorage in queryable format
- [ ] Tracking does not block UI interactions (<5ms overhead per event)
- [ ] Query API allows filtering by date range, event type, and break ID

## Technical Checklist
- [ ] Event schema defined in code comments
- [ ] EventTracker service created with async persistence (queueMicrotask)
- [ ] Performance validated: no jank on low-end devices
- [ ] Query utilities tested (filter by date, event type, break ID)
- [ ] LocalStorage size monitored; warn if >1MB

## Definition of Done
- [ ] Verified on phone + desktop
- [ ] No build errors or console warnings
- [ ] Localized strings added to TRANSLATABLE_PHRASES (if any)
- [ ] Acceptance criteria demonstrated in sprint review

**Priority:** P0 | **Story Points:** 8 | **Sprint:** 2026-04-15
Unblocks: Streaks (P1 #5), Insights Dashboard (P1 #6)
"@

Write-Host "Creating issue 2/9..."
gh issue create --repo $repo --title "FEAT: Energy Check-In Before Break Start" --label "enhancement" --body @"
## Description
Allow users to self-report energy state (Low/Medium/High) before breaks to enable adaptive logic and insights.

## Acceptance Criteria
- [ ] Modal appears before break starts asking How is your energy? (Low / Medium / High)
- [ ] User can skip check-in; flow continues with default neutral state
- [ ] Energy entry stored with timestamp and linked to break ID
- [ ] Energy state appears in history view and insights summary
- [ ] Feature can be disabled via energy_checkin feature flag (defaults to OFF)

## UI Checklist
- [ ] Modal copy translated to Swedish/English
- [ ] Tap targets >= 44px on mobile
- [ ] Modal not cut off on small screens (test iPhone SE)
- [ ] Skip button clearly visible

## Definition of Done
- [ ] Verified on phone + desktop
- [ ] No build errors or console warnings
- [ ] Localized strings in TRANSLATABLE_PHRASES
- [ ] Feature flag fallback verified
- [ ] Acceptance criteria demonstrated in sprint review

**Priority:** P0 | **Story Points:** 5 | **Sprint:** 2026-04-15
"@

Write-Host "Creating issue 3/9..."
gh issue create --repo $repo --title "FEAT: Adaptive Reminder Scheduler v1" --label "enhancement" --body @"
## Description
Adjust next reminder time based on last 7 days of break completion and skip behavior. Safe fallback to static schedule if feature flag is OFF.

## Acceptance Criteria
- [ ] Scheduler analyzes last 7 days of break completion + skip data from Event Tracking
- [ ] Logic adjusts next reminder time within configured min/max bounds
- [ ] User always sees at least minRemindersPerDay (default 2) reminders per day
- [ ] User never sees more than maxRemindersPerDay (default 4) reminders per day
- [ ] Toggled via adaptive_scheduler_v1 feature flag (defaults to OFF)
- [ ] Falls back to original static schedule when flag is OFF
- [ ] Only schedules reminders; does not delete or modify existing breaks

## Algorithm Checklist
- [ ] Algorithm documented in code comment block (>= 15 lines)
- [ ] Min/max bounds enforced and unit tested
- [ ] Edge cases: first break, empty history, all skips, all completions, midnight UTC
- [ ] Scheduling runs in < 100ms

## Definition of Done
- [ ] Verified on phone + desktop
- [ ] No build errors or console warnings
- [ ] Feature flag fallback verified (static schedule when OFF)
- [ ] Acceptance criteria demonstrated in sprint review

**Priority:** P0 | **Story Points:** 10 | **Sprint:** 2026-04-15
Depends on: #1 (Event Tracking)
Unblocks: #8 (Feature Flags), #9 (A/B Experiment)
"@

Write-Host "Creating issue 4/9..."
gh issue create --repo $repo --title "FEAT: Reminder Intensity Modes (Gentle/Standard/Persistent)" --label "enhancement" --body @"
## Description
Empower users to control reminder aggressiveness. Three modes with different notification cadences; persists across reloads and language switches.

## Acceptance Criteria
- [ ] Settings screen includes Reminder Intensity picker: Gentle / Standard / Persistent
- [ ] Gentle mode: 1 notification, waits 2h before re-notifying
- [ ] Standard mode: 1 notification, waits 1h before re-notifying
- [ ] Persistent mode: badge + notification, repeats every 15m until break started
- [ ] Selected mode persists to LocalStorage and survives app reload
- [ ] Selected mode persists across language switches (sv/en)
- [ ] Reminders respect chosen intensity (not hardcoded elsewhere)

## Checklist
- [ ] Settings UI updated with mode picker (radio or select)
- [ ] Labels translated Swedish/English
- [ ] Default mode: Standard (existing users migrated)
- [ ] Tested: reload preserves mode
- [ ] Tested: language toggle preserves mode
- [ ] Reminder scheduler queries reminderIntensity when firing

## Definition of Done
- [ ] Verified on phone + desktop
- [ ] No build errors or console warnings
- [ ] Localized strings in TRANSLATABLE_PHRASES
- [ ] Acceptance criteria demonstrated in sprint review

**Priority:** P0 | **Story Points:** 7 | **Sprint:** 2026-04-15
"@

Write-Host "Creating issue 5/9..."
gh issue create --repo $repo --title "FEAT: Streaks with Grace Day Recovery" --label "enhancement" --body @"
## Description
Gamification feature that rewards consistency while forgiving occasional missed days. Milestone badges at 7, 14, 21, and 30-day streaks.

## Acceptance Criteria
- [ ] Streak increments when daily minimum (2 breaks) is completed in a calendar day
- [ ] Grace day: user can miss 1 day per 7-day window without resetting streak
- [ ] UI clearly shows: active streak, grace days remaining, next 7-day reset date
- [ ] History view shows day-by-day streak status and grace usage
- [ ] Milestone badges at 7, 14, 21, 30-day streaks with celebration animation
- [ ] Feature toggled via streaks_v1 feature flag (defaults to OFF)

## Calculation Checklist
- [ ] Streak increments on UTC calendar day boundary
- [ ] Edge cases: DST transitions, February, grace already used then miss, complete on grace day

## UI Checklist
- [ ] Home screen shows streak + grace days remaining
- [ ] Milestones animate (respect prefers-reduced-motion)
- [ ] History shows: completed / grace used / missed per day
- [ ] Copy translated Swedish/English

## Definition of Done
- [ ] Verified on phone + desktop
- [ ] No build errors or console warnings
- [ ] Localized strings in TRANSLATABLE_PHRASES
- [ ] Feature flag fallback verified
- [ ] Acceptance criteria demonstrated in sprint review

**Priority:** P1 | **Story Points:** 6 | **Sprint:** 2026-04-15
Depends on: #1 (Event Tracking)
"@

Write-Host "Creating issue 6/9..."
gh issue create --repo $repo --title "FEAT: Weekly Insights Dashboard (Completion + Minutes + Trend)" --label "enhancement" --body @"
## Description
Motivational dashboard showing 7-day summary: completion count, mindful minutes, and day-by-day trend chart.

## Acceptance Criteria
- [ ] Dashboard shows: 7-day completion count, total mindful minutes, completion rate (%)
- [ ] Day-by-day trend chart showing completion count per day
- [ ] Data derived from tracked events and matches break history totals exactly
- [ ] Empty state with actionable guidance when < 3 days of data
- [ ] Updates in real-time after each break completion
- [ ] Stretch goal: export as .txt or .csv

## Checklist
- [ ] Chart component chosen (Recharts or Visx); responsive on mobile + desktop
- [ ] Data aggregation spot-checked against history totals (3 days manual check)
- [ ] Empty state copy: Complete 3 breaks to see your insights
- [ ] All labels translated Swedish/English
- [ ] Respects prefers-reduced-motion (no animation)

## Definition of Done
- [ ] Verified on phone + desktop
- [ ] No build errors or console warnings
- [ ] Localized strings in TRANSLATABLE_PHRASES
- [ ] Acceptance criteria demonstrated in sprint review

**Priority:** P1 | **Story Points:** 8 | **Sprint:** 2026-04-15
Depends on: #1 (Event Tracking)
"@

Write-Host "Creating issue 7/9..."
gh issue create --repo $repo --title "TECH: Accessibility Baseline Pass (Mobile + Desktop)" --label "enhancement" --body @"
## Description
Ensure app meets WCAG AA standards: keyboard navigation, color contrast, screen reader support, and reduced-motion.

## Acceptance Criteria
- [ ] All interactive controls keyboard accessible (Tab, Enter, Escape)
- [ ] Visible focus state on all buttons, inputs, and modals (2px outline minimum)
- [ ] Color contrast >= 4.5:1 for primary text and buttons (WCAG AA)
- [ ] prefers-reduced-motion disables all non-essential animations
- [ ] Screen reader: landmarks, labels, and skip links work
- [ ] No console accessibility warnings

## Keyboard Checklist
- [ ] Logical tab order (no negative tabindex)
- [ ] All flows reachable: Onboarding, Create Break, Start Break, History
- [ ] Escape closes modals and dropdowns

## Color Contrast Checklist
- [ ] Primary text vs background >= 4.5:1 (axe DevTools)
- [ ] Primary and secondary buttons meet contrast
- [ ] Links have non-color indicator

## Screen Reader Checklist
- [ ] All inputs have associated label via htmlFor
- [ ] Icon buttons have aria-label
- [ ] Modals have role=dialog and aria-labelledby
- [ ] Tested: macOS VoiceOver or NVDA

## Definition of Done
- [ ] axe DevTools: 0 level AA violations
- [ ] Manual keyboard navigation test (all flows)
- [ ] Reduced-motion tested in DevTools
- [ ] Acceptance criteria demonstrated in sprint review

**Priority:** P1 | **Story Points:** 5 | **Sprint:** 2026-04-15
"@

Write-Host "Creating issue 8/9..."
gh issue create --repo $repo --title "OPS: Feature Flags and Safe Rollout Controls" --label "enhancement" --body @"
## Description
Enable rapid rollback without code deployments. All new features toggle-able via config; all flags OFF by default.

## Acceptance Criteria
- [ ] Feature flags for: adaptive_scheduler_v1, energy_checkin, streaks_v1
- [ ] Flags defined in release config (can be toggled without code changes)
- [ ] App behavior stable if any flag disabled mid-session (no crashes, graceful fallback)
- [ ] Flag state can be logged for A/B segmentation
- [ ] Default: all flags OFF in first rollout

## Checklist
- [ ] Flag schema defined with descriptions and default values
- [ ] Config loader reads flags on app init
- [ ] Unit tests: each flag ON/OFF behavior
- [ ] Mid-session toggle tested: disable flag while app running, no crash
- [ ] All 8 flag combinations tested (2^3)
- [ ] Initial rollout: all flags OFF confirmed

## Definition of Done
- [ ] All flags toggleable without code changes
- [ ] No crashes or regressions in any flag combination
- [ ] Fallback paths tested and working
- [ ] Acceptance criteria demonstrated in sprint review

**Priority:** P1 | **Story Points:** 4 | **Sprint:** 2026-04-15
Depends on: #3 (Adaptive Scheduler)
Enables: #9 (A/B Experiment)
"@

Write-Host "Creating issue 9/9..."
gh issue create --repo $repo --title "EXP: A/B Experiment - Static vs Adaptive Reminders" --label "enhancement" --body @"
## Description
Measure impact of adaptive scheduling on completion rate and retention. Users assigned deterministically to Control (static) or Variant (adaptive).

## Acceptance Criteria
- [ ] Users assigned deterministically (hash-based) to control or adaptive variant
- [ ] Assignment stored in LocalStorage, stable across reloads and language switches
- [ ] Metrics captured per variant: completion rate, skip rate, median time-to-start, 7-day retention
- [ ] Event payload includes experiment_variant field; filterable in analytics
- [ ] Export results as JSON or CSV after 7+ days
- [ ] Experiment stoppable by toggling adaptive_scheduler_v1 OFF

## Checklist
- [ ] Deterministic hash assignment (hash(userId) % 2)
- [ ] 50/50 split (verify on 100 users)
- [ ] All events include: timestamp, eventType, experimentVariant, language, userId
- [ ] Metrics: completion rate, skip rate, median time-to-start, 7-day retention
- [ ] Results export: JSON with per-variant metrics
- [ ] Power analysis: 80 users/variant = 90% power to detect 15% uplift

## Definition of Done
- [ ] Experiment running, metrics flowing
- [ ] Assignment deterministic and balanced
- [ ] Acceptance criteria demonstrated in sprint review

**Priority:** P2 (optional) | **Story Points:** 6 | **Sprint:** 2026-04-15
Depends on: #3 (Adaptive Scheduler), #8 (Feature Flags)
Start only if ahead of schedule by Wed Apr 22
"@

Write-Host ""
Write-Host "All issues created. Listing:"
gh issue list --repo $repo --limit 15
