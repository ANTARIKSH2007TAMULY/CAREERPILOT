import asyncHandler from '../utils/asyncHandler.js';
import User from '../models/User.js';
import { isMongoConnected } from '../config/db.js';
import {
  buildAuthorizationUrl,
  createOAuthState,
  disconnectGoogleCalendar,
  getCalendarStatus,
  hasGoogleCalendarConfig,
  testCalendarConnection,
  verifyOAuthState,
  exchangeCodeForTokens,
  getCalendarEvents,
} from '../services/calendar/googleCalendarService.js';

const STATE_COOKIE = 'gcal_oauth_state';

const isProd = process.env.NODE_ENV === 'production';
const cookieOptions = {
  httpOnly: true,
  sameSite: isProd ? 'none' : 'lax',
  secure: isProd,
  maxAge: 10 * 60 * 1000,
};

export const getGoogleStatus = asyncHandler(async (req, res) => {
  const user = isMongoConnected()
    ? await User.findById(req.user._id).select(
        '-password -googleCalendar.encryptedAccessToken -googleCalendar.encryptedRefreshToken'
      )
    : req.user;
  res.status(200).json({
    success: true,
    data: getCalendarStatus(user),
  });
});

export const startGoogleOAuth = asyncHandler(async (req, res) => {
  if (!hasGoogleCalendarConfig()) {
    return res.status(503).json({
      success: false,
      message: 'Google Calendar is not configured on the server',
    });
  }

  const state = createOAuthState(req.user._id);
  res.cookie(STATE_COOKIE, state, cookieOptions);
  res.status(200).json({
    success: true,
    data: {
      authorizationUrl: buildAuthorizationUrl(state),
    },
  });
});

export const googleOAuthCallback = asyncHandler(async (req, res) => {
  const { code, state, error } = req.query;
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  const clearCookie = () =>
    res.clearCookie(STATE_COOKIE, {
      httpOnly: true,
      sameSite: isProd ? 'none' : 'lax',
      secure: isProd,
    });

  if (error) {
    clearCookie();
    return res.redirect(`${clientUrl}/settings?google=denied`);
  }

  const cookieState = req.cookies?.[STATE_COOKIE];
  const decodedState = verifyOAuthState(state, undefined, cookieState);
  if (!decodedState.valid || !decodedState.payload?.userId) {
    clearCookie();
    return res.redirect(`${clientUrl}/settings?google=invalid-state`);
  }

  if (!isMongoConnected()) {
    clearCookie();
    return res.redirect(`${clientUrl}/settings?google=db-required`);
  }

  const user = await User.findById(decodedState.payload.userId);
  if (!user) {
    clearCookie();
    return res.redirect(`${clientUrl}/settings?google=unauthorized`);
  }

  try {
    await exchangeCodeForTokens({ code, userId: user._id });
    clearCookie();
    return res.redirect(`${clientUrl}/settings?google=connected`);
  } catch (err) {
    clearCookie();
    const reason = encodeURIComponent(err.message || 'token-exchange-failed');
    return res.redirect(`${clientUrl}/settings?google=error&reason=${reason}`);
  }
});

export const disconnectGoogle = asyncHandler(async (req, res) => {
  await disconnectGoogleCalendar(req.user._id);
  res.status(200).json({
    success: true,
    data: { connected: false },
  });
});

export const testGoogleConnection = asyncHandler(async (req, res) => {
  const user = isMongoConnected() ? await User.findById(req.user._id) : req.user;
  if (!user || String(user._id) !== String(req.user._id)) {
    return res.status(403).json({ success: false, message: 'Not allowed to access this calendar connection' });
  }
  const result = await testCalendarConnection(user);
  res.status(result.operational ? 200 : 409).json({
    success: result.operational,
    data: result,
  });
});

export const getGoogleCalendarEvents = asyncHandler(async (req, res) => {
  const user = isMongoConnected() ? await User.findById(req.user._id) : req.user;
  if (!user || String(user._id) !== String(req.user._id)) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  const { timeMin, timeMax, maxResults, pageToken } = req.query;

  try {
    const result = await getCalendarEvents(user, {
      timeMin,
      timeMax,
      maxResults,
      pageToken,
      calendarId: 'primary',
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    const msg = error.message || 'Failed to retrieve calendar events';
    const status = error.status || (error.requiresReconnect ? 401 : 400);

    return res.status(status).json({
      success: false,
      message: msg,
      requiresReconnect: Boolean(error.requiresReconnect),
    });
  }
});
