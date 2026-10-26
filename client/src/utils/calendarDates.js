export const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const addDays = (date, amount) => {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
};

export const startOfDay = (date) => {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
};

export const startOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1);

export const startOfWeek = (date) => {
  const next = startOfDay(date);
  next.setDate(next.getDate() - next.getDay());
  return next;
};

export const toYmd = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const parseYmd = (value) => {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
};

export const isSameDay = (left, right) => toYmd(left) === toYmd(right);

export const buildMonthGrid = (cursor) => {
  const start = startOfWeek(startOfMonth(cursor));
  return Array.from({ length: 42 }, (_, index) => addDays(start, index));
};

export const visibleRange = (view, cursor) => {
  if (view === 'week') {
    const start = startOfWeek(cursor);
    return { timeMin: start, timeMax: addDays(start, 7) };
  }
  if (view === 'agenda') {
    const start = startOfDay(cursor);
    return { timeMin: start, timeMax: addDays(start, 21) };
  }
  const days = buildMonthGrid(cursor);
  return { timeMin: days[0], timeMax: addDays(days[41], 1) };
};

export const eventOccursOn = (event, dayYmd) => {
  if (!event) return false;
  if (event.source === 'careerpilot') {
    const start = new Date(event.start?.dateTime || event.start?.raw || event.startTime);
    if (Number.isNaN(start.getTime())) return false;
    return toYmd(start) === dayYmd;
  }
  if (event.isAllDay) {
    const start = event.displayStartDate || event.start?.date;
    const end = event.displayEndDate || start;
    return Boolean(start && dayYmd >= start && dayYmd <= end);
  }
  const start = new Date(event.start?.dateTime || event.start?.raw || 0);
  const end = new Date(event.end?.dateTime || event.end?.raw || event.start?.dateTime || 0);
  if (Number.isNaN(start.getTime())) return false;
  const dayStart = parseYmd(dayYmd);
  const dayEnd = addDays(dayStart, 1);
  const safeEnd = Number.isNaN(end.getTime()) ? addDays(start, 0) : end;
  return start < dayEnd && safeEnd > dayStart;
};

export const formatEventTime = (event, timeZone) => {
  if (event?.isAllDay) return 'All day';
  const startValue = event?.start?.dateTime || event?.start?.raw;
  if (!startValue) return '';
  const start = new Date(startValue);
  if (Number.isNaN(start.getTime())) return '';
  const options = { hour: 'numeric', minute: '2-digit', timeZone };
  const startLabel = start.toLocaleTimeString(undefined, options);
  const endValue = event?.end?.dateTime || event?.end?.raw;
  if (!endValue) return startLabel;
  const end = new Date(endValue);
  if (Number.isNaN(end.getTime())) return startLabel;
  return `${startLabel} – ${end.toLocaleTimeString(undefined, options)}`;
};

export const formatRangeHeading = (view, cursor) => {
  if (view === 'week') {
    const start = startOfWeek(cursor);
    const end = addDays(start, 6);
    const startLabel = start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    const endLabel = end.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    return `${startLabel} – ${endLabel}`;
  }
  if (view === 'agenda') {
    return cursor.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
  }
  return cursor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
};

export const plainText = (value = '') =>
  String(value)
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim();
