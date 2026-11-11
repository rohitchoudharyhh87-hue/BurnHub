import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Crown } from "lucide-react";
import { apiGet } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { Battle, ProfileResponse, Roast } from "@/lib/types";
import BattleCard from "@/components/BattleCard";
import BurnPointsBadge from "@/components/BurnPointsBadge";
import RoastCard from "@/components/RoastCard";
import UserAvatar from "@/components/UserAvatar";

const PROFILE_TABS = [
  { id: "fired", label: "Roasts fired" },
  { id: "taken", label: "Roasts taken" },
  { id: "battles", label: "Battles" },
] as const;

type ProfileTab = (typeof PROFILE_TABS)[number]["id"];

function StatBox({ label, value, testid }: { label: string; value: string | number; testid: string }) {
  return (
    <div data-testid={testid} className="rounded-xl border-2 border-stone-900 bg-white px-3 py-2 text-center">
      <div className="font-heading text-xl font-black tracking-tight">{value}</div>
      <div className="text-[10px] font-bold uppercase tracking-wider text-stone-500">{label}</div>
    </div>
  );
}

export default function Profile() {
  const { id } = useParams<{ id: string }>();
  const [tab, setTab] = useState<ProfileTab>("fired");

  const profileQuery = useQuery({
    queryKey: ["user", id],
    queryFn: () => apiGet<ProfileResponse>(`/users/${id}`),
    retry: false,
    enabled: !!id,
  });
  const firedQuery = useQuery({
    queryKey: ["roasts", "author", id],
    queryFn: () => apiGet<Roast[]>(`/roasts?author=${id}`),
    retry: false,
    enabled: !!id,
  });
  const takenQuery = useQuery({
    queryKey: ["roasts", "target", id],
    queryFn: () => apiGet<Roast[]>(`/roasts?target=${id}`),
    retry: false,
    enabled: !!id,
  });
  const battlesQuery = useQuery({
    queryKey: ["battles"],
    queryFn: () => apiGet<Battle[]>("/battles"),
    retry: false,
  });

  const profile = profileQuery.data;
  const user = profile?.user;
  const myBattles = (battlesQuery.data ?? []).filter(
    (b) =>
      b.challenger_member_ids.includes(id ?? "∉") || b.defender_member_ids.includes(id ?? "∉"),
  );

  if (profileQuery.isLoading) {
    return <div className="h-80 animate-pulse rounded-2xl border-2 border-stone-900 bg-white/60" />;
  }

  if (profileQuery.isError || !user) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-stone-400 bg-white p-8 text-center font-bold text-stone-500">
        No such roaster in the burn unit.{" "}
        <Link to="/leaderboard" className="text-[#E11D48] underline">
          See who is on the board
        </Link>
      </div>
    );
  }

  const fired = firedQuery.data ?? [];
  const taken = takenQuery.data ?? [];

  return (
    <div className="space-y-6">
      {/* Roast passport */}
      <section
        data-testid="profile-passport"
        className="grid gap-6 rounded-2xl border-2 border-stone-900 bg-[#FFF1F2] p-6 hard-shadow sm:grid-cols-[auto_1fr]"
      >
        <div className="flex flex-col items-center gap-2">
          <UserAvatar avatar={user.avatar} color={user.color} size="xl" />
          <span className="rounded-full border-2 border-stone-900 bg-white px-3 py-0.5 text-xs font-black" data-testid="profile-rank">
            <Crown className="mr-1 inline h-3 w-3 text-[#D97706]" />
            Rank #{profile.rank}
          </span>
        </div>
        <div>
          <h1 className="font-heading text-3xl font-black tracking-tight" data-testid="profile-username">
            {user.username}
          </h1>
          <p className="mt-1 text-sm font-medium text-stone-600">{user.bio || "No bio — the roasts speak."}</p>
          <div className="mt-3">
            <BurnPointsBadge points={user.burn_points} />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <StatBox label="Wins" value={user.wins} testid="profile-stat-wins" />
            <StatBox label="Losses" value={user.losses} testid="profile-stat-losses" />
            <StatBox label="Streak" value={`🔥 ${user.streak}`} testid="profile-stat-streak" />
            <StatBox label="Roasts fired" value={user.roast_count} testid="profile-stat-roasts" />
          </div>
          {profile.best_roast && (
            <div className="mt-4 rounded-xl border-2 border-stone-900 bg-[#FEF3C7] p-3" data-testid="profile-best-roast">
              <p className="text-[10px] font-black uppercase tracking-wider text-[#92400E]">
                🏆 Best roast (The Judge's favorite)
              </p>
              <p className="mt-1 text-sm font-bold italic">“{profile.best_roast}”</p>
            </div>
          )}
        </div>
      </section>

      <div className="flex flex-wrap gap-1.5">
        {PROFILE_TABS.map((option) => (
          <button
            key={option.id}
            type="button"
            data-testid={`profile-tab-${option.id}`}
            onClick={() => setTab(option.id)}
            className={cn(
              "rounded-full border-2 border-stone-900 px-4 py-1.5 text-sm font-black transition-transform hover:-translate-y-0.5",
              tab === option.id ? "bg-stone-900 text-[#FFFDF7]" : "bg-white",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      {tab === "fired" && (
        <div className="space-y-4" data-testid="profile-roasts-fired">
          {fired.length === 0 && (
            <div className="rounded-2xl border-2 border-dashed border-stone-400 bg-white p-8 text-center font-bold text-stone-500">
              No roasts fired yet. The crowd waits.
            </div>
          )}
          {fired.map((roast) => (
            <RoastCard key={roast.id} roast={roast} />
          ))}
        </div>
      )}

      {tab === "taken" && (
        <div className="space-y-4" data-testid="profile-roasts-taken">
          {taken.length === 0 && (
            <div className="rounded-2xl border-2 border-dashed border-stone-400 bg-white p-8 text-center font-bold text-stone-500">
              Nobody dared. Unroasted and undefeated.
            </div>
          )}
          {taken.map((roast) => (
            <RoastCard key={roast.id} roast={roast} />
          ))}
        </div>
      )}

      {tab === "battles" && (
        <div className="grid gap-4 sm:grid-cols-2" data-testid="profile-battles">
          {myBattles.length === 0 && (
            <div className="rounded-2xl border-2 border-dashed border-stone-400 bg-white p-8 text-center font-bold text-stone-500 sm:col-span-2">
              No battles yet — challenge somebody on the Battles page.
            </div>
          )}
          {myBattles.map((battle) => (
            <BattleCard key={battle.id} battle={battle} />
          ))}
        </div>
      )}
    </div>
  );
}
