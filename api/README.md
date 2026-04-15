# Calendar Backend (CalDAV)

This backend provides CalDAV integration for Google Calendar and Outlook Calendar without requiring OAuth. Users connect their calendars using their email and app password instead.

## Setup

### Prerequisites

- Node.js 18+
- Google Calendar (Gmail account)
- Outlook Calendar (Microsoft account)
- App passwords for both (see below)

### Installation

```bash
npm run api:install
```

### Environment Variables

Create `api/.env.local`:

```env
PORT=3001
FRONTEND_URL=http://localhost:5173
NODE_ENV=development
```

## Running the Backend

### Development

```bash
npm run api:dev
```

The backend will run on `http://localhost:3001`

### Production (Vercel)

Push to GitHub. Vercel automatically deploys `/api` folder.

## User Setup: Google Calendar

1. **Create an App Password:**
   - Go to myaccount.google.com/apppasswords
   - Select "Mail" and "Windows Computer" (or your device)
   - Generate an app password (16 characters)
   - Copy the password

2. **Connect in the app:**
   - Email: your gmail address (e.g., user@gmail.com)
   - Password: the 16-character app password from step 1

## User Setup: Outlook Calendar

1. **Create an App Password (optional but recommended):**
   - Go to account.microsoft.com/security
   - Select "Create a new app password"
   - Copy the password

2. **Connect in the app:**
   - Email: your outlook/microsoft email
   - Password: your master password OR app password from step 1

## API Endpoints

### Connect Calendar
```
POST /api/calendar/connect
Body: {
  userId: string,
  provider: "google" | "outlook",
  email: string,
  password: string
}
```

### Get Connected Calendars
```
GET /api/calendar/connected/:userId
```

### Disconnect Calendar
```
POST /api/calendar/disconnect
Body: {
  userId: string,
  provider: string
}
```

### Check Availability
```
POST /api/calendar/availability
Body: {
  userId: string,
  startTime: ISO 8601 string,
  endTime: ISO 8601 string,
  providers?: string[]
}
```

### Create Event
```
POST /api/calendar/event/create
Body: {
  userId: string,
  providers: string[],
  event: {
    summary: string,
    description?: string,
    dtstart: ISO 8601 string,
    dtend: ISO 8601 string,
    rrule?: string
  }
}
```

### Update Event
```
POST /api/calendar/event/update
Body: {
  userId: string,
  providers: string[],
  eventId: Record<string, string>,
  event: CalendarEvent
}
```

### Delete Event
```
POST /api/calendar/event/delete
Body: {
  userId: string,
  providers: string[],
  eventId: Record<string, string>
}
```

## How It Works

### CalDAV Protocol

CalDAV is an open standard (RFC 4791) for remote calendar access. Both Google and Outlook support it natively:

- **Google Calendar:** `https://apidata.googleusercontent.com/caldav/v2/{email}/user/`
- **Outlook Calendar:** `https://outlook.office365.com/api/v2.0/`

### No OAuth Needed

Users just provide:
1. Email address
2. App password (which they generate themselves)

The backend handles all CalDAV communication securely server-side.

### Storage

By default, credentials are stored **in-memory** only. For production, migrate to:
- Firestore (recommended, already integrated)
- PostgreSQL
- MongoDB
- Other database

See `api/storage.js` for the storage interface.

## Production Deployment

### Required Environment Variables

Set on Vercel:
```
FRONTEND_URL=https://filipokus.github.io/mindfulness-break-reminder-app
```

### Vercel Configuration

The `vercel.json` file at the root already configures API routing.

### CORS

The backend allows requests from:
- `http://localhost:5173` (local dev)
- `https://filipokus.github.io` (production)

Update in `api/index.js` if needed.

## Troubleshooting

### "Invalid email or password"

- Ensure you're using an **app password**, not your regular password
- For Google: Generate at myaccount.google.com/apppasswords
- For Outlook: Generate at account.microsoft.com/security

### "No calendars found"

- The account has no calendars, or the app password doesn't have calendar access
- Verify in Google/Outlook web that calendars exist

### CORS errors in frontend

- Check CORS origin in `api/index.js`
- Ensure `FRONTEND_URL` env var is set correctly

### Events not appearing

- CalDAV takes 5-30 seconds to sync to the calendar UI
- Check that the event UID is unique
- Verify account has permission to create events

## Development Notes

- Credentials are stored in-memory; they're lost on server restart
- For testing, use app passwords (safer than storing real passwords)
- CalDAV uses XML/iCalendar format; see `google.js` and `outlook.js` for format details
- The `caldav` npm package handles most of the protocol complexity
