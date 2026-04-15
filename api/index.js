import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { googleCalendar } from './calendars/google.js';
import { outlookCalendar } from './calendars/outlook.js';
import { credentialsStorage } from './storage.js';

dotenv.config({ path: '.env.local' });

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:5174',
    'https://filipokus.github.io',
    process.env.FRONTEND_URL
  ].filter(Boolean),
  credentials: true,
}));
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Calendar Endpoints

// Connect a calendar (saves credentials)
app.post('/api/calendar/connect', async (req, res) => {
  try {
    const { userId, provider, email, password } = req.body;

    if (!userId || !provider || !email || !password) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!['google', 'outlook'].includes(provider)) {
      return res.status(400).json({ error: 'Invalid provider' });
    }

    // Verify credentials by attempting to fetch calendar
    let isValid = false;
    let calendarName = '';

    try {
      if (provider === 'google') {
        const calendars = await googleCalendar.listCalendars(email, password);
        isValid = calendars.length > 0;
        calendarName = calendars[0]?.['D:displayname']?.[0] || 'Google Calendar';
      } else {
        const calendars = await outlookCalendar.listCalendars(email, password);
        isValid = calendars.length > 0;
        calendarName = calendars[0]?.displayName || 'Outlook Calendar';
      }
    } catch (error) {
      console.error(`Credential validation failed for ${provider}:`, error.message);
      if (provider === 'google') {
        return res.status(401).json({
          error: 'Google authentication failed. Use your Gmail address + a 16-character Google App Password (not your normal password).',
        });
      }
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (!isValid) {
      return res.status(401).json({ error: 'No calendars found' });
    }

    // Store credentials
    credentialsStorage.setCredentials(userId, provider, { email, password, connectedAt: new Date() });

    res.json({
      success: true,
      message: `Connected to ${calendarName}`,
      provider,
      email,
    });
  } catch (error) {
    console.error('Connect calendar error:', error);
    res.status(500).json({ error: error.message || 'Failed to connect calendar' });
  }
});

// Get connected calendars for a user
app.get('/api/calendar/connected/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const connected = credentialsStorage.getConnectedCalendars(userId);

    res.json({
      connected: connected.map(c => ({
        provider: c.provider,
        email: c.email,
        connectedAt: c.connectedAt,
      })),
    });
  } catch (error) {
    console.error('Get connected calendars error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Disconnect a calendar
app.post('/api/calendar/disconnect', (req, res) => {
  try {
    const { userId, provider } = req.body;

    if (!userId || !provider) {
      return res.status(400).json({ error: 'Missing userId or provider' });
    }

    credentialsStorage.removeCredentials(userId, provider);

    res.json({ success: true, message: 'Calendar disconnected' });
  } catch (error) {
    console.error('Disconnect calendar error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Check availability across calendars
app.post('/api/calendar/availability', async (req, res) => {
  try {
    const { userId, startTime, endTime, providers } = req.body;

    if (!userId || !startTime || !endTime) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const credentials = credentialsStorage.getCredentials(userId, providers);
    const conflicts = [];

    for (const provider in credentials) {
      try {
        const cred = credentials[provider];
        let isBusy = false;

        if (provider === 'google') {
          isBusy = await googleCalendar.checkAvailability(cred.email, cred.password, startTime, endTime);
        } else if (provider === 'outlook') {
          isBusy = await outlookCalendar.checkAvailability(cred.email, cred.password, startTime, endTime);
        }

        if (isBusy) {
          conflicts.push(provider);
        }
      } catch (error) {
        console.error(`Availability check failed for ${provider}:`, error.message);
        conflicts.push(provider);
      }
    }

    res.json({
      available: conflicts.length === 0,
      conflicts,
    });
  } catch (error) {
    console.error('Availability check error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create event
app.post('/api/calendar/event/create', async (req, res) => {
  try {
    const { userId, providers, event } = req.body;

    if (!userId || !event || !event.summary || !event.dtstart || !event.dtend) {
      return res.status(400).json({ error: 'Missing required event fields' });
    }

    const credentials = credentialsStorage.getCredentials(userId, providers);
    const createdEvents = {};

    for (const provider in credentials) {
      try {
        const cred = credentials[provider];
        let eventId;

        if (provider === 'google') {
          eventId = await googleCalendar.createEvent(cred.email, cred.password, event);
        } else if (provider === 'outlook') {
          eventId = await outlookCalendar.createEvent(cred.email, cred.password, event);
        }

        createdEvents[provider] = eventId;
      } catch (error) {
        console.error(`Event creation failed for ${provider}:`, error.message);
        createdEvents[provider] = { error: error.message };
      }
    }

    res.json({
      success: true,
      createdEvents,
    });
  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update event
app.post('/api/calendar/event/update', async (req, res) => {
  try {
    const { userId, providers, eventId, event } = req.body;

    if (!userId || !eventId || !event) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const credentials = credentialsStorage.getCredentials(userId, providers);
    const updatedEvents = {};

    for (const provider in credentials) {
      try {
        const cred = credentials[provider];

        if (provider === 'google') {
          await googleCalendar.updateEvent(cred.email, cred.password, eventId[provider], event);
        } else if (provider === 'outlook') {
          await outlookCalendar.updateEvent(cred.email, cred.password, eventId[provider], event);
        }

        updatedEvents[provider] = true;
      } catch (error) {
        console.error(`Event update failed for ${provider}:`, error.message);
        updatedEvents[provider] = { error: error.message };
      }
    }

    res.json({
      success: true,
      updatedEvents,
    });
  } catch (error) {
    console.error('Update event error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete event
app.post('/api/calendar/event/delete', async (req, res) => {
  try {
    const { userId, providers, eventId } = req.body;

    if (!userId || !eventId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const credentials = credentialsStorage.getCredentials(userId, providers);
    const deletedEvents = {};

    for (const provider in credentials) {
      try {
        const cred = credentials[provider];

        if (provider === 'google') {
          await googleCalendar.deleteEvent(cred.email, cred.password, eventId[provider]);
        } else if (provider === 'outlook') {
          await outlookCalendar.deleteEvent(cred.email, cred.password, eventId[provider]);
        }

        deletedEvents[provider] = true;
      } catch (error) {
        console.error(`Event deletion failed for ${provider}:`, error.message);
        deletedEvents[provider] = { error: error.message };
      }
    }

    res.json({
      success: true,
      deletedEvents,
    });
  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Calendar backend running on http://localhost:${PORT}`);
});
