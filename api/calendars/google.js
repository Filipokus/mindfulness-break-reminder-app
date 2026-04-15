import { createDAVClient } from 'tsdav';

// Google Calendar CalDAV configuration
// Google Calendar exposes CalDAV at: https://apidata.googleusercontent.com/caldav/v2/
// Users must generate an App Password at: https://myaccount.google.com/apppasswords

async function getGoogleClient(email, password) {
  // Google app passwords are sometimes copied with spaces; normalize safely.
  const normalizedPassword = String(password).replace(/\s+/g, '').trim();
  return createDAVClient({
    // With tsdav, use the root CalDAV endpoint and let principal discovery resolve calendar home.
    serverUrl: 'https://apidata.googleusercontent.com/caldav/v2/',
    credentials: { username: email, password: normalizedPassword },
    authMethod: 'Basic',
    defaultAccountType: 'caldav',
  });
}

export const googleCalendar = {
  async listCalendars(email, password) {
    try {
      const client = await getGoogleClient(email, password);
      const calendars = await client.fetchCalendars();
      if (!calendars || calendars.length === 0) throw new Error('No calendars found');
      return calendars;
    } catch (error) {
      console.error('Failed to list Google calendars:', error.message);
      throw new Error(`Google Calendar connection failed: ${error.message}`);
    }
  },

  async checkAvailability(email, password, startTime, endTime) {
    try {
      const client = await getGoogleClient(email, password);
      const calendars = await client.fetchCalendars();
      if (!calendars || calendars.length === 0) return false;

      const events = await client.fetchCalendarObjects({
        calendar: calendars[0],
        timeRange: { start: startTime, end: endTime },
      });
      return events.length > 0;
    } catch (error) {
      console.error('Failed to check Google Calendar availability:', error.message);
      throw error;
    }
  },

  async createEvent(email, password, eventData) {
    try {
      const client = await getGoogleClient(email, password);
      const calendars = await client.fetchCalendars();
      if (!calendars || calendars.length === 0) throw new Error('No calendars found');

      const uid = `${Date.now()}-${Math.random().toString(36).slice(2)}@mindfulness-app`;
      const icsContent = this.buildICS({ ...eventData, uid });
      await client.createCalendarObject({
        calendar: calendars[0],
        filename: `${uid}.ics`,
        iCalString: icsContent,
      });
      return uid;
    } catch (error) {
      console.error('Failed to create Google Calendar event:', error.message);
      throw error;
    }
  },

  async updateEvent(email, password, eventId, eventData) {
    try {
      await this.deleteEvent(email, password, eventId);
      return await this.createEvent(email, password, eventData);
    } catch (error) {
      console.error('Failed to update Google Calendar event:', error.message);
      throw error;
    }
  },

  async deleteEvent(email, password, eventId) {
    try {
      const client = await getGoogleClient(email, password);
      const calendars = await client.fetchCalendars();
      if (!calendars || calendars.length === 0) return;

      const events = await client.fetchCalendarObjects({ calendar: calendars[0] });
      const match = events.find(e => e.url?.includes(eventId) || e.data?.includes(eventId));
      if (match) await client.deleteCalendarObject({ calendarObject: match });
    } catch (error) {
      console.error('Failed to delete Google Calendar event:', error.message);
      throw error;
    }
  },

  buildICS(eventData) {
    // Build a simple iCalendar format event
    const { summary, description, dtstart, dtend, rrule } = eventData;

    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Mindfulness Break Reminder//EN',
      'BEGIN:VEVENT',
      `UID:${Date.now()}@mindfulness-app`,
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
