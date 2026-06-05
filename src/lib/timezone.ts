// src/lib/timezone.ts

// Map timezones that frequently default to ugly GMT+ offsets 
// and don't observe Daylight Saving Time.
const TZ_OVERRIDES: Record<string, string> = {
  "Asia/Kolkata": "IST",
  "Asia/Tokyo": "JST",
  "Asia/Seoul": "KST",
  "Asia/Shanghai": "CST",
  "Asia/Singapore": "SGT",
  "Asia/Jakarta": "WIB"
};

export function getUserTimezone(): string {
  if (typeof window === 'undefined') return 'UTC';
  return localStorage.getItem('aniotako_timezone') || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}

// Helper to extract or override the timezone abbreviation
function getTzAbbr(date: Date, timezone: string): string {
  if (TZ_OVERRIDES[timezone]) return TZ_OVERRIDES[timezone];
  
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: timezone, timeZoneName: 'short' }).formatToParts(date);
  const tzPart = parts.find(p => p.type === 'timeZoneName');
  return tzPart ? tzPart.value : '';
}

function normalizeDateInput(dateInput: number | string): Date {
  if (typeof dateInput === "number") {
    return new Date(dateInput * 1000);
  }

  const trimmed = dateInput.trim();
  if (/^\d+(\.\d+)?$/.test(trimmed)) {
    return new Date(Number(trimmed) * 1000);
  }

  return new Date(trimmed);
}

export function formatAiringTime(dateInput: number | string, tz?: string): string {
  const timezone = tz || getUserTimezone();
  const date = normalizeDateInput(dateInput);

  if (Number.isNaN(date.getTime())) return "TBA";

  const baseDate = date.toLocaleString("en-US", {
    timeZone: timezone,
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return `${baseDate} ${getTzAbbr(date, timezone)}`;
}

export function formatTimeOnly(unixSeconds: number | string, tz?: string): string {
  const timezone = tz || getUserTimezone();
  const date = normalizeDateInput(unixSeconds);

  if (Number.isNaN(date.getTime())) return "TBA";

  const baseTime = date.toLocaleTimeString("en-US", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
  });

  return `${baseTime} ${getTzAbbr(date, timezone)}`;
}

export function formatDateOnly(dateInput: number | string, tz?: string): string {
  const timezone = tz || getUserTimezone();
  const date = normalizeDateInput(dateInput);

  if (Number.isNaN(date.getTime())) return "TBA";

  return date.toLocaleDateString("en-US", {
    timeZone: timezone,
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Calculates the breakdown of days, hours, minutes, and seconds 
 * remaining from a given duration in seconds.
 */
export function getCountdownParts(seconds: number) {
  if (seconds <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  }
  return {
    days: Math.floor(seconds / (3600 * 24)),
    hours: Math.floor((seconds % (3600 * 24)) / 3600),
    minutes: Math.floor((seconds % 3600) / 60),
    seconds: Math.floor(seconds % 60)
  };
}