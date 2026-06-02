type DateSettings = {
  dateFormat: string;
  timeFormat: string;
  timezone: string;
};

function parseTimezoneOffset(tz: string): number | undefined {
  const match = tz.match(/UTC([+-]\d{1,2})(?::(\d{2}))?/i);
  if (!match) return undefined;
  const hours = parseInt(match[1], 10);
  const minutes = match[2] ? parseInt(match[2], 10) : 0;
  return hours * 60 + (hours < 0 ? -minutes : minutes);
}

function applyTimezone(date: Date, timezone: string): Date {
  const offsetMin = parseTimezoneOffset(timezone);
  if (offsetMin === undefined) return date;
  const utc = date.getTime() + date.getTimezoneOffset() * 60000;
  return new Date(utc + offsetMin * 60000);
}

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

function formatParts(date: Date, dateFormat: string, timeFormat: string, includeTime: boolean): string {
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  let dateStr: string;
  switch (dateFormat) {
    case "DD/MM/YYYY":
      dateStr = `${d}/${m}/${y}`;
      break;
    case "YYYY-MM-DD":
      dateStr = `${y}-${m}-${d}`;
      break;
    case "MM/DD/YYYY":
    default:
      dateStr = `${m}/${d}/${y}`;
  }
  if (!includeTime) return dateStr;

  const h24 = date.getHours();
  const min = pad(date.getMinutes());
  if (timeFormat === "24h") {
    return `${dateStr} ${pad(h24)}:${min}`;
  }
  const h12 = h24 % 12 || 12;
  const ampm = h24 >= 12 ? "PM" : "AM";
  return `${dateStr} ${h12}:${min} ${ampm}`;
}

export function formatAppDate(
  value: Date | string | number,
  settings: DateSettings,
  includeTime = false,
): string {
  const raw = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(raw.getTime())) return "";
  const adjusted = applyTimezone(raw, settings.timezone);
  return formatParts(adjusted, settings.dateFormat, settings.timeFormat, includeTime);
}
