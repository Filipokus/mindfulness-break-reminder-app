# Work Routing

How to decide who handles what.

## Sprint Execution Model

This squad follows a **prioritized dependency-driven model** for sprint work:

1. **P0 issues must complete first** — they unblock all P1 work
2. **Issue labels determine routing:**
   - `squad:{member}:{domain}` = assigned to that member for that domain
   - `squad:blocked` = waiting on upstream issue; move to next available work
   - `squad:testing` = ready for QA pass; route to Testing agent
3. **Scribe tracks all work** to `.squad/history.md` in real-time

## Routing Table

| Work Type | Route To | Examples |
|-----------|----------|----------|
| Feature Implementation | {Developer} | Coding P0/P1 issues; landing backend features |
| QA & Testing | {QA/Tester} | Write tests for issue acceptance criteria; manual smoke test phone + desktop |
| Accessibility Audit | {Accessibility} | WCAG AA pass; keyboard navigation; screen reader testing |
| Code Review | {Lead} | Check for regressions, performance, localization completeness |
| Scope & priorities | {Lead} | Reorder sprint work, escalate blockers, adjust acceptance criteria |
| Documentation | Scribe | Auto-logs progress; captures decisions; tracks edge cases |

## Issue Routing (Sprint Backlog)

**Sprint Issues Location:** `.squad/sprint-backlog.md`

### Assignment Flow

1. **P0 Issues** (blockers):
   - Mon 15th AM: `squad` label added to issues #1–4
   - Lead triages all 4, assigns `squad:{developer}:{P0}` labels in parallel
   - Developers pick up; Tester spawned to write acceptance test cases async
   - Blockers escalated to Scribe immediately (record in decisions.md why issue is blocked)

2. **P1 Issues** (depends on P0 complete):
   - Wed 20th: Once any P0 issue merges, corresponding P1 unblocks
   - Assignment same as P0; parallelized where possible
   - Accessibility audit scheduled for Thu–Fri (P1 #3 work)

3. **P2 Issues** (optional):
   - Fri 22nd+: If team ahead of schedule, pull P2 #1 (A/B experiment) into sprint
   - Otherwise, defer to next sprint

### Label Scheme

- `squad` — Inbox; needs triage
- `squad:developer:P0` — Developer owns this P0 feature
- `squad:developer:P1` — Developer owns this P1 feature
- `squad:testing` — QA team to verify acceptance criteria
- `squad:a11y` — Accessibility team to audit
- `squad:blocked` — Waiting on upstream issue; document reason in issue comment
- `squad:deployed` — Merged to main and live on GitHub Pages
- `sprint:2026-04-15` — All sprint issues tagged for retrospective

## Rules

1. **Eager by default** — spawn all agents who could usefully start work, including anticipatory downstream work.
   - Example: When P0 #1 (Event Tracking) is assigned, spawn Tester in parallel to write schema + query tests
   - Example: When P0 #3 (Adaptive Scheduler) is assigned, spawn Scribe to research and document algorithm options

2. **Scribe always runs** after substantial work, always as `mode: "background"`. Never blocks.
   - After each issue merges: Scribe logs what changed, any edge cases, performance notes

3. **Quick facts → coordinator answers directly.** Don't spawn an agent for "what port does the server run on?"
   - Keep Slack/comment direct for clarifications; use GitHub for logged decisions

4. **When two agents could handle it**, pick the one whose domain is the primary concern.
   - Example: Font sizing on mobile = Designer concern, not Developer (unless it breaks layout)

5. **"Team, ..." → fan-out.** Spawn all relevant agents in parallel as `mode: "background"`.
   - Example at sprint kickoff: "Team, design review for P0 #2 (Energy Check-In)" = Designer, Developer, Tester all spawned

6. **Anticipate downstream work.** If a feature is being built, spawn the tester to write test cases from requirements simultaneously.
   - Event Tracking (P0 #1) being built? Tester writes event schema + query tests same day
   - Adaptive Scheduler (P0 #3) being built? Tester writes min/max bound tests same day

7. **Issue-labeled work** — when a `squad:{member}` label is applied to an issue, route to that member. The Lead handles all `squad` (base label) triage.
   - Re-assignment: Member can remove their label and add another's; document reason in comment

## Sprint Execution Checklist

- [ ] `.squad/sprint-backlog.md` reviewed and linked in Sprint Planning notes
- [ ] All P0/P1 issues have `squad` label and are in GitHub Issues
- [ ] Feature flags documented in config (off by default)
- [ ] Rollback plan documented for each P0 issue (what to disable if it breaks)
- [ ] Definition of Done visible to team
- [ ] Daily standup format established (async or scheduled Slack thread)
- [ ] Scribe monitor `.squad/history.md` for real-time progress

