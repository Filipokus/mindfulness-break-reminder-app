# Ceremonies

> Team meetings that happen before or after work. Each squad configures their own.

## Sprint Planning

| Field | Value |
|-------|-------|
| **Trigger** | scheduled |
| **When** | start of sprint (Monday) |
| **Condition** | beginning of 2-week sprint cycle |
| **Facilitator** | Lead |
| **Participants** | all |
| **Time budget** | focused |
| **Enabled** | ✅ yes |

**Agenda:**
1. Review sprint goal and acceptance criteria for P0 issues
2. Identify blockers and dependencies
3. Assign owners and confirm scope
4. Establish success metrics and rollback triggers

**Output:**
- Team aligned on sprint goal and priority order
- `.squad/sprint-backlog.md` reviewed and discussed
- Risk log updated with rollback conditions

---

## Daily Standup

| Field | Value |
|-------|-------|
| **Trigger** | auto |
| **When** | async (via PR/issue comments) or daily team sync |
| **Condition** | during active sprint |
| **Facilitator** | Lead |
| **Participants** | all-active |
| **Time budget** | focused |
| **Enabled** | ✅ yes |

**Format:**
1. What did I ship/complete yesterday?
2. What am I starting today?
3. What's blocking me?

**Capture:** Comments in associated GitHub issues; Scribe logs to `.squad/history.md`

---

## Sprint Review

| Field | Value |
|-------|-------|
| **Trigger** | scheduled |
| **When** | end of sprint (Friday) |
| **Condition** | concluding 2-week sprint cycle |
| **Facilitator** | Lead |
| **Participants** | all |
| **Time budget** | focused |
| **Enabled** | ✅ yes |

**Agenda:**
1. Demo each completed issue (live in app, showing all acceptance criteria)
2. Review metrics: issue count closed, story points delivered, regressions found
3. Discuss edge cases and production stability
4. Collect feedback for next sprint

**Output:**
- Sprint summary logged to `.squad/history.md`
- Metrics report added to `.squad/decisions.md`
- Issues and learnings linked to retrospective

---

## Design Review

| Field | Value |
|-------|-------|
| **Trigger** | auto |
| **When** | before |
| **Condition** | multi-agent task involving 2+ agents modifying shared systems |
| **Facilitator** | lead |
| **Participants** | all-relevant |
| **Time budget** | focused |
| **Enabled** | ✅ yes |

**Agenda:**
1. Review the task and requirements
2. Agree on interfaces and contracts between components
3. Identify risks and edge cases
4. Assign action items

---

## Retrospective

| Field | Value |
|-------|-------|
| **Trigger** | auto |
| **When** | after |
| **Condition** | build failure, test failure, or reviewer rejection |
| **Facilitator** | lead |
| **Participants** | all-involved |
| **Time budget** | focused |
| **Enabled** | ✅ yes |

**Agenda:**
1. What happened? (facts only)
2. Root cause analysis
3. What should change?
4. Action items for next iteration
