import { cn } from "@/lib/utils";

export default function AIJudgeMeter({
  score,
  critique,
  compact = false,
}: {
  score: number | null;
  critique: string | null;
  compact?: boolean;
}) {
  if (score === null) {
    return (
      <div
        data-testid="judge-meter-pending"
        className="ai-shimmer inline-flex items-center gap-1.5 rounded-full border-2 border-stone-900 px-3 py-1 text-xs font-bold text-stone-700"
      >
        ⚖️ The Judge is deliberating…
      </div>
    );
  }

  if (compact) {
    return (
      <span
        data-testid="judge-meter"
        className="inline-flex items-center gap-1 rounded-full border-2 border-stone-900 bg-[#FEF3C7] px-2.5 py-0.5 text-xs font-bold text-stone-900"
      >
        ⚖️ {score}/100
      </span>
    );
  }

  return (
    <div
      data-testid="judge-meter"
      className="rounded-xl border-2 border-stone-900 bg-[#FEF3C7] p-3"
    >
      <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-stone-600">
        <span>⚖️ The Judge</span>
        <span className={cn("font-heading text-lg font-black tracking-tight", score >= 80 ? "text-[#BE123C]" : "text-stone-900")}>
          {score}/100
        </span>
      </div>
      <div className="mt-1.5 h-3 w-full overflow-hidden rounded-full border-2 border-stone-900 bg-white">
        <div
          className="h-full rounded-full bg-[#F43F5E] transition-[width] duration-500"
          style={{ width: `${score}%` }}
          role="meter"
          aria-valuenow={score}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="AI judge score"
        />
      </div>
      {critique && <p className="mt-1.5 text-sm font-medium italic text-stone-700">“{critique}”</p>}
    </div>
  );
}
