export type ExperimentVariant = 'control' | 'adaptive';

export interface ExperimentAssignment {
  userId: string;
  variant: ExperimentVariant;
}

// Generates a UUID v4-like string for user identification
function generateUserId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Gets userId from localStorage, generates and stores one if not present
export function getUserId(): string {
  let userId = localStorage.getItem('exp_userId');
  if (!userId) {
    userId = generateUserId();
    localStorage.setItem('exp_userId', userId);
  }
  return userId;
}

// djb2-style hash for deterministic, well-distributed assignment
function hashUserId(userId: string): number {
  let hash = 5381;
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) + hash) + userId.charCodeAt(i);
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

// Returns whether the experiment feature flag is enabled.
// Defaults to enabled; set adaptive_scheduler_v1=false in localStorage to stop experiment.
export function isExperimentEnabled(): boolean {
  return localStorage.getItem('adaptive_scheduler_v1') !== 'false';
}

// Deterministically assigns a variant based on userId hash (50/50 split)
function computeVariant(userId: string): ExperimentVariant {
  return hashUserId(userId) % 2 === 0 ? 'control' : 'adaptive';
}

// Returns a stable experiment assignment stored in localStorage.
// Re-computes if the stored variant is invalid or missing.
export function getAssignment(): ExperimentAssignment {
  const userId = getUserId();

  if (!isExperimentEnabled()) {
    return { userId, variant: 'control' };
  }

  let variant = localStorage.getItem('exp_variant') as ExperimentVariant | null;
  if (variant !== 'control' && variant !== 'adaptive') {
    variant = computeVariant(userId);
    localStorage.setItem('exp_variant', variant);
  }

  return { userId, variant };
}
