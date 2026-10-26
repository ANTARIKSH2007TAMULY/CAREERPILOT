import { HttpError, requestJson } from '../../utils/httpClient.js';
import { safeErrorMessage } from '../../utils/redact.js';
import { cacheService } from '../cacheService.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
const sentIds = new Set();

export const hasResendCredentials = ({ apiKey = process.env.RESEND_API_KEY } = {}) =>
  Boolean(String(apiKey || '').trim());

export const getEmailFrom = () => String(process.env.EMAIL_FROM || 'CareerPilot <beth.t@example.com>').trim();

export const isValidEmail = (value) => EMAIL_REGEX.test(String(value || '').trim());

export const canSendEmail = (user, category = 'general') => {
  if (!user || !user.email) return false;
  if (user.notificationPreferences?.unsubscribedAt) return false;
  if (category === 'jobAlerts' && user.notificationPreferences?.jobAlerts === false) return false;
  if (category === 'applicationReminders' && user.notificationPreferences?.applicationReminders === false) return false;
  if (category === 'interviewReminders' && user.notificationPreferences?.interviewReminders === false) return false;
  return true;
};

const escapeHtml = (text = '') =>
  String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

export const buildEmailPayload = ({ to, subject, html, text, tags = [], idempotencyKey } = {}) => {
  const recipient = String(to || '').trim().toLowerCase();
  if (!isValidEmail(recipient)) {
    throw new Error('A valid recipient email is required');
  }
  if (!String(subject || '').trim()) {
    throw new Error('Email subject is required');
  }
  if (!html && !text) {
    throw new Error('Email body is required');
  }

  return {
    from: getEmailFrom(),
    to: [recipient],
    subject: String(subject).trim(),
    html: html || undefined,
    text: text || undefined,
    tags,
    idempotencyKey: idempotencyKey || undefined,
  };
};

const emailFooter = (user) => `
<hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 16px;" />
<p style="font-size:12px;color:#94a3b8;line-height:1.5;">
  This notification was sent to ${escapeHtml(user.email)} by CareerPilot.<br />
  You can manage your notification preferences or unsubscribe anytime in Account Settings.
</p>`;

export const buildJobAlertEmail = ({ user, jobs = [] }) => {
  const titles = jobs.slice(0, 5).map((job) => `• ${job.title} at ${job.company}`).join('\n');
  const jobItemsHtml = jobs
    .slice(0, 5)
    .map(
      (job) =>
        `<li style="margin-bottom:8px;"><strong>${escapeHtml(job.title)}</strong> at ${escapeHtml(job.company)}${job.location ? ` — <span style="color:#64748b;">${escapeHtml(job.location)}</span>` : ''}</li>`
    )
    .join('');

  return buildEmailPayload({
    to: user.email,
    subject: 'CareerPilot job digest',
    text: `Here are roles that match your profile:\n\n${titles || 'No new roles in this digest.'}\n\nTo manage your preferences, visit CareerPilot Settings.`,
    html: `
<div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#1e293b;">
  <h2 style="color:#0f172a;">Your CareerPilot Job Digest</h2>
  <p>Here are newly matched opportunities based on your skills and preferences:</p>
  <ul style="padding-left:20px;line-height:1.6;">
    ${jobItemsHtml || '<li>No new roles in this digest.</li>'}
  </ul>
  ${emailFooter(user)}
</div>`,
    tags: [{ name: 'category', value: 'job-alert' }],
    idempotencyKey: `job-alert:${user._id}:${new Date().toISOString().slice(0, 10)}`,
  });
};

export const formatInterviewTime = (date, timezone = 'UTC') => {
  if (!date) return 'Upcoming';
  try {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZone: timezone,
      timeZoneName: 'short',
    }).format(new Date(date));
  } catch {
    return new Date(date).toUTCString();
  }
};

export const getTimeRemainingDescription = (targetDate, now = Date.now()) => {
  if (!targetDate) return '';
  const targetMs = new Date(targetDate).getTime();
  const nowMs = now instanceof Date ? now.getTime() : Number(now);
  const diffMs = targetMs - nowMs;
  if (diffMs <= 0) return 'starting shortly';
  const hours = Math.round(diffMs / (1000 * 60 * 60));
  if (hours < 1) return 'in less than an hour';
  if (hours === 1) return 'in 1 hour';
  if (hours < 24) return `in ${hours} hours`;
  const days = Math.round(hours / 24);
  if (days === 1) return 'in 1 day (tomorrow)';
  return `in ${days} days`;
};

export const buildInterviewReminderEmail = ({ user, application, interview = null, interval = '' }) => {
  const company = interview?.company || application?.company || application?.job?.company || 'Company';
  const role = interview?.role || interview?.title || application?.jobTitle || application?.role || application?.job?.title || 'Role';
  const startTime = interview?.startTime
    ? new Date(interview.startTime)
    : application?.interviewDate
    ? new Date(application.interviewDate)
    : null;
  const tz = interview?.timezone || 'UTC';
  const formattedTime = formatInterviewTime(startTime, tz);
  const timeRemaining = startTime ? getTimeRemainingDescription(startTime) : '';
  const type = interview?.type || 'Interview';
  const meetingUrl = interview?.meetingUrl || '';
  const location = interview?.location || '';
  const interviewerName = interview?.interviewer?.name || (typeof interview?.interviewer === 'string' ? interview.interviewer : '');
  const interviewerTitle = interview?.interviewer?.title || '';
  const notes = interview?.notes || '';
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  const appLink = application?._id ? `${clientUrl}/applications` : clientUrl;

  const subject = `Interview reminder: ${role} at ${company}`;

  // Plain-text alternative
  let text = `CareerPilot Interview Reminder\n\n`;
  text += `You have an upcoming ${type} interview for ${role} at ${company}.\n`;
  text += `Date & Time: ${formattedTime}\n`;
  if (timeRemaining) text += `Time Remaining: ${timeRemaining}\n`;
  if (meetingUrl) text += `Meeting Link: ${meetingUrl}\n`;
  if (location) text += `Location: ${location}\n`;
  if (interviewerName) text += `Interviewer: ${interviewerName}${interviewerTitle ? ` (${interviewerTitle})` : ''}\n`;
  if (notes) text += `Notes: ${notes}\n`;
  text += `\nView your application notes and tracker in CareerPilot:\n${appLink}\n\n`;
  text += `Manage your notification preferences anytime in Account Settings.`;

  // Meeting button HTML
  const meetingButton = meetingUrl
    ? `<a href="${escapeHtml(meetingUrl)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;background:#3B82F6;color:#ffffff;text-decoration:none;padding:10px 20px;border-radius:8px;font-size:13px;font-weight:600;margin-right:10px;">Join Meeting →</a>`
    : '';

  // HTML Body
  const html = `
<div style="background-color:#F5F7FC;padding:32px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width:580px;background:#ffffff;border-radius:16px;border:1px solid #E2E8F0;overflow:hidden;box-shadow:0 4px 12px rgba(11,18,40,0.05);">
    <tr>
      <td style="background:#0B1228;padding:24px 32px;border-bottom:1px solid #1E294A;">
        <table width="100%" border="0" cellpadding="0" cellspacing="0">
          <tr>
            <td>
              <span style="font-size:20px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">
                <span style="color:#3B82F6;">Career</span><span style="color:#635BFF;">Pilot</span>
              </span>
            </td>
            <td align="right">
              <span style="display:inline-block;background:rgba(99,91,255,0.15);border:1px solid rgba(99,91,255,0.3);color:#A5B4FC;font-size:11px;font-weight:600;padding:4px 10px;border-radius:20px;">
                Interview Reminder
              </span>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding:32px;">
        <h1 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#0B1228;">
          Upcoming ${escapeHtml(type)} Interview
        </h1>
        <p style="margin:0 0 24px;font-size:14px;color:#475569;line-height:1.5;">
          You have an upcoming interview scheduled for <strong>${escapeHtml(role)}</strong> at <strong>${escapeHtml(company)}</strong>${timeRemaining ? ` (${escapeHtml(timeRemaining)})` : ''}.
        </p>

        <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;margin-bottom:24px;">
          <tr>
            <td style="padding:14px 16px;border-bottom:1px solid #E2E8F0;font-size:12px;color:#64748B;font-weight:600;width:120px;">Date & Time</td>
            <td style="padding:14px 16px;border-bottom:1px solid #E2E8F0;font-size:13px;color:#0B1228;font-weight:600;">${escapeHtml(formattedTime)}</td>
          </tr>
          <tr>
            <td style="padding:14px 16px;border-bottom:1px solid #E2E8F0;font-size:12px;color:#64748B;font-weight:600;">Interview Type</td>
            <td style="padding:14px 16px;border-bottom:1px solid #E2E8F0;font-size:13px;color:#0B1228;">${escapeHtml(type)}</td>
          </tr>
          ${
            location
              ? `<tr>
            <td style="padding:14px 16px;border-bottom:1px solid #E2E8F0;font-size:12px;color:#64748B;font-weight:600;">Location</td>
            <td style="padding:14px 16px;border-bottom:1px solid #E2E8F0;font-size:13px;color:#0B1228;">${escapeHtml(location)}</td>
          </tr>`
              : ''
          }
          ${
            interviewerName
              ? `<tr>
            <td style="padding:14px 16px;border-bottom:1px solid #E2E8F0;font-size:12px;color:#64748B;font-weight:600;">Interviewer</td>
            <td style="padding:14px 16px;border-bottom:1px solid #E2E8F0;font-size:13px;color:#0B1228;">${escapeHtml(interviewerName)}${interviewerTitle ? ` <span style="color:#64748B;">(${escapeHtml(interviewerTitle)})</span>` : ''}</td>
          </tr>`
              : ''
          }
          ${
            meetingUrl
              ? `<tr>
            <td style="padding:14px 16px;border-bottom:1px solid #E2E8F0;font-size:12px;color:#64748B;font-weight:600;">Meeting URL</td>
            <td style="padding:14px 16px;border-bottom:1px solid #E2E8F0;font-size:13px;"><a href="${escapeHtml(meetingUrl)}" style="color:#3B82F6;word-break:break-all;">${escapeHtml(meetingUrl)}</a></td>
          </tr>`
              : ''
          }
          ${
            notes
              ? `<tr>
            <td style="padding:14px 16px;font-size:12px;color:#64748B;font-weight:600;">Preparation Notes</td>
            <td style="padding:14px 16px;font-size:13px;color:#334155;line-height:1.4;">${escapeHtml(notes)}</td>
          </tr>`
              : ''
          }
        </table>

        <table width="100%" border="0" cellpadding="0" cellspacing="0">
          <tr>
            <td align="center">
              ${meetingButton}
              <a href="${escapeHtml(appLink)}" style="display:inline-block;background:#0B1228;color:#ffffff;text-decoration:none;padding:10px 20px;border-radius:8px;font-size:13px;font-weight:600;">View in CareerPilot →</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="background:#F8FAFC;padding:20px 32px;border-top:1px solid #E2E8F0;font-size:12px;color:#94A3B8;line-height:1.5;text-align:center;">
        This notification was sent to ${escapeHtml(user.email)} by CareerPilot.<br />
        You can manage your notification preferences anytime in Account Settings.
      </td>
    </tr>
  </table>
</div>`;

  const dateIdStr = startTime ? startTime.toISOString().slice(0, 16) : 'upcoming';
  const idempotencyKey = `interview-reminder:${user._id}:${interview?._id || application?._id || 'unknown'}:${interval || dateIdStr}`;

  return buildEmailPayload({
    to: user.email,
    subject,
    text,
    html,
    tags: [
      { name: 'category', value: 'interview-reminder' },
      ...(interval ? [{ name: 'interval', value: interval }] : []),
    ],
    idempotencyKey,
  });
};

export const buildApplicationReminderEmail = ({ user, application }) => {
  const company = application?.company || application?.job?.company || 'Company';
  const role = application?.role || application?.job?.title || 'Role';
  const deadline = application?.deadline
    ? new Date(application.deadline).toLocaleDateString()
    : 'approaching';

  return buildEmailPayload({
    to: user.email,
    subject: `Application deadline reminder: ${role} at ${company}`,
    text: `Reminder: The deadline for ${role} at ${company} is ${deadline}.\n\nVisit CareerPilot to submit or update your application.`,
    html: `
<div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#1e293b;">
  <h2 style="color:#0f172a;">Application Deadline Reminder</h2>
  <p>The application deadline for <strong>${escapeHtml(role)}</strong> at <strong>${escapeHtml(company)}</strong> is <strong>${escapeHtml(deadline)}</strong>.</p>
  ${emailFooter(user)}
</div>`,
    tags: [{ name: 'category', value: 'application-reminder' }],
    idempotencyKey: `app-reminder:${user._id}:${application?._id || 'unknown'}:${deadline}`,
  });
};

const rememberIdempotency = async (key) => {
  if (!key) return false;
  if (sentIds.has(key)) return true;
  const cached = await cacheService.get(`email:sent:${key}`);
  if (cached) return true;
  sentIds.add(key);
  await cacheService.set(`email:sent:${key}`, { sent: true }, 60 * 60 * 24);
  return false;
};

export const validateResendCredentials = async () => {
  if (!hasResendCredentials()) {
    return { configured: false, operational: false, error: 'RESEND_API_KEY is not configured' };
  }

  try {
    const response = await requestJson({
      url: 'https://api.resend.com/domains',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      },
    });
    const domains = Array.isArray(response.json?.data) ? response.json.data : [];
    return {
      configured: true,
      operational: true,
      domainCount: domains.length,
      verifiedDomain: domains.some((domain) => domain.status === 'verified'),
    };
  } catch (error) {
    return {
      configured: true,
      operational: false,
      error: safeErrorMessage(error),
    };
  }
};

export const sendEmail = async (payload, { allowSend = false } = {}) => {
  if (!allowSend) {
    throw new Error('Refusing to send email without explicit allowSend=true');
  }
  if (!hasResendCredentials()) {
    throw new Error('RESEND_API_KEY is not configured');
  }

  const alreadySent = await rememberIdempotency(payload.idempotencyKey);
  if (alreadySent) {
    return { id: null, duplicate: true };
  }

  try {
    const headers = {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
    };
    if (payload.idempotencyKey) {
      headers['Idempotency-Key'] = payload.idempotencyKey;
    }

    const { idempotencyKey, ...body } = payload;
    const response = await requestJson({
      url: 'https://api.resend.com/emails',
      method: 'POST',
      headers,
      body,
    });
    return { id: response.json?.id || null, duplicate: false };
  } catch (error) {
    const wrapped = error instanceof HttpError ? error : new Error(safeErrorMessage(error));
    wrapped.message = `Resend: ${safeErrorMessage(wrapped)}`;
    throw wrapped;
  }
};
