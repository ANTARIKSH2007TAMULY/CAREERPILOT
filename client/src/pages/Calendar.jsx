import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  ExternalLink,
  Link2,
  MapPin,
  RefreshCw,
  Users,
  Video,
  X,
} from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';
import PageHeader from '../components/ui/PageHeader';
import calendarService from '../services/calendarService';
import { maskEmail } from '../utils/maskEmail';
import interviewService from '../services/interviewService';
import {
  WEEKDAY_LABELS,
  addDays,
  buildMonthGrid,
  eventOccursOn,
  formatEventTime,
  formatRangeHeading,
  isSameDay,
  plainText,
  startOfWeek,
  toYmd,
  visibleRange,
} from '../utils/calendarDates';

const VIEWS = [
  { id: 'month', label: 'Month' },
  { id: 'week', label: 'Week' },
  { id: 'agenda', label: 'Agenda' },
];

const HOURS = Array.from({ length: 24 }, (_, hour) => hour);

const sourceFilterOptions = [
  { id: 'google', label: 'Google events' },
  { id: 'careerpilot', label: 'CareerPilot interviews' },
  { id: 'all', label: 'Both (distinct)' },
];

function eventStartHour(event) {
  const value = event?.start?.dateTime || event?.start?.raw;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 9;
  return date.getHours() + date.getMinutes() / 60;
}

function eventDurationHours(event) {
  const start = new Date(event?.start?.dateTime || event?.start?.raw || 0);
  const end = new Date(event?.end?.dateTime || event?.end?.raw || 0);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 1;
  return Math.max(0.5, (end.getTime() - start.getTime()) / (1000 * 60 * 60));
}

export default function Calendar() {
  const [view, setView] = useState('month');
  const [cursor, setCursor] = useState(() => new Date());
  const [sourceFilter, setSourceFilter] = useState('google');
  const [status, setStatus] = useState({ connected: false, configured: false });
  const [events, setEvents] = useState([]);
  const [timeZone, setTimeZone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [requiresReconnect, setRequiresReconnect] = useState(false);
  const [selected, setSelected] = useState(null);

  const range = useMemo(() => visibleRange(view, cursor), [view, cursor]);
  const monthDays = useMemo(() => buildMonthGrid(cursor), [cursor]);
  const weekDays = useMemo(() => {
    const start = startOfWeek(cursor);
    return Array.from({ length: 7 }, (_, index) => addDays(start, index));
  }, [cursor]);

  const loadStatus = useCallback(async () => {
    const response = await calendarService.getStatus();
    setStatus(response.data?.data || { connected: false, configured: false });
    return response.data?.data;
  }, []);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    setError('');
    setRequiresReconnect(false);
    try {
      const currentStatus = await loadStatus();
      if (!currentStatus?.connected) {
        setEvents([]);
        setInterviews([]);
        return;
      }

      const params = {
        timeMin: range.timeMin.toISOString(),
        timeMax: range.timeMax.toISOString(),
        maxResults: 250,
      };
      const [eventRes, interviewRes] = await Promise.all([
        calendarService.getEvents(params),
        sourceFilter === 'google'
          ? Promise.resolve({ data: { data: { interviews: [] } } })
          : interviewService.getUpcomingInterviews().catch(() => ({ data: { data: { interviews: [] } } })),
      ]);

      const payload = eventRes.data?.data || {};
      setEvents(Array.isArray(payload.events) ? payload.events : []);
      setTimeZone(payload.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone);

      const interviewItems = (interviewRes.data?.data?.interviews || []).map((interview) => ({
        id: `interview-${interview._id}`,
        title: interview.title || interview.application?.jobTitle || 'Interview',
        description: interview.notes || '',
        location: interview.location || '',
        meetingUrl: interview.meetingUrl || '',
        isAllDay: false,
        source: 'careerpilot',
        company: interview.application?.company || '',
        start: { dateTime: interview.startTime, raw: interview.startTime, timeZone: interview.timezone },
        end: { dateTime: interview.endTime || interview.startTime, raw: interview.endTime || interview.startTime },
      }));
      setInterviews(interviewItems);
    } catch (err) {
      const message = err.message || 'Unable to load Google Calendar events.';
      setError(message);
      setEvents([]);
      if (/reconnect|revoked|expired|permission/i.test(message)) {
        setRequiresReconnect(true);
      }
    } finally {
      setLoading(false);
    }
  }, [loadStatus, range.timeMax, range.timeMin, sourceFilter]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setSelected(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const visibleEvents = useMemo(() => {
    if (sourceFilter === 'careerpilot') return interviews;
    if (sourceFilter === 'all') return [...events, ...interviews];
    return events;
  }, [events, interviews, sourceFilter]);

  const shiftCursor = (direction) => {
    setCursor((current) => {
      if (view === 'week') return addDays(current, direction * 7);
      if (view === 'agenda') return addDays(current, direction * 7);
      return new Date(current.getFullYear(), current.getMonth() + direction, 1);
    });
  };

  const connectCalendar = async () => {
    try {
      const response = await calendarService.connect();
      const url = response.data?.data?.authorizationUrl;
      if (url) window.location.assign(url);
    } catch (err) {
      setError(err.message || 'Unable to start Google Calendar connection.');
    }
  };

  if (!status.connected && !loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          badge="Google Calendar"
          badgeIcon={CalendarDays}
          title="Google Calendar"
          description="View meetings from the Google account connected to CareerPilot. This page is separate from the application interview tracker."
        />
        <EmptyState
          icon={CalendarDays}
          title={status.configured ? 'Connect Google Calendar' : 'Google Calendar is not configured'}
          description={
            status.configured
              ? 'Connect a Google account in Settings to see real events here. CareerPilot interviews stay on the Application Tracker unless you choose to overlay them.'
              : 'The server is missing Google OAuth credentials.'
          }
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button variant="accent" onClick={connectCalendar} disabled={!status.configured}>
                Connect Google Calendar
              </Button>
              <Link to="/settings">
                <Button variant="secondary">Open Settings</Button>
              </Link>
            </div>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        badge="Google Calendar"
        badgeIcon={CalendarDays}
        title="Google Calendar"
        description="Read-only events from your connected Google account. CareerPilot interviews are not mixed in unless you choose the overlay filter."
      >
        <Button variant="secondary" size="sm" icon={RefreshCw} onClick={loadEvents} disabled={loading}>
          Refresh
        </Button>
      </PageHeader>

      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/90 dark:border-navy-700/80 bg-white dark:bg-navy-850/70 p-4 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => shiftCursor(-1)} aria-label="Previous">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setCursor(new Date())}>
              Today
            </Button>
            <Button variant="secondary" size="sm" onClick={() => shiftCursor(1)} aria-label="Next">
              <ChevronRight className="h-4 w-4" />
            </Button>
            <h2 className="ml-1 text-base font-semibold text-slate-900 dark:text-white">
              {formatRangeHeading(view, cursor)}
            </h2>
          </div>
          <div className="flex rounded-xl border border-slate-200 dark:border-navy-700 p-1" role="tablist" aria-label="Calendar view">
            {VIEWS.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={view === item.id}
                onClick={() => setView(item.id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  view === item.id
                    ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-white'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
          <div>
            Connected as{' '}
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {maskEmail(status.connectedEmail) || 'Google account'}
            </span>
            <span className="mx-2">·</span>
            Times in {timeZone}
          </div>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Event source filter">
            {sourceFilterOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setSourceFilter(option.id)}
                className={`rounded-full border px-2.5 py-1 text-[11px] ${
                  sourceFilter === option.id
                    ? 'border-brand-400 bg-brand-50 text-brand-700 dark:border-brand-500/40 dark:bg-brand-500/15 dark:text-white'
                    : 'border-slate-200 text-slate-500 dark:border-navy-700 dark:text-slate-400'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-950/20 p-4 text-sm text-rose-800 dark:text-rose-300">
          <p>{error}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={loadEvents}>
              Retry
            </Button>
            {requiresReconnect ? (
              <Button variant="accent" size="sm" onClick={connectCalendar}>
                Reconnect
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}

      {loading ? (
        <div className="animate-pulse rounded-2xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-850/70 p-4">
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 28 }).map((_, index) => (
              <div key={index} className="h-20 rounded-xl bg-slate-100 dark:bg-navy-800" />
            ))}
          </div>
        </div>
      ) : view === 'month' ? (
        <MonthView
          cursor={cursor}
          days={monthDays}
          events={visibleEvents}
          timeZone={timeZone}
          onSelect={setSelected}
        />
      ) : view === 'week' ? (
        <WeekView days={weekDays} events={visibleEvents} timeZone={timeZone} onSelect={setSelected} />
      ) : (
        <AgendaView cursor={cursor} events={visibleEvents} timeZone={timeZone} onSelect={setSelected} />
      )}

      {selected ? (
        <EventDetailsDrawer event={selected} timeZone={timeZone} onClose={() => setSelected(null)} />
      ) : null}
    </div>
  );
}

function EventChip({ event, timeZone, onSelect, compact = false }) {
  const isInterview = event.source === 'careerpilot';
  return (
    <button
      type="button"
      onClick={() => onSelect(event)}
      className={`w-full truncate rounded-md px-1.5 py-0.5 text-left text-[11px] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
        isInterview
          ? 'bg-purple-100 text-purple-800 dark:bg-purple-500/20 dark:text-purple-200'
          : 'bg-sky-100 text-sky-800 dark:bg-brand-500/20 dark:text-sky-100'
      }`}
      title={event.title}
    >
      {compact ? event.title : `${formatEventTime(event, timeZone)} ${event.title}`}
    </button>
  );
}

function MonthView({ cursor, days, events, timeZone, onSelect }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/90 dark:border-navy-700/80 bg-white dark:bg-navy-850/70">
      <div className="grid grid-cols-7 border-b border-slate-200 dark:border-navy-700">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="px-2 py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            {label}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const ymd = toYmd(day);
          const dayEvents = events.filter((event) => eventOccursOn(event, ymd));
          const inMonth = day.getMonth() === cursor.getMonth();
          return (
            <div
              key={ymd}
              className={`min-h-[104px] border-t border-r border-slate-100 dark:border-navy-800 p-1.5 ${
                isSameDay(day, new Date()) ? 'bg-brand-50/70 dark:bg-brand-500/10' : ''
              } ${inMonth ? '' : 'bg-slate-50/80 dark:bg-navy-950/40'}`}
            >
              <div className={`mb-1 text-xs font-semibold ${inMonth ? 'text-slate-800 dark:text-slate-200' : 'text-slate-400'}`}>
                {day.getDate()}
              </div>
              <div className="space-y-1">
                {dayEvents.slice(0, 3).map((event) => (
                  <EventChip key={event.id} event={event} timeZone={timeZone} onSelect={onSelect} compact={event.isAllDay} />
                ))}
                {dayEvents.length > 3 ? (
                  <div className="text-[10px] text-slate-500">+{dayEvents.length - 3} more</div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WeekView({ days, events, timeZone, onSelect }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200/90 dark:border-navy-700/80 bg-white dark:bg-navy-850/70">
      <div className="min-w-[720px]">
        <div className="grid grid-cols-8 border-b border-slate-200 dark:border-navy-700">
          <div className="px-2 py-2 text-[11px] text-slate-400">Time</div>
          {days.map((day) => (
            <div key={toYmd(day)} className={`px-2 py-2 text-center text-xs font-semibold ${isSameDay(day, new Date()) ? 'text-brand-600' : 'text-slate-600 dark:text-slate-300'}`}>
              {WEEKDAY_LABELS[day.getDay()]} {day.getDate()}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-8">
          <div className="border-r border-slate-100 dark:border-navy-800">
            {HOURS.filter((hour) => hour >= 7 && hour <= 21).map((hour) => (
              <div key={hour} className="h-12 border-t border-slate-100 dark:border-navy-800 px-2 text-[10px] text-slate-400">
                {hour}:00
              </div>
            ))}
          </div>
          {days.map((day) => {
            const ymd = toYmd(day);
            const dayEvents = events.filter((event) => eventOccursOn(event, ymd));
            return (
              <div key={ymd} className="relative border-r border-slate-100 dark:border-navy-800">
                {HOURS.filter((hour) => hour >= 7 && hour <= 21).map((hour) => (
                  <div key={hour} className="h-12 border-t border-slate-100 dark:border-navy-800" />
                ))}
                {dayEvents.map((event) => {
                  if (event.isAllDay) {
                    return (
                      <div key={event.id} className="absolute left-1 right-1 top-1">
                        <EventChip event={event} timeZone={timeZone} onSelect={onSelect} compact />
                      </div>
                    );
                  }
                  const top = Math.max(0, (eventStartHour(event) - 7) * 48);
                  const height = Math.min(48 * 15, eventDurationHours(event) * 48);
                  return (
                    <button
                      key={event.id}
                      type="button"
                      onClick={() => onSelect(event)}
                      style={{ top, height }}
                      className={`absolute left-1 right-1 overflow-hidden rounded-md px-1.5 py-1 text-left text-[11px] font-medium ${
                        event.source === 'careerpilot'
                          ? 'bg-purple-500/80 text-white'
                          : 'bg-sky-500/80 text-white'
                      }`}
                    >
                      <span className="block truncate">{event.title}</span>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function AgendaView({ cursor, events, timeZone, onSelect }) {
  const days = Array.from({ length: 21 }, (_, index) => addDays(startOfDaySafe(cursor), index));
  const groups = days
    .map((day) => ({
      day,
      items: events.filter((event) => eventOccursOn(event, toYmd(day))),
    }))
    .filter((group) => group.items.length > 0);

  if (groups.length === 0) {
    return (
      <EmptyState
        icon={CalendarDays}
        title="No events in this range"
        description="There are no Google Calendar events in the selected dates. Try another range or refresh."
      />
    );
  }

  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <section key={toYmd(group.day)} className="rounded-2xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-850/70 p-4">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
            {group.day.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
          </h3>
          <ul className="mt-3 space-y-2">
            {group.items.map((event) => (
              <li key={event.id}>
                <button
                  type="button"
                  onClick={() => onSelect(event)}
                  className="flex w-full items-start justify-between gap-3 rounded-xl border border-slate-100 dark:border-navy-800 px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-navy-800"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-slate-900 dark:text-white">{event.title}</div>
                    <div className="mt-0.5 text-xs text-slate-500">{formatEventTime(event, timeZone)}</div>
                  </div>
                  <Badge size="sm" variant={event.source === 'careerpilot' ? 'purple' : 'accent'}>
                    {event.source === 'careerpilot' ? 'Interview' : 'Google'}
                  </Badge>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function startOfDaySafe(date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function EventDetailsDrawer({ event, timeZone, onClose }) {
  const isInterview = event.source === 'careerpilot';
  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-slate-950/40" onClick={onClose} role="presentation">
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="calendar-event-title"
        className="h-full w-full max-w-md overflow-y-auto border-l border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-900 p-5 shadow-2xl"
        onClick={(clickEvent) => clickEvent.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <Badge size="sm" variant={isInterview ? 'purple' : 'accent'}>
              {isInterview ? 'CareerPilot interview' : 'Google Calendar event'}
            </Badge>
            <h2 id="calendar-event-title" className="mt-3 text-lg font-semibold text-slate-900 dark:text-white">
              {event.title}
            </h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-navy-800" aria-label="Close event details">
            <X className="h-4 w-4" />
          </button>
        </div>

        <dl className="mt-5 space-y-3 text-sm text-slate-600 dark:text-slate-300">
          <div className="flex gap-2">
            <Clock3 className="mt-0.5 h-4 w-4 shrink-0" />
            <div>{formatEventTime(event, timeZone)}</div>
          </div>
          {event.location ? (
            <div className="flex gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
              <div>{event.location}</div>
            </div>
          ) : null}
          {event.meetingUrl ? (
            <div className="flex gap-2">
              <Video className="mt-0.5 h-4 w-4 shrink-0" />
              <a href={event.meetingUrl} target="_blank" rel="noreferrer" className="text-brand-600 hover:underline">
                Join meeting
              </a>
            </div>
          ) : null}
          {event.htmlLink ? (
            <div className="flex gap-2">
              <ExternalLink className="mt-0.5 h-4 w-4 shrink-0" />
              <a href={event.htmlLink} target="_blank" rel="noreferrer" className="text-brand-600 hover:underline">
                Open in Google Calendar
              </a>
            </div>
          ) : null}
          {event.company ? (
            <div className="flex gap-2">
              <Users className="mt-0.5 h-4 w-4 shrink-0" />
              <div>{event.company}</div>
            </div>
          ) : null}
        </dl>

        {plainText(event.description) ? (
          <p className="mt-5 whitespace-pre-wrap text-sm leading-6 text-slate-600 dark:text-slate-300">
            {plainText(event.description)}
          </p>
        ) : null}

        {Array.isArray(event.attendees) && event.attendees.length > 0 ? (
          <div className="mt-5">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Attendees</div>
            <ul className="mt-2 space-y-1 text-sm text-slate-600 dark:text-slate-300">
              {event.attendees.slice(0, 12).map((attendee) => (
                <li key={attendee.email}>{attendee.displayName || attendee.email}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </aside>
    </div>
  );
}
