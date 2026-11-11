import { Link } from "react-router-dom";
import { Trophy } from "lucide-react";
import type { Battle } from "@/lib/types";
import { themeEmoji, themeLabel } from "@/lib/themes";
import { Badge } from "@/components/ui/badge";

export default function BattleCard({ battle }: { battle: Battle }) {
  const closed = battle.status === "closed";
  const winner =
    closed && battle.winner_id
      ? battle.winner_id === battle.challenger.id
        ? battle.challenger
        : battle.defender
      : null;

  return (
    <Link
      to={`/battles/${battle.id}`}
      data-testid={`battle-card-${battle.id}`}
      className="block rounded-2xl border-2 border-stone-900 bg-white p-4 hard-shadow hard-lift"
    >
      <div className="flex items-center justify-between gap-2">
        <Badge
          className={
            closed
              ? "border-2 border-stone-900 bg-[#F5EFE3] text-stone-700"
              : "border-2 border-stone-900 bg-[#F43F5E] text-white"
          }
        >
          {closed ? "Decided" : "● Live arena"}
        </Badge>
        <span className="rounded-full border-2 border-stone-900 bg-[#FFEDD5] px-2.5 py-0.5 text-xs font-bold">
          {themeEmoji(battle.theme)} {themeLabel(battle.theme)}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <div className="text-center">
          <div className="text-3xl">{battle.challenger.emoji}</div>
          <div className="mt-1 font-heading text-sm font-black leading-tight">{battle.challenger.name}</div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
            {battle.challenger.kind === "crew" ? "crew" : "roaster"}
          </div>
        </div>
        <div className="animate-breathe font-heading text-2xl font-black text-[#F43F5E]">VS</div>
        <div className="text-center">
          <div className="text-3xl">{battle.defender.emoji}</div>
          <div className="mt-1 font-heading text-sm font-black leading-tight">{battle.defender.name}</div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
            {battle.defender.kind === "crew" ? "crew" : "roaster"}
          </div>
        </div>
      </div>

      {closed && (
        <div className="mt-4 rounded-xl border-2 border-stone-900 bg-[#FEF3C7] p-2.5 text-center text-sm font-bold">
          {winner ? (
            <span data-testid={`battle-winner-${battle.id}`} className="inline-flex items-center gap-1.5">
              <Trophy className="h-4 w-4 text-[#D97706]" />
              {winner.name} won · {battle.challenger_score} : {battle.defender_score}
            </span>
          ) : (
            <span>A draw — the crowd demanded a refund</span>
          )}
        </div>
      )}
    </Link>
  );
}
