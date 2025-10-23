const POSITION_COLOR_MAP: Record<string, string> = {
  CEO: "bg-purple-100 text-purple-900",
  "Internal Ops": "bg-blue-100 text-blue-900",
  HR: "bg-red-100 text-red-900",
  PM: "bg-pink-100 text-pink-900",
  "Div. Lead": "bg-green-100 text-green-900",
  "Team Member": "bg-zinc-100 text-zinc-900",
};

const AVATAR_COLORS = [
  "bg-rose-500",
  "bg-blue-500",
  "bg-red-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-violet-500",
  "bg-indigo-500",
  "bg-teal-500",
];

export function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
    .slice(0, 2);
}

export function getAvatarFallbackColor(name: string): string {
  if (!name) {
    return AVATAR_COLORS[0] ?? "bg-zinc-500";
  }

  const charCode = name.charCodeAt(0);
  return AVATAR_COLORS[charCode % AVATAR_COLORS.length] ?? "bg-zinc-500";
}

export function getPositionBadgeColor(position?: string | null): string {
  if (!position) {
    return "bg-zinc-100 text-zinc-900";
  }

  return POSITION_COLOR_MAP[position] ?? "bg-zinc-100 text-zinc-900";
}
