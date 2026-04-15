/**
 * Streaks with Grace Day Recovery
 *
 * Feature flag: streaks_v1 (localStorage key)
 *   - "true"  → streaks ON
 *   - anything else (default) → streaks OFF
 *
 * Rules:
 *   - A day is "completed" when the user finishes at least DAILY_MINIMUM breaks
 *     in that UTC calendar day.
 *   - Streak increments by 1 for each consecutive completed day.
 *   - Grace day: within every 7-day window, the user may miss 1 day without
 *     resetting the streak. Grace does NOT increment the streak counter.
 *   - If the user misses a day and grace has already been used in the current
 *     7-day window, the streak resets to 0 and a new window begins.
 *   - At the start of each new 7-day window (measured from the window-start date)
 *     the grace day is replenished.
 *   - Completing the minimum on a "potential grace day" keeps grace intact.
 *
 * Milestones: celebrated at 7, 14, 21, and 30 consecutive completed days.
 */

// Minimum breaks required in a UTC calendar day to count as a completed streak day.
export const DAILY_MINIMUM = 2;

// 7-day rolling window for grace-day replenishment.
const WINDOW_SIZE = 7;

// Milestone thresholds (number of completed streak days).
export const MILESTONES = [7, 14, 21, 30];

// LocalStorage keys
const FLAG_KEY = 'streaks_v1';
const SHOWN_MILESTONES_KEY = 'streaks_v1_shown_milestones';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CompletedBreakEntry {
  timestamp: string; // ISO 8601
}

/**
 * Per-day breakdown used in the History view.
 */
export interface DayStatus {
  /** UTC date string "YYYY-MM-DD" */
  date: string;
  /** 'completed' | 'grace_used' | 'missed' | 'future' */
  status: 'completed' | 'grace_used' | 'missed';
  /** Number of breaks completed on that day */
  breakCount: number;
  /** Streak value at the end of this day (0 when reset or not started yet) */
  streakDayNumber: number;
}

export interface StreakState {
  currentStreak: number;
  graceUsedInWindow: boolean;
  /** UTC date "YYYY-MM-DD" when the current 7-day window started */
  windowStartDate: string | null;
  /** All milestone values that have been reached so far */
  milestonesReached: number[];
  /** Day-by-day breakdown from first recorded break to today */
  dayStatuses: DayStatus[];
}

// ─── Feature flag ─────────────────────────────────────────────────────────────

/** Returns true when the streaks_v1 feature flag is enabled (defaults to OFF). */
export function isStreaksEnabled(): boolean {
  return localStorage.getItem(FLAG_KEY) === 'true';
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

/** Returns today's UTC date as "YYYY-MM-DD". */
function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Adds `days` to a UTC date string and returns the new "YYYY-MM-DD" string. */
function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Returns the number of whole UTC days between two "YYYY-MM-DD" strings. */
function diffDays(startStr: string, endStr: string): number {
  const start = new Date(startStr + 'T00:00:00Z').getTime();
  const end = new Date(endStr + 'T00:00:00Z').getTime();
  return Math.floor((end - start) / (24 * 60 * 60 * 1000));
}

// ─── Core computation ─────────────────────────────────────────────────────────

/**
 * Derives the current StreakState from the full completed-breaks history.
 * Walks day-by-day from the first ever completed break to today (UTC).
 *
 * Performance note: for the expected scale (a few months of history) this is
 * fast enough; localStorage is the bottleneck, not this loop.
 */
export function computeStreakState(
  completedBreaks: CompletedBreakEntry[]
): StreakState {
  // Tally breaks per UTC calendar date.
  const breaksByDate = new Map<string, number>();
  for (const b of completedBreaks) {
    const date = new Date(b.timestamp).toISOString().slice(0, 10);
    breaksByDate.set(date, (breaksByDate.get(date) ?? 0) + 1);
  }

  const today = todayUtc();

  if (breaksByDate.size === 0) {
    return {
      currentStreak: 0,
      graceUsedInWindow: false,
      windowStartDate: null,
      milestonesReached: [],
      dayStatuses: [],
    };
  }

  const sortedDates = [...breaksByDate.keys()].sort();
  const firstDate = sortedDates[0];

  let streak = 0;
  let graceUsedInWindow = false;
  let windowStartDate = firstDate;
  const milestonesReached: number[] = [];
  const dayStatuses: DayStatus[] = [];

  let d = firstDate;
  while (d <= today) {
    // Roll the grace window if we have moved past WINDOW_SIZE days.
    if (diffDays(windowStartDate, d) >= WINDOW_SIZE) {
      graceUsedInWindow = false;
      windowStartDate = d;
    }

    const count = breaksByDate.get(d) ?? 0;
    let status: DayStatus['status'];

    if (count >= DAILY_MINIMUM) {
      streak++;
      status = 'completed';
      if (MILESTONES.includes(streak) && !milestonesReached.includes(streak)) {
        milestonesReached.push(streak);
      }
    } else if (!graceUsedInWindow) {
      // Consume the grace day – streak does not increment but is not reset.
      graceUsedInWindow = true;
      status = 'grace_used';
    } else {
      // Grace already used: reset streak and start a fresh window.
      streak = 0;
      graceUsedInWindow = false;
      windowStartDate = d;
      status = 'missed';
    }

    dayStatuses.push({ date: d, status, breakCount: count, streakDayNumber: streak });
    d = addDays(d, 1);
  }

  return { currentStreak: streak, graceUsedInWindow, windowStartDate, milestonesReached, dayStatuses };
}

// ─── Derived helpers ──────────────────────────────────────────────────────────

/** Returns 1 if grace is still available in the current window, 0 otherwise. */
export function getGraceDaysRemaining(state: StreakState): number {
  return state.graceUsedInWindow ? 0 : 1;
}

/**
 * Returns the UTC date "YYYY-MM-DD" when the current grace window resets,
 * or null if no streak has started yet.
 */
export function getNextWindowResetDate(state: StreakState): string | null {
  if (!state.windowStartDate) return null;
  return addDays(state.windowStartDate, WINDOW_SIZE);
}

// ─── Milestone persistence ───────────────────────────────────────────────────

/** Returns the set of milestone values that have already been shown to the user. */
export function getShownMilestones(): number[] {
  try {
    const stored = localStorage.getItem(SHOWN_MILESTONES_KEY);
    return stored ? (JSON.parse(stored) as number[]) : [];
  } catch {
    return [];
  }
}

/** Marks a milestone as shown (persists to localStorage). */
export function markMilestoneShown(milestone: number): void {
  const shown = getShownMilestones();
  if (!shown.includes(milestone)) {
    shown.push(milestone);
    try {
      localStorage.setItem(SHOWN_MILESTONES_KEY, JSON.stringify(shown));
    } catch {
      // Silently fail if localStorage is full.
    }
  }
}
