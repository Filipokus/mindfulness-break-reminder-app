export type CalendarProvider = 'google' | 'outlook';

export interface CalendarConnection {
  provider: CalendarProvider;
  accessToken: string;
  expiresAt: number;
}

interface OAuthPayload {
  access_token?: string;
  expires_in?: string;
  token_type?: string;
  state?: string;
  error?: string;
  error_description?: string;
}

interface BreakReminderInput {
  time: string;
  message: string;
  durationMinutes: number;
}

interface BreakEventMapping {
  googleEventId?: string;
  outlookEventId?: string;
}

const STORAGE_KEY = 'calendarConnections';
const EVENT_MAP_KEY = 'calendarBreakEventMap';
const OAUTH_CALLBACK_PATH = 'oauth-callback.html';
const DEFAULT_EVENT_DURATION_MINUTES = 15;

function getRedirectUri() {
  const basePath = import.meta.env.BASE_URL || '/';
  return `${window.location.origin}${basePath}${OAUTH_CALLBACK_PATH}`;
}

function loadConnections(): CalendarConnection[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as CalendarConnection[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((entry) => entry?.provider && entry?.accessToken && entry?.expiresAt);
  } catch {
    return [];
  }
}

function saveConnections(connections: CalendarConnection[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(connections));
}

function loadEventMap(): Record<string, BreakEventMapping> {
  const raw = localStorage.getItem(EVENT_MAP_KEY);
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw) as Record<string, BreakEventMapping>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function saveEventMap(eventMap: Record<string, BreakEventMapping>) {
  localStorage.setItem(EVENT_MAP_KEY, JSON.stringify(eventMap));
}

function updateEventMapping(key: string, mapping: BreakEventMapping) {
  const current = loadEventMap();
  current[key] = {
    ...current[key],
    ...mapping,
  };
  saveEventMap(current);
}

function moveEventMapping(oldKey: string, newKey: string) {
  if (oldKey === newKey) return;
  const current = loadEventMap();
  if (!current[oldKey]) return;
  current[newKey] = current[oldKey];
  delete current[oldKey];
  saveEventMap(current);
}

function getEventMapping(key: string) {
  const current = loadEventMap();
  return current[key];
}

function upsertConnection(connection: CalendarConnection) {
  const current = loadConnections().filter((c) => c.provider !== connection.provider);
  current.push(connection);
  saveConnections(current);
}

function parseOAuthPayload(rawPayload: string): OAuthPayload {
  const params = new URLSearchParams(rawPayload);
  return {
    access_token: params.get('access_token') ?? undefined,
    expires_in: params.get('expires_in') ?? undefined,
    token_type: params.get('token_type') ?? undefined,
    state: params.get('state') ?? undefined,
    error: params.get('error') ?? undefined,
    error_description: params.get('error_description') ?? undefined,
  };
}

function openOAuthPopup(authUrl: string) {
  return new Promise<OAuthPayload>((resolve, reject) => {
    const width = 520;
    const height = 680;
    const left = window.screenX + Math.max(window.outerWidth - width, 0) / 2;
    const top = window.screenY + Math.max(window.outerHeight - height, 0) / 2;

    const popup = window.open(
      authUrl,
      'calendar-oauth',
      `width=${width},height=${height},left=${Math.round(left)},top=${Math.round(top)}`
    );

    if (!popup) {
      reject(new Error('Popup blocked'));
      return;
    }

    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const payload = event.data;
      if (!payload || payload.type !== 'oauth-callback') return;

      const parsed = parseOAuthPayload(payload.payload || '');
      window.removeEventListener('message', onMessage);
      clearInterval(watchTimer);
      resolve(parsed);
    };

    const watchTimer = window.setInterval(() => {
      if (popup.closed) {
        window.removeEventListener('message', onMessage);
        clearInterval(watchTimer);
        reject(new Error('Popup closed'));
      }
    }, 500);

    window.addEventListener('message', onMessage);
  });
}

function getNextOccurrenceDate(time: string) {
  const [hour, minute] = time.split(':').map(Number);
  const next = new Date();
  next.setHours(hour, minute, 0, 0);

  if (next.getTime() <= Date.now()) {
    next.setDate(next.getDate() + 1);
  }

  return next;
}

function addMinutesToTime(time: string, minutesToAdd: number) {
  const [hour, minute] = time.split(':').map(Number);
  const total = hour * 60 + minute + minutesToAdd;
  const normalized = ((total % (24 * 60)) + 24 * 60) % (24 * 60);
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

function buildIsoDate(date: Date) {
  return date.toISOString();
}

export function getCalendarConnections() {
  const now = Date.now();
  const valid = loadConnections().filter((connection) => connection.expiresAt > now + 10_000);

  if (valid.length !== loadConnections().length) {
    saveConnections(valid);
  }

  return valid;
}

export function disconnectCalendar(provider: CalendarProvider) {
  const next = getCalendarConnections().filter((connection) => connection.provider !== provider);
  saveConnections(next);
}

export function buildBreakCalendarKey(time: string, message: string) {
  return `${time}|||${message.trim().toLowerCase()}`;
}

export async function connectGoogleCalendar() {
  const clientId = import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID;
  if (!clientId) {
    throw new Error('Missing VITE_GOOGLE_OAUTH_CLIENT_ID');
  }

  const state = crypto.randomUUID();
  const redirectUri = encodeURIComponent(getRedirectUri());
  const scope = encodeURIComponent('https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.readonly');

  const authUrl = [
    'https://accounts.google.com/o/oauth2/v2/auth',
    `?client_id=${encodeURIComponent(clientId)}`,
    `&redirect_uri=${redirectUri}`,
    '&response_type=token',
    `&scope=${scope}`,
    '&include_granted_scopes=true',
    '&prompt=consent',
    `&state=${state}`,
  ].join('');

  const payload = await openOAuthPopup(authUrl);
  if (payload.error) {
    throw new Error(payload.error_description || payload.error);
  }
  if (payload.state !== state) {
    throw new Error('OAuth state mismatch');
  }
  if (!payload.access_token || !payload.expires_in) {
    throw new Error('No access token returned');
  }

  const connection: CalendarConnection = {
    provider: 'google',
    accessToken: payload.access_token,
    expiresAt: Date.now() + Number(payload.expires_in) * 1000,
  };

  upsertConnection(connection);
  return connection;
}

export async function connectOutlookCalendar() {
  const clientId = import.meta.env.VITE_MICROSOFT_OAUTH_CLIENT_ID;
  if (!clientId) {
    throw new Error('Missing VITE_MICROSOFT_OAUTH_CLIENT_ID');
  }

  const state = crypto.randomUUID();
  const redirectUri = encodeURIComponent(getRedirectUri());
  const scope = encodeURIComponent('openid profile User.Read Calendars.ReadWrite');

  const authUrl = [
    'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    `?client_id=${encodeURIComponent(clientId)}`,
    `&redirect_uri=${redirectUri}`,
    '&response_type=token',
    '&response_mode=fragment',
    `&scope=${scope}`,
    `&state=${state}`,
  ].join('');

  const payload = await openOAuthPopup(authUrl);
  if (payload.error) {
    throw new Error(payload.error_description || payload.error);
  }
  if (payload.state !== state) {
    throw new Error('OAuth state mismatch');
  }
  if (!payload.access_token || !payload.expires_in) {
    throw new Error('No access token returned');
  }

  const connection: CalendarConnection = {
    provider: 'outlook',
    accessToken: payload.access_token,
    expiresAt: Date.now() + Number(payload.expires_in) * 1000,
  };

  upsertConnection(connection);
  return connection;
}

async function checkGoogleAvailability(accessToken: string, start: Date, end: Date) {
  const response = await fetch('https://www.googleapis.com/calendar/v3/freeBusy', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      timeMin: buildIsoDate(start),
      timeMax: buildIsoDate(end),
      items: [{ id: 'primary' }],
    }),
  });

  if (!response.ok) {
    throw new Error('Google availability check failed');
  }

  const data = await response.json();
  const busy = data?.calendars?.primary?.busy;
  return Array.isArray(busy) && busy.length > 0;
}

async function checkOutlookAvailability(accessToken: string, start: Date, end: Date) {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  const response = await fetch('https://graph.microsoft.com/v1.0/me/calendar/getSchedule', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      schedules: ['me'],
      startTime: {
        dateTime: start.toISOString(),
        timeZone: timezone,
      },
      endTime: {
        dateTime: end.toISOString(),
        timeZone: timezone,
      },
      availabilityViewInterval: 15,
    }),
  });

  if (!response.ok) {
    throw new Error('Outlook availability check failed');
  }

  const data = await response.json();
  const items = data?.value?.[0]?.scheduleItems;
  return Array.isArray(items) && items.length > 0;
}

export async function checkAvailabilityAcrossCalendars(
  connections: CalendarConnection[],
  breakTime: string,
  durationMinutes = DEFAULT_EVENT_DURATION_MINUTES
) {
  const start = getNextOccurrenceDate(breakTime);
  const end = new Date(start.getTime() + durationMinutes * 60_000);
  const conflicts: CalendarProvider[] = [];

  for (const connection of connections) {
    try {
      const busy = connection.provider === 'google'
        ? await checkGoogleAvailability(connection.accessToken, start, end)
        : await checkOutlookAvailability(connection.accessToken, start, end);

      if (busy) {
        conflicts.push(connection.provider);
      }
    } catch {
      conflicts.push(connection.provider);
    }
  }

  return {
    start,
    end,
    available: conflicts.length === 0,
    conflicts,
  };
}

async function createGoogleEvent(accessToken: string, input: BreakReminderInput) {
  const startDate = getNextOccurrenceDate(input.time);
  const endDate = new Date(startDate.getTime() + input.durationMinutes * 60_000);
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

  const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      summary: `Mindfulness break: ${input.message}`,
      description: 'Scheduled from Mindfulness Break Reminder App',
      start: {
        dateTime: startDate.toISOString(),
        timeZone: timezone,
      },
      end: {
        dateTime: endDate.toISOString(),
        timeZone: timezone,
      },
      recurrence: ['RRULE:FREQ=DAILY'],
      reminders: {
        useDefault: true,
      },
    }),
  });

  if (!response.ok) {
    throw new Error('Google calendar event creation failed');
  }

  const data = await response.json();
  return data?.id as string | undefined;
}

async function createOutlookEvent(accessToken: string, input: BreakReminderInput) {
  const startDate = getNextOccurrenceDate(input.time);
  const endDate = new Date(startDate.getTime() + input.durationMinutes * 60_000);
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

  const response = await fetch('https://graph.microsoft.com/v1.0/me/events', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      subject: `Mindfulness break: ${input.message}`,
      body: {
        contentType: 'Text',
        content: 'Scheduled from Mindfulness Break Reminder App',
      },
      start: {
        dateTime: startDate.toISOString(),
        timeZone: timezone,
      },
      end: {
        dateTime: endDate.toISOString(),
        timeZone: timezone,
      },
      recurrence: {
        pattern: {
          type: 'daily',
          interval: 1,
        },
        range: {
          type: 'noEnd',
          startDate: startDate.toISOString().slice(0, 10),
        },
      },
    }),
  });

  if (!response.ok) {
    throw new Error('Outlook calendar event creation failed');
  }

  const data = await response.json();
  return data?.id as string | undefined;
}

export async function createBreakEventsAcrossCalendars(
  connections: CalendarConnection[],
  input: BreakReminderInput,
  breakKey?: string
) {
  const created: CalendarProvider[] = [];
  const failed: CalendarProvider[] = [];
  const mapping: BreakEventMapping = {};

  for (const connection of connections) {
    try {
      if (connection.provider === 'google') {
        const eventId = await createGoogleEvent(connection.accessToken, input);
        if (eventId) mapping.googleEventId = eventId;
      } else {
        const eventId = await createOutlookEvent(connection.accessToken, input);
        if (eventId) mapping.outlookEventId = eventId;
      }
      created.push(connection.provider);
    } catch {
      failed.push(connection.provider);
    }
  }

  if (breakKey && (mapping.googleEventId || mapping.outlookEventId)) {
    updateEventMapping(breakKey, mapping);
  }

  return { created, failed };
}

async function updateGoogleEvent(accessToken: string, eventId: string, input: BreakReminderInput) {
  const startDate = getNextOccurrenceDate(input.time);
  const endDate = new Date(startDate.getTime() + input.durationMinutes * 60_000);
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

  const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(eventId)}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      summary: `Mindfulness break: ${input.message}`,
      start: {
        dateTime: startDate.toISOString(),
        timeZone: timezone,
      },
      end: {
        dateTime: endDate.toISOString(),
        timeZone: timezone,
      },
      recurrence: ['RRULE:FREQ=DAILY'],
    }),
  });

  if (!response.ok) {
    throw new Error('Google calendar event update failed');
  }
}

async function updateOutlookEvent(accessToken: string, eventId: string, input: BreakReminderInput) {
  const startDate = getNextOccurrenceDate(input.time);
  const endDate = new Date(startDate.getTime() + input.durationMinutes * 60_000);
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

  const response = await fetch(`https://graph.microsoft.com/v1.0/me/events/${encodeURIComponent(eventId)}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      subject: `Mindfulness break: ${input.message}`,
      start: {
        dateTime: startDate.toISOString(),
        timeZone: timezone,
      },
      end: {
        dateTime: endDate.toISOString(),
        timeZone: timezone,
      },
      recurrence: {
        pattern: {
          type: 'daily',
          interval: 1,
        },
        range: {
          type: 'noEnd',
          startDate: startDate.toISOString().slice(0, 10),
        },
      },
    }),
  });

  if (!response.ok) {
    throw new Error('Outlook calendar event update failed');
  }
}

export async function updateBreakEventsAcrossCalendars(
  connections: CalendarConnection[],
  previousBreakKey: string,
  input: BreakReminderInput,
  nextBreakKey?: string
) {
  const mapping = getEventMapping(previousBreakKey);
  if (!mapping) {
    return { updated: [], failed: [] } as { updated: CalendarProvider[]; failed: CalendarProvider[] };
  }

  const updated: CalendarProvider[] = [];
  const failed: CalendarProvider[] = [];

  for (const connection of connections) {
    try {
      if (connection.provider === 'google' && mapping.googleEventId) {
        await updateGoogleEvent(connection.accessToken, mapping.googleEventId, input);
        updated.push('google');
      }

      if (connection.provider === 'outlook' && mapping.outlookEventId) {
        await updateOutlookEvent(connection.accessToken, mapping.outlookEventId, input);
        updated.push('outlook');
      }
    } catch {
      failed.push(connection.provider);
    }
  }

  const targetKey = nextBreakKey || previousBreakKey;
  moveEventMapping(previousBreakKey, targetKey);

  return { updated, failed };
}

export async function suggestFallbackTimes(
  connections: CalendarConnection[],
  requestedTime: string,
  options?: {
    durationMinutes?: number;
    stepMinutes?: number;
    maxSuggestions?: number;
    searchWindowHours?: number;
  }
) {
  const durationMinutes = options?.durationMinutes ?? DEFAULT_EVENT_DURATION_MINUTES;
  const stepMinutes = options?.stepMinutes ?? 15;
  const maxSuggestions = options?.maxSuggestions ?? 3;
  const searchWindowHours = options?.searchWindowHours ?? 6;

  if (connections.length === 0) return [] as string[];

  const suggestions: string[] = [];
  const maxAttempts = Math.floor((searchWindowHours * 60) / stepMinutes);

  for (let i = 1; i <= maxAttempts; i++) {
    const candidateTime = addMinutesToTime(requestedTime, i * stepMinutes);
    if (suggestions.includes(candidateTime)) continue;

    try {
      const availability = await checkAvailabilityAcrossCalendars(connections, candidateTime, durationMinutes);
      if (availability.available) {
        suggestions.push(candidateTime);
      }
    } catch {
      // Ignore failed probes and continue searching.
    }

    if (suggestions.length >= maxSuggestions) break;
  }

  return suggestions;
}
