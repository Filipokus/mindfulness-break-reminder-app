# Squad Team

> mindfulness-break-reminder-app

## Active Sprint

**Sprint:** Adaptive Mindfulness MVP  
**Duration:** April 15–28, 2026 (2 weeks)  
**Goal:** Ship an adaptive, engaging mindfulness MVP that measurably improves break completion and 7-day retention, with safe rollout controls  
**Capacity:** 40 story points across 9 prioritized issues (P0×4, P1×4, P2×1)  
**Backlog:** [.squad/sprint-backlog.md](.squad/sprint-backlog.md)  
**Status:** 🟢 Active — Kickoff Apr 15, Review Apr 28

---

## Coordinator

| Name | Role | Notes |
|------|------|-------|
| Squad | Coordinator | Routes work, enforces handoffs and reviewer gates. Follows `.squad/routing.md` for sprint-based assignment. |

## Members

| Name | Role | Charter | Status |
|------|------|---------|--------|
| Developer | Implementation | Build P0/P1 features per `.squad/sprint-backlog.md` | TBD |
| QA/Tester | Quality | Write tests, verify acceptance criteria, smoke test phone + desktop | TBD |
| Designer/Accessibility | A11y & UX | WCAG AA audit, keyboard navigation, responsive testing | TBD |
| Scribe | Documentation | Log progress, track decisions, update history.md daily | TBD |

## Project Context

- **Project:** mindfulness-break-reminder-app
- **Created:** 2026-04-15
- **Repository:** https://github.com/Filipokus/mindfulness-break-reminder-app
- **Live URL:** https://filipokus.github.io/mindfulness-break-reminder-app/
- **Tech Stack:** React 18.3.1 + TypeScript, Vite 6.3.5, Tailwind CSS 4.1.12, Motion, Lucide Icons
- **Deployment:** GitHub Pages auto-deploy on push to main
- **Localization:** Swedish (sv) + English (en) with persistent user preference

---

## Sprint Execution Summary

See [.squad/sprint-backlog.md](.squad/sprint-backlog.md) for:
- Detailed issue descriptions and acceptance criteria
- Story point estimates and dependencies
- Definition of Done checklist
- Success metrics and rollback triggers

**Key Files:**
- `.squad/ceremonies.md` — Sprint Planning, Standup, Review, Design Review, Retro
- `.squad/routing.md` — Work assignment model and label scheme
- `.squad/config.json` — Feature flags (all OFF by default) and sprint metadata
- `.squad/decisions.md` — Log decisions made during sprint
- `.squad/history.md` — Daily progress and learnings

---

## How to Begin

1. **Sprint Planning (Mon 15th AM):**
   - Lead triages all 9 issues in GitHub; adds `squad` label to each
   - Team reviews `.squad/sprint-backlog.md` together
   - Assign `squad:{developer}:{P0}` labels to start P0 work

2. **Daily Execution:**
   - Check `.squad/sprint-backlog.md` for your issue
   - Comment with @Squad for blockers or handoffs
   - Scribe logs updates to `.squad/history.md`

3. **Sprint Review (Fri 28th):**
   - Demo each completed issue live in app
   - Verify all acceptance criteria met
   - Collect feedback for next sprint
