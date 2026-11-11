import { burnLevel } from "@/lib/burn";

export default function BurnPointsBadge({ points }: { points: number }) {
  const level = burnLevel(points);

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-stone-900 bg-white px-3 py-1 text-sm font-black">
      <span>{level.emoji}</span>
      <span>{level.label}</span>
      <span className="text-rose-600">{points} BP</span>
    </span>
  );
}