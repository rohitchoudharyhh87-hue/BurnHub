import { useParams } from "react-router-dom";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Swords, Trophy } from "lucide-react";
import { apiGet, apiPost, ApiError } from "@/lib/api";
import { useMe } from "@/lib/session";
import { themeEmoji, themeLabel } from "@/lib/themes";
import { cn } from "@/lib/utils";
import type { BattleDetail, Roast } from "@/lib/types";
import { Button } from "@/components/ui/button";
import RoastCard from "@/components/RoastCard";
import RoastComposer from "@/components/RoastComposer";

function liveScore(roasts: Roast[], side: string): number {
  return roasts
    .filter((r) => r.side === side)
    .reduce((sum, r) => sum + (r.ai_score ?? 0) + 4 * r.voters.length + r.fires, 0);
}

function SideColumn({
  label,
  emoji,
  tint,
  roasts,
}: {
  label: string;
  emoji: string;
  tint: string;
  roasts: Roast[];
}) {
  return (
    <div className="space-y-4" data-testid={`battle-side-${label}`}>
      <div
        className={cn(
          "flex items-center justify-between rounded-2xl border-2 border-stone-900 px-4 py-3 hard-shadow-sm",
        )}
        style={{ backgroundColor: tint }}
      >
        <span className="font-heading text-lg font-black tracking-tight">
          {emoji} {label}
        </span>
        <span className="rounded-full border-2 border-stone-900 bg-white px-2.5 py-0.5 text-xs font-black">
          {roasts.length} roast{roasts.length === 1 ? "" : "s"}
        </span>
      </div>
      {roasts.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-stone-400 bg-white p-6 text-center font-bold text-stone-400">
          Silence… somebody throw a punch.
        </div>
      )}
      {roasts.map((roast) => (
        <RoastCard key={roast.id} roast={roast} />
      ))}
    </div>
  );
}

export default function BattleArena() {
  const { id } = useParams<{ id: string }>();
  const { data: me } = useMe();
  const queryClient = useQueryClient();

  const battleQuery = useQuery({
    queryKey: ["battle", id],
    queryFn: () => apiGet<BattleDetail>(`/battles/${id}`),
    retry: false,
    enabled: !!id,
  });
  const battle = battleQuery.data;

  const closeMutation = useMutation({
    mutationFn: () => apiPost<BattleDetail>(`/battles/${id}/close`),
    onSuccess: (closed) => {
      toast.success(closed.verdict ?? "The battle is decided!");
      queryClient.invalidateQueries({ queryKey: ["battle"] });
      queryClient.invalidateQueries({ queryKey: ["battles"] });
      queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
      queryClient.invalidateQueries({ queryKey: ["me"] });
      queryClient.invalidateQueries({ queryKey: ["crews"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: (error) => {
      const detail =
        error instanceof ApiError
          ? ((error.body as { detail?: unknown } | null)?.detail ?? error.message)
          : "The gavel jammed — try again";
      toast.error(typeof detail === "string" ? detail : "The gavel jammed — try again");
    },
  });

  if (battleQuery.isLoading) {
    return <div className="h-96 animate-pulse rounded-2xl border-2 border-stone-900 bg-white/60" />;
  }

  if (battleQuery.isError || !battle) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-stone-400 bg-white p-8 text-center font-bold text-stone-500">
        This arena never existed — or the smoke took it.{" "}
        <Link to="/battles" className="text-[#E11D48] underline">
          Back to battles
        </Link>
      </div>
    );
  }

  const closed = battle.status === "closed";
  const isParticipant =
    !!me &&
    (battle.challenger_member_ids.includes(me.id) || battle.defender_member_ids.includes(me.id));

  const chScore = battle.challenger_score ?? liveScore(battle.roasts, "challenger");
  const dfScore = battle.defender_score ?? liveScore(battle.roasts, "defender");
  const total = chScore + dfScore;
  const chPct = total === 0 ? 50 : Math.round((chScore / total) * 100);

  const winnerName =
    battle.winner_id === battle.challenger.id
      ? battle.challenger.name
      : battle.winner_id === battle.defender.id
        ? battle.defender.name
        : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-3xl font-black tracking-tight" data-testid="battle-title">
            {battle.challenger.name} vs {battle.defender.name}
          </h1>
          <p className="text-sm font-medium text-stone-500">
            {battle.mode === "crew" ? "Crew war" : "1v1 duel"} · theme: {themeEmoji(battle.theme)}{" "}
            {themeLabel(battle.theme)} · scoring = AI score + 4/vote + 1/🔥
          </p>
        </div>
        {isParticipant && !closed && battle.roasts.length >= 1 && (
          <Button
            data-testid="battle-close-button"
            onClick={() => closeMutation.mutate()}
            disabled={closeMutation.isPending}
            className="border-2 border-stone-900 bg-[#FEF3C7] font-black hard-shadow-sm hard-lift"
          >
            {closeMutation.isPending ? "The Judge deliberates…" : "⚖️ Close battle & get the verdict"}
          </Button>
        )}
      </div>

      {/* VS banner */}
      <div
        data-testid="battle-vs-banner"
        className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-2xl border-2 border-stone-900 bg-[#FFF1F2] p-5 hard-shadow"
      >
        <div className="text-center sm:text-left">
          <div className="text-4xl sm:text-5xl">{battle.challenger.emoji}</div>
          <div className="mt-1 font-heading text-xl font-black tracking-tight">
            {battle.challenger.name}
          </div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
            {battle.challenger.kind === "crew" ? "crew" : "roaster"}
          </div>
        </div>
        <div className="animate-breathe rounded-full border-2 border-stone-900 bg-[#F43F5E] px-4 py-3 font-heading text-2xl font-black text-white hard-shadow-sm">
          VS
        </div>
        <div className="text-center sm:text-right">
          <div className="text-4xl sm:text-5xl">{battle.defender.emoji}</div>
          <div className="mt-1 font-heading text-xl font-black tracking-tight">
            {battle.defender.name}
          </div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
            {battle.defender.kind === "crew" ? "crew" : "roaster"}
          </div>
        </div>
      </div>

      {/* Score split */}
      <div data-testid="battle-scoreboard" className="rounded-2xl border-2 border-stone-900 bg-white p-4 hard-shadow">
        <div className="flex items-center justify-between text-sm font-black">
          <span className="text-[#BE123C]">{battle.challenger.name}: {chScore}</span>
          <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
            {closed ? "official score" : "live score"}
          </span>
          <span className="text-[#7C2D12]">{dfScore} : {battle.defender.name}</span>
        </div>
        <div className="mt-2 flex h-6 w-full overflow-hidden rounded-full border-2 border-stone-900">
          <div className="bg-[#F43F5E] transition-[width] duration-500" style={{ width: `${chPct}%` }} />
          <div className="flex-1 bg-[#EA580C]" />
        </div>
      </div>

      {closed && (
        <div
          data-testid="battle-verdict"
          className="rounded-2xl border-2 border-stone-900 bg-[#FEF3C7] p-5 text-center hard-shadow"
        >
          <p className="flex items-center justify-center gap-2 font-heading text-xl font-black tracking-tight">
            <Trophy className="h-5 w-5 text-[#D97706]" />
            {winnerName ? `${winnerName} takes the crown` : "A draw — nobody survived"}
          </p>
          {battle.verdict && <p className="mt-1 font-medium italic text-stone-700">“{battle.verdict}”</p>}
        </div>
      )}

      {isParticipant && !closed && (
        <RoastComposer users={[]} me={me} battle={battle} />
      )}

      {!isParticipant && !closed && (
        <p className="rounded-xl border-2 border-stone-900 bg-[#FFEDD5] p-3 text-center text-sm font-bold text-stone-700">
          <Swords className="mr-1 inline h-4 w-4" />
          Spectator seat — vote for the best roasts below, or start your own battle.
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <SideColumn
          label={battle.challenger.name}
          emoji={battle.challenger.emoji}
          tint="#FFE4E6"
          roasts={battle.roasts.filter((r) => r.side === "challenger")}
        />
        <SideColumn
          label={battle.defender.name}
          emoji={battle.defender.emoji}
          tint="#FFEDD5"
          roasts={battle.roasts.filter((r) => r.side === "defender")}
        />
      </div>
    </div>
  );
}
