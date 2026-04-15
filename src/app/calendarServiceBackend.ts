// Calendar service for backend CalDAV integration
// Communicates with /api/calendar/* endpoints

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export interface CalendarConnection {
  provider: 'google' | 'outlook';
  email: string;
  connectedAt: string;
}

export interface CalendarCredentials {
  email: string;
  password: string;
}

export interface CalendarEvent {
  summary: string;
  description?: string;
  dtstart: string; // ISO 8601
  dtend: string;   // ISO 8601
  rrule?: string;  // e.g., "FREQ=DAILY"
}

export interface AvailabilityCheckResult {
  available: boolean;
  conflicts: string[]; // array of provider names with conflicts
}

// Connect a calendar (Google or Outlook)
export async function connectCalendar(
  userId: string,
  provider: 'google' | 'outlook',
  credentials: CalendarCredentials
): Promise<CalendarConnection> {
  const response = await fetch(`${API_BASE}/api/calendar/connect`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, provider, ...credentials }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to connect calendar');
  }

  const data = await response.json();
  return {
    provider: data.provider,
    email: data.email,
    connectedAt: new Date().toISOString(),
  };
}

// Get all connected calendars for a user
export async function getCalendarConnections(userId: string): Promise<CalendarConnection[]> {
  const response = await fetch(`${API_BASE}/api/calendar/connected/${userId}`);

  if (!response.ok) {
    throw new Error('Failed to fetch calendar connections');
  }

  const data = await response.json();
  return data.connected || [];
}

// Disconnect a calendar
export async function disconnectCalendar(userId: string, provider: string): Promise<void> {
  const response = await fetch(`${API_BASE}/api/calendar/disconnect`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, provider }),
  });

  if (!response.ok) {
    throw new Error('Failed to disconnect calendar');
  }
}

// Check availability across connected calendars
export async function checkAvailabilityAcrossCalendars(
  userId: string,
  startTime: string,
  endTime: string,
  providers?: string[]
): Promise<AvailabilityCheckResult> {
  const response = await fetch(`${API_BASE}/api/calendar/availability`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId,
      startTime,
      endTime,
      providers,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to check availability');
  }

  const data = await response.json();
  return {
    available: data.available,
    conflicts: data.conflicts || [],
  };
}

// Create events across connected calendars
export async function createBreakEventsAcrossCalendars(
  userId: string,
  providers: string[],
  event: CalendarEvent & { uid?: string }
): Promise<Record<string, string | { error: string }>> {
  const response = await fetch(`${API_BASE}/api/calendar/event/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId,
      providers,
      event,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create events');
  }

  const data = await response.json();
  return data.createdEvents || {};
}

// Update events across connected calendars
export async function updateBreakEventsAcrossCalendars(
  userId: string,
  providers: string[],
  eventIds: Record<string, string>,
  event: CalendarEvent
): Promise<Record<string, boolean | { error: string }>> {
  const response = await fetch(`${API_BASE}/api/calendar/event/update`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId,
      providers,
      eventId: eventIds,
      event,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update events');
  }

  const data = await response.json();
  return data.updatedEvents || {};
}

// Delete events across connected calendars
export async function deleteBreakEventsAcrossCalendars(
  userId: string,
  providers: string[],
  eventIds: Record<string, string>
): Promise<Record<string, boolean | { error: string }>> {
  const response = await fetch(`${API_BASE}/api/calendar/event/delete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId,
      providers,
      eventId: eventIds,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete events');
  }

  const data = await response.json();
  return data.deletedEvents || {};
}

// Suggest fallback times (finds next available slots)
export async function suggestFallbackTimes(
  userId: string,
  initialTime: string,
  options: {
    duration?: number; // minutes, default 30
    maxSuggestions?: number; // default 4
    lookAhead?: number; // hours, default 8
  } = {}
): Promise<string[]> {
  const duration = options.duration || 30; // in minutes
  const maxSuggestions = options.maxSuggestions || 4;
  const lookAhead = options.lookAhead || 8; // in hours

  const connections = await getCalendarConnections(userId);
  if (connections.length === 0) {
    // No connected calendars, return suggestions without checking
    return generateTimeSlots(initialTime, duration, maxSuggestions, lookAhead);
  }

  const suggestions: string[] = [];
  let checkTime = new Date(initialTime);
  const endWindow = new Date(initialTime);
  endWindow.setHours(endWindow.getHours() + lookAhead);

  while (suggestions.length < maxSuggestions && checkTime < endWindow) {
    const checkEnd = new Date(checkTime);
    checkEnd.setMinutes(checkEnd.getMinutes() + duration);

    try {
      const available = await checkAvailabilityAcrossCalendars(
        userId,
        checkTime.toISOString(),
        checkEnd.toISOString(),
        connections.map(c => c.provider)
      );

      if (available.available) {
        suggestions.push(checkTime.toISOString());
      }
    } catch (error) {
      console.error('Error checking availability for fallback suggestion:', error);
    }

    // Move to next 15-minute slot
    checkTime.setMinutes(checkTime.getMinutes() + 15);
  }

  return suggestions;
}

// Helper to generate time slots without calendar checking
function generateTimeSlots(
  initialTime: string,
  durationMinutes: number,
  maxSlots: number,
  lookAheadHours: number
): string[] {
  const slots: string[] = [];
  let slotTime = new Date(initialTime);
  const endTime = new Date(initialTime);
  endTime.setHours(endTime.getHours() + lookAheadHours);

  while (slots.length < maxSlots && slotTime < endTime) {
    slots.push(slotTime.toISOString());
    slotTime.setMinutes(slotTime.getMinutes() + 15);
  }

  return slots;
}

// Build a deterministic key for a break (for event ID linking)
export function buildBreakCalendarKey(time: string, message: string): string {
  const key = `${time}|${message}`;
  // Simple hash function
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    const char = key.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Keep it 32-bit
  }
  return Math.abs(hash).toString(36);
}

// LocalStorage helpers for event ID mapping
const CALENDAR_EVENT_MAP_KEY = 'calendarBreakEventMap';

export function loadBreakEventMap(): Record<string, Record<string, string>> {
  const stored = localStorage.getItem(CALENDAR_EVENT_MAP_KEY);
  return stored ? JSON.parse(stored) : {};
}

export function saveBreakEventMap(map: Record<string, Record<string, string>>): void {
  localStorage.setItem(CALENDAR_EVENT_MAP_KEY, JSON.stringify(map));
}

export function getEventIds(breakKey: string): Record<string, string> | null {
  const map = loadBreakEventMap();
  return map[breakKey] || null;
}

export function setEventIds(breakKey: string, eventIds: Record<string, string>): void {
  const map = loadBreakEventMap();
  map[breakKey] = eventIds;
  saveBreakEventMap(map);
}

export function deleteEventIds(breakKey: string): void {
  const map = loadBreakEventMap();
  delete map[breakKey];
  saveBreakEventMap(map);
}
