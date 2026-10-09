const escapeText = (value: string) =>
  value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");

function utc(value: Date): string {
  return value.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function fold(line: string): string {
  const chunks: string[] = [];
  let current = "";
  let bytes = 0;

  for (const char of line) {
    const size = new TextEncoder().encode(char).length;
    if (bytes + size > 75) {
      chunks.push(current);
      current = ` ${char}`;
      bytes = 1 + size;
    } else {
      current += char;
      bytes += size;
    }
  }

  chunks.push(current);
  return chunks.join("\r\n");
}

export function buildIcs({
  bookingId,
  startsAt,
  endsAt,
  now,
  summary,
  description,
  url,
}: {
  bookingId: string;
  startsAt: Date;
  endsAt: Date;
  now: Date;
  summary: string;
  description: string;
  url: string;
}): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Bookfleet//Booking//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${bookingId}@bookfleet`,
    `DTSTAMP:${utc(now)}`,
    `DTSTART:${utc(startsAt)}`,
    `DTEND:${utc(endsAt)}`,
    `SUMMARY:${escapeText(summary)}`,
    `DESCRIPTION:${escapeText(description)}`,
    `URL:${escapeText(url)}`,
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  return `${lines.map(fold).join("\r\n")}\r\n`;
}
