import type { ExperimentVariant } from './experiment';

export type { ExperimentVariant };

export type EventType = 'break_shown' | 'break_start' | 'break_complete' | 'break_skip';

export interface AnalyticsEvent {
  timestamp: string;
  eventType: EventType;
  experimentVariant: ExperimentVariant;
  language: string;
  userId: string;
  breakMessage?: string;
  durationSeconds?: number;
  timeToStartSeconds?: number;
}

const STORAGE_KEY = 'experiment_events';

export function trackEvent(event: AnalyticsEvent): void {
  const events = getEvents();
  events.push(event);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  } catch {
    // Silently fail if localStorage is full
  }
}

export function getEvents(): AnalyticsEvent[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? (JSON.parse(stored) as AnalyticsEvent[]) : [];
  } catch {
    return [];
  }
}

export interface VariantMetrics {
  variant: ExperimentVariant;
  totalBreaksShown: number;
  totalCompleted: number;
  totalSkipped: number;
  completionRate: number;
  skipRate: number;
  medianTimeToStartSeconds: number | null;
  sevenDayRetention: number;
}

export interface ExperimentResults {
  generatedAt: string;
  totalEvents: number;
  daysSinceFirstEvent: number | null;
  variants: VariantMetrics[];
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function computeMetrics(): ExperimentResults {
  const events = getEvents();
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const variants: ExperimentVariant[] = ['control', 'adaptive'];

  const variantMetrics: VariantMetrics[] = variants.map((variant) => {
    const ve = events.filter((e) => e.experimentVariant === variant);
    const shown = ve.filter((e) => e.eventType === 'break_shown').length;
    const completed = ve.filter((e) => e.eventType === 'break_complete').length;
    const skipped = ve.filter((e) => e.eventType === 'break_skip').length;
    const attempts = completed + skipped;

    const timesToStart = ve
      .filter((e) => e.eventType === 'break_start' && e.timeToStartSeconds !== undefined)
      .map((e) => e.timeToStartSeconds as number);

    const recentCompletions = ve.filter(
      (e) => e.eventType === 'break_complete' && new Date(e.timestamp) >= sevenDaysAgo
    );
    const distinctDays = new Set(
      recentCompletions.map((e) => new Date(e.timestamp).toDateString())
    ).size;

    return {
      variant,
      totalBreaksShown: shown,
      totalCompleted: completed,
      totalSkipped: skipped,
      completionRate: attempts > 0 ? completed / attempts : 0,
      skipRate: attempts > 0 ? skipped / attempts : 0,
      medianTimeToStartSeconds: median(timesToStart),
      sevenDayRetention: distinctDays,
    };
  });

  const timestamps = events.map((e) => e.timestamp);
  const firstEventTs = timestamps.length > 0 ? timestamps.reduce((a, b) => (a < b ? a : b)) : null;
  const daysSinceFirstEvent = firstEventTs
    ? Math.floor((Date.now() - new Date(firstEventTs).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  return {
    generatedAt: new Date().toISOString(),
    totalEvents: events.length,
    daysSinceFirstEvent,
    variants: variantMetrics,
  };
}

export function exportResultsAsJSON(): string {
  return JSON.stringify(computeMetrics(), null, 2);
}

export function exportResultsAsCSV(): string {
  const results = computeMetrics();
  const header = [
    'variant',
    'totalBreaksShown',
    'totalCompleted',
    'totalSkipped',
    'completionRate',
    'skipRate',
    'medianTimeToStartSeconds',
    'sevenDayRetention',
  ];
  const rows = results.variants.map((v) => [
    v.variant,
    v.totalBreaksShown,
    v.totalCompleted,
    v.totalSkipped,
    v.completionRate.toFixed(3),
    v.skipRate.toFixed(3),
    v.medianTimeToStartSeconds !== null ? v.medianTimeToStartSeconds.toFixed(1) : 'N/A',
    v.sevenDayRetention,
  ]);
  return [header, ...rows].map((r) => r.join(',')).join('\n');
}

// Triggers a browser download of the given content
export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
