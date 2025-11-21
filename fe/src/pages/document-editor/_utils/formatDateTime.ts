/**
 * Format a date-time string to local timezone with full date and time.
 * Handles UTC timestamps from the backend and converts them to local time.
 * 
 * @param dateString - ISO date string (may or may not include 'Z' suffix)
 * @returns Formatted date-time string in local timezone (e.g., "12/25/2023, 3:45:30 PM")
 */
export function formatDateTime(dateString: string | null | undefined): string {
  if (!dateString) return "";
  
  try {
    // Ensure the date string is treated as UTC if it doesn't have timezone info
    const utcString = dateString.endsWith("Z") || dateString.includes("+") || dateString.includes("-", 10)
      ? dateString
      : `${dateString}Z`;
    
    const date = new Date(utcString);
    
    if (isNaN(date.getTime())) {
      return dateString; // Return original if parsing fails
    }
    
    // Format in local timezone with full date and time
    return date.toLocaleString(undefined, {
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  } catch {
    return dateString;
  }
}

