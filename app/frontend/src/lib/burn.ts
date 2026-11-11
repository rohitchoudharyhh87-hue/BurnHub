import { formatDistanceToNow } from "date-fns";

// Burn level ladder — mirrors the BurnPointsBadge ranks used across the app.
export function burnLevel(points: number): { label: string; emoji: string } {
  if (points < 50) return { label: "Mild Salsa", emoji: "🥛" };
  if (points < 150) return { label: "Jalapeño Heat", emoji: "🌶️" };
  if (points < 400) return { label: "Ghost Pepper", emoji: "👻" };
  return { label: "Supernova", emoji: "🌟" };
}

export function timeAgo(iso: string): string {
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true });
  } catch {
    return "";
  }
}
