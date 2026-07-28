"""Build RFC 5545 (.ics) calendar files for booked events.

Kept dependency-free (no icalendar lib) - the format is simple and we only
emit a single VEVENT. The output is emailed to a foodie as an attachment so
they can add the dinner to Apple Calendar, Google Calendar, or Outlook.
"""

from datetime import datetime, timedelta, timezone
from typing import Optional

# How long a dinner is assumed to run, since events only store a start time.
DEFAULT_EVENT_DURATION_HOURS = 2


def _as_utc(dt: datetime) -> datetime:
    """Naive datetimes (e.g. from SQLite in tests) are treated as UTC."""
    return dt if dt.tzinfo is not None else dt.replace(tzinfo=timezone.utc)


def _fmt(dt: datetime) -> str:
    """Format a datetime as a UTC iCalendar timestamp: 20670611T170000Z."""
    return _as_utc(dt).astimezone(timezone.utc).strftime("%Y%m%dT%H%M%SZ")


def _escape(text: str) -> str:
    """Escape iCalendar TEXT values per RFC 5545 (order matters: backslash first)."""
    if text is None:
        return ""
    return (
        text.replace("\\", "\\\\")
        .replace(";", "\\;")
        .replace(",", "\\,")
        .replace("\r\n", "\\n")
        .replace("\n", "\\n")
        .replace("\r", "\\n")
    )


def build_event_ics(
    *,
    event_id: str,
    title: str,
    description: str,
    location: str,
    start: datetime,
    host_name: Optional[str] = None,
    ingredients: Optional[str] = None,
    organizer_email: str = "updates@dormmade.com",
) -> str:
    """Return a full VCALENDAR string for a single event.

    ingredients (when the event is linked to a meal) and the host name are
    folded into the DESCRIPTION so they travel inside the calendar entry.
    """
    start_utc = _as_utc(start)
    end_utc = start_utc + timedelta(hours=DEFAULT_EVENT_DURATION_HOURS)

    desc_parts = []
    if description:
        desc_parts.append(description.strip())
    if host_name:
        desc_parts.append(f"Hosted by {host_name}")
    if ingredients and ingredients.strip():
        desc_parts.append("Ingredients:\n" + ingredients.strip())
    desc_parts.append("Booked through Dorm Made - https://dormmade.com")
    full_description = "\n\n".join(desc_parts)

    organizer_line = "ORGANIZER"
    if host_name:
        organizer_line += f";CN={_escape(host_name)}"
    organizer_line += f":mailto:{organizer_email}"

    lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Dorm Made//Events//EN",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        "BEGIN:VEVENT",
        f"UID:{event_id}@dormmade.com",
        f"DTSTAMP:{_fmt(datetime.now(timezone.utc))}",
        f"DTSTART:{_fmt(start_utc)}",
        f"DTEND:{_fmt(end_utc)}",
        f"SUMMARY:{_escape(title)}",
        f"DESCRIPTION:{_escape(full_description)}",
        f"LOCATION:{_escape(location)}",
        organizer_line,
        "STATUS:CONFIRMED",
        "END:VEVENT",
        "END:VCALENDAR",
    ]
    # RFC 5545 requires CRLF line endings.
    return "\r\n".join(lines) + "\r\n"
