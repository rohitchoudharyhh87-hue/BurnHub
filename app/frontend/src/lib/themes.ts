// Mirror of backend/lib/llm.py ROAST_THEMES + shared static copy. The backend owns
// the ids; this client-side copy keeps the theme picker renderable with no backend.

export interface RoastTheme {
  id: string;
  label: string;
  emoji: string;
}

export const ROAST_THEMES: RoastTheme[] = [
  { id: "genz", label: "Gen-Z", emoji: "🧢" },
  { id: "shakespearean", label: "Shakespearean", emoji: "📜" },
  { id: "dad_joke", label: "Dad Joke", emoji: "☕" },
  { id: "corporate", label: "Corporate", emoji: "👔" },
  { id: "pirate", label: "Pirate", emoji: "🏴‍☠️" },
  { id: "kindergarten", label: "Kindergarten", emoji: "🧸" },
  { id: "victorian", label: "Victorian Ghost", emoji: "👻" },
  { id: "noir", label: "Film Noir", emoji: "🕵️" },
];

export function themeLabel(id: string): string {
  return ROAST_THEMES.find((t) => t.id === id)?.label ?? id;
}

export function themeEmoji(id: string): string {
  return ROAST_THEMES.find((t) => t.id === id)?.emoji ?? "🔥";
}

export interface Intensity {
  id: "mild" | "savage" | "nuclear";
  label: string;
  emoji: string;
}

export const INTENSITIES: Intensity[] = [
  { id: "mild", label: "Mild", emoji: "🥛" },
  { id: "savage", label: "Savage", emoji: "🌶️" },
  { id: "nuclear", label: "Nuclear", emoji: "☢️" },
];

export const AVATAR_EMOJIS = ["🔥", "🌶️", "👑", "🧀", "🍞", "🎩", "🏴‍☠️", "🧸", "👻", "🕵️", "🚀", "🦖"];

export const AVATAR_COLORS = ["#F43F5E", "#EA580C", "#D97706", "#7C3AED", "#0D9488", "#BE123C"];

export const CREW_EMOJIS = ["🔥", "🍞", "🏛️", "📡", "⚔️", "🍕", "🛡️", "🎭", "☄️", "🧨"];

// Daily AI prompt — rotates by day-of-year, static copy (safe with no backend).
export const DAILY_PROMPTS = [
  "Roast a friend's music taste — in full Shakespearean verse.",
  "Your target Microwaves fish in the office kitchen. You know what to do.",
  "Someone just replied 'k.' Nuclear intensity is now legal.",
  "Turn their gym selfies into a Corporate performance review.",
  "They said 'I'm basically a chef' after making instant noodles. Go.",
  "Their playlist is 14 copies of the same song. Dad Joke them for it.",
  "A pirate crew shrunk their laundry. Make them walk the plank of shame.",
];

export function dailyPrompt(): string {
  const day = Math.floor(Date.now() / 86_400_000);
  return DAILY_PROMPTS[day % DAILY_PROMPTS.length];
}
