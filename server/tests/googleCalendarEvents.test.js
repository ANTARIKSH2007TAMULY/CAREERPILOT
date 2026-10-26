import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildGoogleEventsUrl,
  extractMeetingUrl,
  hasCalendarReadonlyScope,
  normalizeGoogleCalendarEvent,
  shiftYmd,
  validateCalendarTimeRange,
} from '../services/calendar/googleCalendarService.js';

test('readonly calendar scope detection does not require write access', () => {
  assert.equal(
    hasCalendarReadonlyScope('https://www.googleapis.com/auth/calendar.readonly openid'),
    true
  );
  assert.equal(hasCalendarReadonlyScope('openid https://www.googleapis.com/auth/userinfo.email'), false);
});

test('date range validation rejects inverted and oversized windows', () => {
  const ok = validateCalendarTimeRange({
    timeMin: '2026-10-01T00:00:00.000Z',
    timeMax: '2026-10-31T00:00:00.000Z',
  });
  assert.equal(ok.startIso, '2026-10-01T00:00:00.000Z');

  assert.throws(
    () =>
      validateCalendarTimeRange({
        timeMin: '2026-11-01T00:00:00.000Z',
        timeMax: '2026-10-01T00:00:00.000Z',
      }),
    /timeMin must be earlier/
  );
  assert.throws(
    () =>
      validateCalendarTimeRange({
        timeMin: '2026-01-01T00:00:00.000Z',
        timeMax: '2026-12-01T00:00:00.000Z',
      }),
    /180 days/
  );
  assert.throws(() => validateCalendarTimeRange({ timeMin: 'not-a-date', timeMax: '2026-10-02' }), /Invalid timeMin/);
});

test('events URL expands recurring instances and supports page tokens', () => {
  const url = buildGoogleEventsUrl({
    timeMin: '2026-10-01T00:00:00.000Z',
    timeMax: '2026-10-08T00:00:00.000Z',
    maxResults: 50,
    pageToken: 'abc123',
  });
  assert.match(url, /calendars\/primary\/events/);
  assert.match(url, /singleEvents=true/);
  assert.match(url, /orderBy=startTime/);
  assert.match(url, /pageToken=abc123/);
});

test('all-day events keep calendar dates and treat Google end dates as exclusive', () => {
  const normalized = normalizeGoogleCalendarEvent({
    id: 'all-day-1',
    summary: 'Company holiday',
    start: { date: '2026-10-26' },
    end: { date: '2026-10-27' },
    htmlLink: 'https://calendar.google.com/event?eid=test',
  });
  assert.equal(normalized.isAllDay, true);
  assert.equal(normalized.displayStartDate, '2026-10-26');
  assert.equal(normalized.displayEndDate, '2026-10-26');
  assert.equal(shiftYmd('2026-10-27', -1), '2026-10-26');
  assert.equal(normalized.start.dateTime, null);
});

test('timed events preserve offsets and meeting URLs', () => {
  const normalized = normalizeGoogleCalendarEvent({
    id: 'timed-1',
    summary: 'Sync',
    start: { dateTime: '2026-10-26T14:00:00+05:30', timeZone: 'Asia/Kolkata' },
    end: { dateTime: '2026-10-26T15:00:00+05:30', timeZone: 'Asia/Kolkata' },
    hangoutLink: 'https://meet.google.com/abc-defg-hij',
    attendees: [{ email: 'a@example.com', self: true, responseStatus: 'accepted' }],
  });
  assert.equal(normalized.isAllDay, false);
  assert.equal(normalized.start.dateTime, '2026-10-26T14:00:00+05:30');
  assert.equal(normalized.meetingUrl, 'https://meet.google.com/abc-defg-hij');
  assert.equal(extractMeetingUrl({ location: 'https://zoom.us/j/123456789' }), 'https://zoom.us/j/123456789');
});

test('empty Google payloads normalize to an empty event list shape', () => {
  const empty = [].map((item) => normalizeGoogleCalendarEvent(item));
  assert.deepEqual(empty, []);
});

test('disconnected users are not treated as calendar errors in the service contract', async () => {
  const { getCalendarEvents } = await import('../services/calendar/googleCalendarService.js');
  const result = await getCalendarEvents({ _id: 'user-a', googleCalendar: { connected: false } }, {});
  assert.equal(result.connected, false);
  assert.deepEqual(result.events, []);
  assert.match(result.error, /not connected/);
});
