export type ExperimentVariant = 'control' | 'adaptive';

export interface ExperimentAssignment {
  userId: string;
  variant: ExperimentVariant;
}

// Generates a cryptographically random UUID v4
function generateUserId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant 10xx
  return [...bytes]
    .map((b, i) =>
      [4, 6, 8, 10].includes(i) ? `-${b.toString(16).padStart(2, '0')}` : b.toString(16).padStart(2, '0')
    )
    .join('');
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

// djb2-style hash for deterministic, well-distributed assignment.
// Using `| 0` after each step ensures consistent 32-bit signed integer wrapping,
// preventing floating-point drift across environments.
function hashUserId(userId: string): number {
  let hash = 5381;
  for (let i = 0; i < userId.length; i++) {
    hash = (((hash << 5) + hash) | 0) + userId.charCodeAt(i) | 0;
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
