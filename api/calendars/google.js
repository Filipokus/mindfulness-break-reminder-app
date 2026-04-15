import fetch from 'node-fetch';

// Google Calendar CalDAV — direct HTTP for precise error handling.
// Requirements:
//   1. 2-Step Verification enabled on the Google account
//   2. App Password (16 chars) from https://myaccount.google.com/apppasswords
//   3. Enter full Gmail address + that App Password (NOT the normal Google password)

// NOTE: Google expects the @ in the path unencoded (many clients do this)
const USER_URL = (email) =>
  `https://apidata.googleusercontent.com/caldav/v2/${email}/user/`;
const EVENTS_URL = (email) =>
  `https://apidata.googleusercontent.com/caldav/v2/${email}/events/`;

function basicAuth(email, password) {
  const normalized = String(password).replace(/\s+/g, '');
  return 'Basic ' + Buffer.from(`${email}:${normalized}`).toString('base64');
}

function toUtcCompact(iso) {
  return new Date(iso).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

async function propfindUser(email, password) {
  const propfindXML = `<?xml version="1.0" encoding="utf-8"?><propfind xmlns="DAV:"><prop><displayname/><resourcetype/></prop></propfind>`;
  const commonHeaders = {
    'Content-Type': 'application/xml; charset=utf-8',
    'Content-Length': String(Buffer.byteLength(propfindXML, 'utf8')),
    Depth: '0',
  };

  // Send without auth first — let Google send the auth challenge (some servers require this)
  const challenge = await fetch(USER_URL(email), {
    method: 'PROPFIND',
    redirect: 'manual',       // catch redirects manually so auth header isn't stripped
    headers: commonHeaders,
    body: propfindXML,
  });

  // If Google redirected (e.g. %40 → @ normalisation), follow manually with auth
  let targetUrl = USER_URL(email);
  if ([301, 302, 303, 307, 308].includes(challenge.status)) {
    targetUrl = challenge.headers.get('location') || targetUrl;
    console.log(`[Google CalDAV] redirect detected → ${targetUrl}`);
  }

  // Now send the real PROPFIND with credentials
  const res = await fetch(targetUrl, {
    method: 'PROPFIND',
    redirect: 'manual',
    headers: { ...commonHeaders, Authorization: basicAuth(email, password) },
    body: propfindXML,
  });

  const statusCode = res.status;
  const body = await res.text().catch(() => '');
  console.log(`[Google CalDAV] PROPFIND status=${statusCode} url=${targetUrl}`);
  if (body) console.log(`[Google CalDAV] response body snippet: ${body.slice(0, 400)}`);

  if (statusCode === 401) {
    const err = new Error(`Google returned 401. Body: ${body.slice(0, 200)}`);
    err.status = 401;
    err.googleBody = body.slice(0, 300);
    throw err;
  }
  if (statusCode === 403) {
    const err = new Error('403 — CalDAV access may be restricted for this account');
    err.status = 403;
    throw err;
  }
  // 207 Multi-Status = authenticated OK
  if (statusCode === 207 || (statusCode >= 200 && statusCode < 300)) return true;

  const err = new Error(`Unexpected status ${statusCode} from Google CalDAV. Body: ${body.slice(0, 200)}`);
  err.status = statusCode;
  throw err;
}

export const googleCalendar = {
  async listCalendars(email, password) {
    await propfindUser(email, password);
    return [{ displayName: 'Google Calendar', url: EVENTS_URL(email) }];
  },

  async checkAvailability(email, password, startTime, endTime) {
    try {
      const body = `<?xml version="1.0" encoding="utf-8"?>
<C:calendar-query xmlns:C="urn:ietf:params:xml:ns:caldav" xmlns="DAV:">
  <prop><getetag/></prop>
  <C:filter>
    <C:comp-filter name="VCALENDAR">
      <C:comp-filter name="VEVENT">
        <C:time-range start="${toUtcCompact(startTime)}" end="${toUtcCompact(endTime)}"/>
      </C:comp-filter>
    </C:comp-filter>
  </C:filter>
</C:calendar-query>`;

      const res = await fetch(EVENTS_URL(email), {
        method: 'REPORT',
        headers: {
          Authorization: basicAuth(email, password),
          'Content-Type': 'application/xml; charset=utf-8',
          Depth: '1',
        },
        body,
      });

      if (!res.ok && res.status !== 207) return false;
      const text = await res.text();
      return text.includes('<response>') || text.includes('<d:response>');
    } catch {
      return false;
    }
  },

  async createEvent(email, password, eventData) {
    const uid = `${Date.now()}-${Math.random().toString(36).slice(2)}@mindfulness-app`;
    const icsContent = this.buildICS({ ...eventData, uid });
    const url = `${EVENTS_URL(email)}${uid}.ics`;

    const res = await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: basicAuth(email, password),
        'Content-Type': 'text/calendar; charset=utf-8',
      },
      body: icsContent,
    });

    if (!res.ok) throw new Error(`Failed to create Google event: ${res.status}`);
    return uid;
  },

  async updateEvent(email, password, eventId, eventData) {
    const icsContent = this.buildICS({ ...eventData, uid: eventId });
    const url = `${EVENTS_URL(email)}${eventId}.ics`;

    const res = await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: basicAuth(email, password),
        'Content-Type': 'text/calendar; charset=utf-8',
      },
      body: icsContent,
    });

    if (res.status === 404) return this.createEvent(email, password, eventData);
    if (!res.ok) throw new Error(`Failed to update Google event: ${res.status}`);
    return eventId;
  },

  async deleteEvent(email, password, eventId) {
    const url = `${EVENTS_URL(email)}${eventId}.ics`;
    await fetch(url, {
      method: 'DELETE',
      headers: { Authorization: basicAuth(email, password) },
    });
    // 404 = already deleted; ignore
  },

  buildICS(eventData) {
    const { uid, summary, description, dtstart, dtend, rrule } = eventData;

    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Mindfulness Break Reminder//EN',
      'BEGIN:VEVENT',
      `UID:${uid || Date.now() + '@mindfulness-app'}`,
      `DTSTAMP:${this.formatDateTime(new Date())}`,
      `DTSTART:${this.formatDateTime(new Date(dtstart))}`,
      `DTEND:${this.formatDateTime(new Date(dtend))}`,
      `SUMMARY:${summary}`,
    ];

    if (description) {
      lines.push(`DESCRIPTION:${description}`);
    }

    if (rrule) {
      lines.push(`RRULE:${rrule}`);
    }

    lines.push('END:VEVENT');
    lines.push('END:VCALENDAR');

    return lines.join('\r\n');
  },

  formatDateTime(date) {
    // Format as ISO 8601 for iCalendar: YYYYMMDDTHHMMSSZ
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    const hours = String(date.getUTCHours()).padStart(2, '0');
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');
    const seconds = String(date.getUTCSeconds()).padStart(2, '0');

    return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
  },
};
