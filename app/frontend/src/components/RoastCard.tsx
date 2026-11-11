import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Swords, Vote } from "lucide-react";
import { apiPost, ApiError } from "@/lib/api";
import { useMe } from "@/lib/session";
import { timeAgo } from "@/lib/burn";
import { themeEmoji, themeLabel } from "@/lib/themes";
import { cn } from "@/lib/utils";
import type { Roast } from "@/lib/types";
import { Button } from "@/components/ui/button";
import AIJudgeMeter from "./AIJudgeMeter";
import UserAvatar from "./UserAvatar";

function detailOf(error: unknown): string {
  if (error instanceof ApiError) {
    const detail = (error.body as { detail?: unknown } | null)?.detail;
    if (typeof detail === "string") return detail;
  }
  return "Something fizzled — try again";
}

export default function RoastCard({ roast }: { roast: Roast }) {
  const { data: me } = useMe();
  const queryClient = useQueryClient();
  const [punching, setPunching] = useState(false);

  const fired = !!me && roast.fired_by.includes(me.id);
  const voted = !!me && roast.voters.includes(me.id);
  const isAuthor = me?.id === roast.author_id;
  const isTarget = !!me && roast.target_user_id === me.id;

  function invalidateRoastData() {
    queryClient.invalidateQueries({ queryKey: ["roasts"] });
    queryClient.invalidateQueries({ queryKey: ["battle"] });
    queryClient.invalidateQueries({ queryKey: ["battles"] });
    queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
    queryClient.invalidateQueries({ queryKey: ["user"] });
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  }

  const fireMutation = useMutation({
    mutationFn: () => apiPost<Roast>(`/roasts/${roast.id}/fire`),
    onSuccess: invalidateRoastData,
    onError: (error) => toast.error(detailOf(error)),
  });

  const voteMutation = useMutation({
    mutationFn: () => apiPost<Roast>(`/roasts/${roast.id}/vote`),
    onSuccess: invalidateRoastData,
    onError: (error) => toast.error(detailOf(error)),
  });

  function handleFire() {
    if (!me) {
      toast.error("Pick a handle first — top right!");
      return;
    }
    setPunching(true);
    setTimeout(() => setPunching(false), 400);
    fireMutation.mutate();
  }

  function handleVote() {
    if (!me) {
      toast.error("Pick a handle first — top right!");
      return;
    }
    voteMutation.mutate();
  }

  return (
    <article
      data-testid={`roast-card-${roast.id}`}
      className="rounded-2xl border-2 border-stone-900 bg-white p-4 hard-shadow"
    >
      <div className="flex flex-wrap items-center gap-2">
        <Link
          to={`/u/${roast.author_id}`}
          data-testid={`roast-author-${roast.id}`}
          className="flex items-center gap-2"
        >
          <UserAvatar avatar={roast.author_avatar} color="#FFE4E6" size="sm" />
          <span className="font-heading font-black">{roast.author_name}</span>
        </Link>
        {roast.target_name ? (
          <span className="text-sm text-stone-500">
            roasted <b className="text-stone-800">{roast.target_name}</b>
          </span>
        ) : roast.battle_id ? (
          <Link
            to={`/battles/${roast.battle_id}`}
            className="inline-flex items-center gap-1 rounded-full border-2 border-stone-900 bg-[#FFEDD5] px-2.5 py-0.5 text-xs font-bold text-stone-800"
          >
            <Swords className="h-3 w-3" /> arena · {roast.side}
          </Link>
        ) : null}
        <span className="ml-auto flex items-center gap-2">
          <span className="rounded-full border-2 border-stone-900 bg-[#FFEDD5] px-2.5 py-0.5 text-xs font-bold">
            {themeEmoji(roast.theme)} {themeLabel(roast.theme)}
          </span>
          <span className="text-xs font-bold text-stone-400">{timeAgo(roast.created_at)}</span>
        </span>
      </div>

      <blockquote className="mt-3 rounded-xl border-2 border-stone-900 bg-[#FFF7ED] p-3 text-lg font-bold leading-relaxed">
        {roast.text}
        {roast.ai_generated && (
          <span className="ml-2 inline-block rounded-full bg-[#FFE4E6] px-2 py-0.5 align-middle text-[10px] font-black uppercase tracking-wide text-[#881337]">
            🤖 AI-assisted
          </span>
        )}
      </blockquote>

      <div className="mt-3">
        <AIJudgeMeter score={roast.ai_score} critique={roast.critique} />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button
          data-testid={`fire-button-${roast.id}`}
          size="sm"
          onClick={handleFire}
          aria-label="Fire reaction"
          disabled={isAuthor}
          className={cn(
            "rounded-full border-2 border-stone-900 font-black",
            fired ? "bg-[#FFEDD5]" : "bg-white",
          )}
        >
          <span className={cn("inline-block", punching && "animate-fire-punch")}>🔥</span>
          {roast.fires}
        </Button>

        {roast.battle_id && !isAuthor && (
          <Button
            data-testid={`vote-button-${roast.id}`}
            size="sm"
            variant={voted ? "default" : "outline"}
            onClick={handleVote}
            className={cn("rounded-full border-2 border-stone-900 font-black", !voted && "bg-white")}
          >
            <Vote className="h-4 w-4" />
            Vote · {roast.voters.length}
          </Button>
        )}

        {isTarget && (
          <Link
            to={`/?target=${roast.author_id}`}
            data-testid="roast-back-button"
            className="ml-auto rounded-full border-2 border-stone-900 bg-[#FFE4E6] px-3 py-1.5 text-sm font-black text-[#881337] hard-shadow-sm hard-lift"
          >
            ↩️ Roast back
          </Link>
        )}
      </div>
    </article>
  );
}
