export function getRoleColor(role: string | undefined): string {
  const colors: Record<string, string> = {
    admin: "bg-purple-500",
    manager: "bg-green-500",
    employee: "bg-blue-500",
    secretary: "bg-pink-500",
  };
  return (role && colors[role]) ?? "bg-gray-500";
}

const avatarColors = [
  "bg-fuchsia-500",
  "bg-emerald-500",
  "bg-sky-500",
  "bg-amber-500",
  "bg-violet-500",
  "bg-rose-500",
  "bg-teal-500",
  "bg-indigo-500",
  "bg-lime-500",
  "bg-orange-500",
];

export function colorForName(name: string | undefined | null): string {
  const n = String(name ?? "");
  let h = 0;
  for (let i = 0; i < n.length; i++) {
    h = (h * 31 + n.charCodeAt(i)) >>> 0;
  }
  return avatarColors[(h || 0) % avatarColors.length];
}
