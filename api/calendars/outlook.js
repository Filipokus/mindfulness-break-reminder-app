import { createDAVClient } from 'tsdav';

// Outlook Calendar CalDAV configuration
// Outlook CalDAV endpoint: https://outlook.office365.com/api/v2.0/
// Users can use their regular password or an app password from account.microsoft.com/security

async function getOutlookClient(email, password) {
  return createDAVClient({
    serverUrl: 'https://outlook.office365.com/api/v2.0/',
    credentials: { username: email, password },
    authMethod: 'Basic',
    defaultAccountType: 'caldav',
  });
}

export const outlookCalendar = {
  async listCalendars(email, password) {
    try {
      const client = await getOutlookClient(email, password);
      const calendars = await client.fetchCalendars();
      if (!calendars || calendars.length === 0) throw new Error('No calendars found');
      return calendars;
    } catch (error) {
      console.error('Failed to list Outlook calendars:', error.message);
      throw new Error(`Outlook Calendar connection failed: ${error.message}`);
    }
  },

  async checkAvailability(email, password, startTime, endTime) {
    try {
      const client = await getOutlookClient(email, password);
      const calendars = await client.fetchCalendars();
      if (!calendars || calendars.length === 0) return false;

      const events = await client.fetchCalendarObjects({
        calendar: calendars[0],
        timeRange: { start: startTime, end: endTime },
      });
      return events.length > 0;
    } catch (error) {
      console.error('Failed to check Outlook Calendar availability:', error.message);
      throw error;
    }
  },

  async createEvent(email, password, eventData) {
    try {
      const client = await getOutlookClient(email, password);
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
      console.error('Failed to create Outlook Calendar event:', error.message);
      throw error;
    }
  },

  async updateEvent(email, password, eventId, eventData) {
    try {
      await this.deleteEvent(email, password, eventId);
      return await this.createEvent(email, password, eventData);
    } catch (error) {
      console.error('Failed to update Outlook Calendar event:', error.message);
      throw error;
    }
  },

  async deleteEvent(email, password, eventId) {
    try {
      const client = await getOutlookClient(email, password);
      const calendars = await client.fetchCalendars();
      if (!calendars || calendars.length === 0) return;

      const events = await client.fetchCalendarObjects({ calendar: calendars[0] });
      const match = events.find(e => e.url?.includes(eventId) || e.data?.includes(eventId));
      if (match) await client.deleteCalendarObject({ calendarObject: match });
    } catch (error) {
      console.error('Failed to delete Outlook Calendar event:', error.message);
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
