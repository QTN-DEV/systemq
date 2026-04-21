export function parseBackendDate(dateString: string | null | undefined): Date | null {
  if (!dateString) return null;

  const normalized =
    dateString.endsWith("Z") || dateString.includes("+") || dateString.includes("-", 10)
      ? dateString
      : `${dateString}Z`;

  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDateTime(dateString: string | null | undefined): string {
  const date = parseBackendDate(dateString);
  if (!date) return dateString ?? "";

  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}
