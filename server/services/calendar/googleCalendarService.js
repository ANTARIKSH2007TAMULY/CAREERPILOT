import crypto from 'node:crypto';
import { requestJson } from '../../utils/httpClient.js';
import { decryptSecret, encryptSecret } from '../../utils/tokenCrypto.js';
import { safeErrorMessage } from '../../utils/redact.js';
import User from '../../models/User.js';
import { isMongoConnected } from '../../config/db.js';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const CALENDAR_READONLY_SCOPE = 'https://www.googleapis.com/auth/calendar.readonly';
const USERINFO_EMAIL_SCOPE = 'https://www.googleapis.com/auth/userinfo.email';
const ALL_SCOPES = `${CALENDAR_READONLY_SCOPE} ${USERINFO_EMAIL_SCOPE} openid`;
const STATE_TTL_MS = 10 * 60 * 1000;

export const hasGoogleCalendarConfig = () =>
  Boolean(
    String(process.env.GOOGLE_CLIENT_ID || '').trim() &&
      String(process.env.GOOGLE_CLIENT_SECRET || '').trim() &&
      String(process.env.GOOGLE_REDIRECT_URI || '').trim()
  );

export const getGoogleRedirectUri = () =>
  String(process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5001/api/integrations/google/callback').trim();

const signState = (payload) => {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const secret = process.env.JWT_SECRET || 'dev-secret-change-me';
  const sig = crypto.createHmac('sha256', secret).update(body).digest('base64url');
  return `${body}.${sig}`;
};

export const createOAuthState = (userId) =>
  signState({
    userId: String(userId),
    nonce: crypto.randomBytes(16).toString('hex'),
    issuedAt: Date.now(),
  });

export const verifyOAuthState = (state, expectedUserId, expectedState) => {
  if (!state || !expectedState || state !== expectedState) {
    return { valid: false, reason: 'State mismatch' };
  }

  const [body, sig] = String(state).split('.');
  if (!body || !sig) return { valid: false, reason: 'Malformed state' };

  const secret = process.env.JWT_SECRET || 'dev-secret-change-me';
  const expectedSig = crypto.createHmac('sha256', secret).update(body).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return { valid: false, reason: 'Invalid state signature' };
  }

  let payload;
  try {
    payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  } catch {
    return { valid: false, reason: 'Invalid state payload' };
  }

  if (Date.now() - Number(payload.issuedAt || 0) > STATE_TTL_MS) {
    return { valid: false, reason: 'State expired' };
  }
  if (expectedUserId && String(payload.userId) !== String(expectedUserId)) {
    return { valid: false, reason: 'State user mismatch' };
  }

  return { valid: true, payload };
};

export const buildAuthorizationUrl = (state) => {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: getGoogleRedirectUri(),
    response_type: 'code',
    scope: ALL_SCOPES,
    access_type: 'offline',
    prompt: 'select_account consent',
    include_granted_scopes: 'true',
    state,
  });
  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
};

const saveTokens = async (userId, tokens) => {
  if (!isMongoConnected()) {
    throw new Error('MongoDB is required to store Google Calendar tokens');
  }

  const update = {
    'googleCalendar.connected': true,
    'googleCalendar.encryptedAccessToken': encryptSecret(tokens.access_token),
    'googleCalendar.expiryDate': new Date(Date.now() + Number(tokens.expires_in || 3600) * 1000),
    'googleCalendar.scope': tokens.scope || CALENDAR_READONLY_SCOPE,
    'googleCalendar.connectedAt': new Date(),
  };

  if (tokens.connectedEmail) {
    update['googleCalendar.connectedEmail'] = String(tokens.connectedEmail).trim().toLowerCase();
  }

  if (tokens.refresh_token) {
    update['googleCalendar.encryptedRefreshToken'] = encryptSecret(tokens.refresh_token);
  }

  await User.findByIdAndUpdate(userId, { $set: update });
};

export const exchangeCodeForTokens = async ({ code, userId }) => {
  const response = await requestJson({
    url: GOOGLE_TOKEN_URL,
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: getGoogleRedirectUri(),
      grant_type: 'authorization_code',
    }).toString(),
  });

  const tokens = response.json || {};
  let connectedEmail = '';

  // 1. Try decoding email from id_token claims if returned
  if (tokens.id_token && typeof tokens.id_token === 'string') {
    try {
      const parts = tokens.id_token.split('.');
      if (parts[1]) {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
        if (payload?.email) {
          connectedEmail = String(payload.email).toLowerCase().trim();
        }
      }
    } catch {
      // ignore token decode errors
    }
  }

  // 2. If not obtained from id_token, fetch userinfo from Google API with access token
  if (!connectedEmail && tokens.access_token) {
    try {
      const userinfoRes = await requestJson({
        url: 'https://www.googleapis.com/oauth2/v2/userinfo',
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });
      if (userinfoRes.json?.email) {
        connectedEmail = String(userinfoRes.json.email).toLowerCase().trim();
      }
    } catch (err) {
      console.warn('[GoogleCalendar] Userinfo lookup notice:', safeErrorMessage(err));
    }
  }

  await saveTokens(userId, { ...tokens, connectedEmail });
  return { connected: true, connectedEmail };
};

export const revokeGoogleToken = async (token) => {
  if (!token) return;
  try {
    await requestJson({
      url: `https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`,
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  } catch (error) {
    console.warn('[GoogleCalendar] Token revocation notice:', safeErrorMessage(error));
  }
};

const refreshAccessToken = async (user) => {
  const refreshToken = decryptSecret(user.googleCalendar?.encryptedRefreshToken || '');
  if (!refreshToken) {
    throw new Error('Google Calendar refresh token is missing. Reconnect the integration.');
  }

  try {
    const response = await requestJson({
      url: GOOGLE_TOKEN_URL,
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        refresh_token: refreshToken,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        grant_type: 'refresh_token',
      }).toString(),
    });

    await saveTokens(user._id, {
      ...response.json,
      refresh_token: response.json?.refresh_token || refreshToken,
      connectedEmail: user.googleCalendar?.connectedEmail,
    });
    return response.json?.access_token;
  } catch (error) {
    if (isMongoConnected() && (error.message?.includes('invalid_grant') || error.status === 400)) {
      await User.findByIdAndUpdate(user._id, {
        $set: { 'googleCalendar.connected': false },
      });
    }
    throw error;
  }
};

const getAccessTokenForUser = async (user) => {
  const expiry = user.googleCalendar?.expiryDate ? new Date(user.googleCalendar.expiryDate).getTime() : 0;
  if (user.googleCalendar?.encryptedAccessToken && expiry - 60_000 > Date.now()) {
    return decryptSecret(user.googleCalendar.encryptedAccessToken);
  }
  return refreshAccessToken(user);
};

export const getCalendarStatus = (user) => {
  const scope = user?.googleCalendar?.scope || '';
  return {
    configured: hasGoogleCalendarConfig(),
    connected: Boolean(user?.googleCalendar?.connected),
    connectedEmail: user?.googleCalendar?.connectedEmail || '',
    scope,
    hasReadonlyAccess: hasCalendarReadonlyScope(scope),
    connectedAt: user?.googleCalendar?.connectedAt || null,
    redirectUri: getGoogleRedirectUri(),
  };
};

export const disconnectGoogleCalendar = async (userId) => {
  if (!userId) return;
  if (isMongoConnected()) {
    const user = await User.findById(userId);
    if (user?.googleCalendar) {
      const token = decryptSecret(user.googleCalendar.encryptedRefreshToken || user.googleCalendar.encryptedAccessToken || '');
      if (token) {
        await revokeGoogleToken(token);
      }
      await User.findByIdAndUpdate(userId, {
        $unset: { googleCalendar: 1 },
      });
    }
  }
};

export const testCalendarConnection = async (user) => {
  if (!user?.googleCalendar?.connected) {
    return { operational: false, error: 'Google Calendar is not connected' };
  }

  try {
    const accessToken = await getAccessTokenForUser(user);
    const response = await requestJson({
      url: 'https://www.googleapis.com/calendar/v3/users/me/calendarList?maxResults=5',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const calendars = Array.isArray(response.json?.items) ? response.json.items : [];
    return {
      operational: true,
      calendarCount: calendars.length,
      connectedEmail: user.googleCalendar?.connectedEmail || '',
    };
  } catch (error) {
    return {
      operational: false,
      error: safeErrorMessage(error),
    };
  }
};

export const hasCalendarReadonlyScope = (scope = '') => {
  const granted = String(scope || '')
    .split(/\s+/)
    .filter(Boolean);
  return granted.some((item) =>
    [
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/calendar.events.readonly',
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events',
    ].includes(item)
  );
};

export const shiftYmd = (ymd, days) => {
  const match = String(ymd || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return '';
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]) + days));
  return date.toISOString().slice(0, 10);
};

export const validateCalendarTimeRange = ({ timeMin, timeMax, now = new Date() } = {}) => {
  let startIso = timeMin;
  let endIso = timeMax;

  if (startIso) {
    const parsed = new Date(startIso);
    if (Number.isNaN(parsed.getTime())) {
      const error = new Error('Invalid timeMin format');
      error.status = 400;
      throw error;
    }
    startIso = parsed.toISOString();
  } else {
    const start = new Date(now.getFullYear(), now.getMonth(), 1 - 7);
    startIso = start.toISOString();
  }

  if (endIso) {
    const parsed = new Date(endIso);
    if (Number.isNaN(parsed.getTime())) {
      const error = new Error('Invalid timeMax format');
      error.status = 400;
      throw error;
    }
    endIso = parsed.toISOString();
  } else {
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 7, 23, 59, 59);
    endIso = end.toISOString();
  }

  if (new Date(startIso).getTime() > new Date(endIso).getTime()) {
    const error = new Error('timeMin must be earlier than or equal to timeMax');
    error.status = 400;
    throw error;
  }

  const diffDays = (new Date(endIso).getTime() - new Date(startIso).getTime()) / (1000 * 60 * 60 * 24);
  if (diffDays > 180) {
    const error = new Error('Date range cannot exceed 180 days');
    error.status = 400;
    throw error;
  }

  return { startIso, endIso };
};

export const buildGoogleEventsUrl = ({
  calendarId = 'primary',
  timeMin,
  timeMax,
  maxResults = 100,
  pageToken,
} = {}) => {
  const queryParams = new URLSearchParams({
    timeMin,
    timeMax,
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: String(maxResults),
  });
  if (pageToken) queryParams.set('pageToken', String(pageToken));
  const targetCalendarId = encodeURIComponent(calendarId || 'primary');
  return `https://www.googleapis.com/calendar/v3/calendars/${targetCalendarId}/events?${queryParams.toString()}`;
};

export const extractMeetingUrl = (item = {}) => {
  if (item.hangoutLink) {
    return item.hangoutLink;
  }
  if (Array.isArray(item.conferenceData?.entryPoints)) {
    const videoEntry = item.conferenceData.entryPoints.find(
      (ep) => ep.entryPointType === 'video' && ep.uri
    );
    if (videoEntry?.uri) return videoEntry.uri;
    const anyEntry = item.conferenceData.entryPoints.find((ep) => ep.uri);
    if (anyEntry?.uri) return anyEntry.uri;
  }

  // Look for meet / zoom / teams / webex URLs in location or description
  const combined = `${item.location || ''} ${item.description || ''}`;
  const meetRegex = /https:\/\/(?:meet\.google\.com\/[a-z0-9-]+|(?:[a-z0-9.-]+\.)?zoom\.us\/[jsw]\/[a-zA-Z0-9?=_&%-]+|teams\.microsoft\.com\/l\/meetup-join\/[a-zA-Z0-9?=_&%/-]+)/i;
  const match = combined.match(meetRegex);
  return match ? match[0] : '';
};

export const normalizeGoogleCalendarEvent = (item = {}) => {
  const isAllDay = Boolean(item.start?.date && !item.start?.dateTime);
  const startTime = item.start?.dateTime || item.start?.date || '';
  const endTime = item.end?.dateTime || item.end?.date || '';
  const displayStartDate = isAllDay ? item.start?.date || '' : '';
  const exclusiveEnd = isAllDay ? item.end?.date || '' : '';
  const displayEndDate = isAllDay
    ? shiftYmd(exclusiveEnd, -1) || displayStartDate
    : '';

  return {
    id: String(item.id || ''),
    title: String(item.summary || '(Untitled Event)').trim(),
    description: String(item.description || '').trim().slice(0, 8000),
    location: String(item.location || '').trim(),
    meetingUrl: extractMeetingUrl(item),
    htmlLink: item.htmlLink || '',
    status: item.status || 'confirmed',
    isAllDay,
    displayStartDate,
    displayEndDate,
    start: {
      dateTime: item.start?.dateTime || null,
      date: item.start?.date || null,
      timeZone: item.start?.timeZone || null,
      raw: startTime,
    },
    end: {
      dateTime: item.end?.dateTime || null,
      date: item.end?.date || null,
      timeZone: item.end?.timeZone || null,
      raw: endTime,
    },
    attendees: Array.isArray(item.attendees)
      ? item.attendees.map((att) => ({
          email: String(att.email || '').toLowerCase().trim(),
          displayName: att.displayName || att.email || '',
          responseStatus: att.responseStatus || 'needsAction',
          self: Boolean(att.self),
          organizer: Boolean(att.organizer),
        }))
      : [],
    organizer: item.organizer
      ? {
          email: String(item.organizer.email || '').toLowerCase().trim(),
          displayName: item.organizer.displayName || item.organizer.email || '',
          self: Boolean(item.organizer.self),
        }
      : null,
    source: 'google',
    eventType: item.eventType || 'default',
    colorId: item.colorId || null,
  };
};

export const getCalendarEvents = async (user, {
  timeMin,
  timeMax,
  maxResults = 100,
  pageToken,
  calendarId = 'primary',
} = {}) => {
  if (!user?.googleCalendar?.connected) {
    return {
      connected: false,
      connectedEmail: '',
      events: [],
      error: 'Google Calendar is not connected',
    };
  }

  const { startIso, endIso } = validateCalendarTimeRange({ timeMin, timeMax });
  const limit = Math.min(Math.max(1, parseInt(maxResults, 10) || 100), 250);
  const requestedPage = Boolean(pageToken);

  let accessToken;
  try {
    accessToken = await getAccessTokenForUser(user);
  } catch (authErr) {
    if (isMongoConnected()) {
      await User.findByIdAndUpdate(user._id, {
        $set: { 'googleCalendar.connected': false },
      });
    }
    const err = new Error('Google Calendar authorization expired. Please reconnect.');
    err.requiresReconnect = true;
    err.status = 401;
    throw err;
  }

  const items = [];
  let nextPageToken = pageToken || null;
  let calendarTimeZone = 'UTC';
  let pages = 0;
  const maxPages = requestedPage ? 1 : 4;

  try {
    do {
      const url = buildGoogleEventsUrl({
        calendarId: 'primary',
        timeMin: startIso,
        timeMax: endIso,
        maxResults: limit,
        pageToken: nextPageToken,
      });
      const response = await requestJson({
        url,
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = response.json || {};
      calendarTimeZone = data.timeZone || calendarTimeZone;
      const pageItems = Array.isArray(data.items) ? data.items : [];
      items.push(...pageItems);
      nextPageToken = data.nextPageToken || null;
      pages += 1;
    } while (nextPageToken && !requestedPage && pages < maxPages && items.length < limit);
  } catch (apiErr) {
    if (apiErr.status === 401) {
      if (isMongoConnected()) {
        await User.findByIdAndUpdate(user._id, {
          $set: { 'googleCalendar.connected': false },
        });
      }
      const err = new Error('Google Calendar access token was revoked. Please reconnect.');
      err.requiresReconnect = true;
      err.status = 401;
      throw err;
    }
    if (apiErr.status === 403) {
      const err = new Error('Google Calendar permission is missing. Reconnect and grant read-only calendar access.');
      err.requiresReconnect = true;
      err.status = 403;
      throw err;
    }
    throw apiErr;
  }

  const normalizedEvents = items.slice(0, limit).map((item) => normalizeGoogleCalendarEvent(item));

  // Ensure deterministic chronological sorting by raw start time
  normalizedEvents.sort((a, b) => {
    const timeA = new Date(a.start?.raw || 0).getTime();
    const timeB = new Date(b.start?.raw || 0).getTime();
    return timeA - timeB;
  });

  return {
    connected: true,
    connectedEmail: user.googleCalendar?.connectedEmail || '',
    timeZone: calendarTimeZone || 'UTC',
    events: normalizedEvents,
    nextPageToken: nextPageToken || null,
  };
};

export const CALENDAR_READONLY_SCOPE_VALUE = CALENDAR_READONLY_SCOPE;
