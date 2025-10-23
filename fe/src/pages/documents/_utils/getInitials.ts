export function getInitials(name: string): string {
  return (
    (name || "")
      .split(" ")
      .filter(Boolean)
      .map((n) => n[0])
      .join("")
      .toUpperCase() || "•"
  );
}
