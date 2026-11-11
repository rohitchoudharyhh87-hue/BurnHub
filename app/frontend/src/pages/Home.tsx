import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { buttonVariants } from "@/components/ui/button";
import { apiGet } from "@/lib/api";
import { useMe } from "@/lib/session";
import { dailyPrompt } from "@/lib/themes";
import { cn } from "@/lib/utils";
import type { Battle, Roast, User } from "@/lib/types";
import RoastCard from "@/components/RoastCard";
import RoastComposer from "@/components/RoastComposer";
import UserAvatar from "@/components/UserAvatar";
import { UsernameCard } from "@/components/UsernameDialog";

const FEED_FILTERS = [
  { id: "latest", label: "Latest" },
  { id: "hot", label: "Hot 🔥" },
  { id: "hall", label: "Hall of Flame ⚖️" },
] as const;

type FeedFilter = (typeof FEED_FILTERS)[number]["id"];

export default function Home() {
  const { data: me } = useMe();
  const [searchParams] = useSearchParams();
  const targetParam = searchParams.get("target") ?? undefined;
  const [filter, setFilter] = useState<FeedFilter>("latest");

  const usersQuery = useQuery({
    queryKey: ["users"],
    queryFn: () => apiGet<User[]>("/users"),
    retry: false,
  });
  const roastsQuery = useQuery({
    queryKey: ["roasts", filter],
    queryFn: () => apiGet<Roast[]>(`/roasts?filter=${filter}`),
    retry: false,
  });
  const battlesQuery = useQuery({
    queryKey: ["battles"],
    queryFn: () => apiGet<Battle[]>("/battles"),
    retry: false,
  });
  const leadersQuery = useQuery({
    queryKey: ["leaderboard"],
    queryFn: () => apiGet<User[]>("/leaderboard"),
    retry: false,
  });

  const openBattles = (battlesQuery.data ?? []).filter((b) => b.status === "open").slice(0, 3);
  const topBurners = (leadersQuery.data ?? []).slice(0, 5);

  return (
    <div className="space-y-8">
      {/* Hero */}
      <section
        data-testid="hero"
        className="grid gap-6 rounded-2xl border-2 border-stone-900 bg-[#FFF1F2] p-6 hard-shadow sm:p-8 lg:grid-cols-[1.25fr_1fr]"
      >
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#E11D48]">
            The roast battle arena
          </p>
          <h1 className="mt-2 font-heading text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl">
            Roast your friends.
            <br />
            Get judged.
            <br />
            <span className="text-[#F43F5E]">Ascend the smoke.</span>
          </h1>
          <p className="mt-3 max-w-md font-medium text-stone-600">
            AI-assisted burns, 1v1 duels, crew wars, community votes — and an unimpressed AI Judge
            scoring every single roast you fire.
          </p>

          {!me && (
            <div
              data-testid="hero-username-card"
              className="mt-6 max-w-sm rounded-2xl border-2 border-stone-900 bg-white p-4 hard-shadow"
            >
              <h2 className="font-heading font-black tracking-tight">Pick a handle to enter</h2>
              <p className="mb-3 text-sm text-stone-500">
                No password. Your handle is your identity — come back anytime by typing it again.
              </p>
              <UsernameCard />
            </div>
          )}

          {me && (
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to="/battles"
                data-testid="hero-battles-cta"
                className={buttonVariants({
                  className: "border-2 border-stone-900 font-black hard-shadow-sm hard-lift",
                })}
              >
                ⚔️ Enter the arenas
              </Link>
              <Link
                to="/crews"
                data-testid="hero-crews-cta"
                className={buttonVariants({
                  variant: "outline",
                  className: "border-2 border-stone-900 bg-white font-black hard-shadow-sm hard-lift",
                })}
              >
                🛡️ Find a crew
              </Link>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div
            data-testid="daily-prompt"
            className="tilt-r rounded-2xl border-2 border-stone-900 bg-[#FEF3C7] p-4 hard-shadow"
          >
            <p className="text-xs font-black uppercase tracking-wider text-[#92400E]">
              🤖 BurnBot's daily dare
            </p>
            <p className="mt-1 font-heading text-lg font-black leading-snug">“{dailyPrompt()}”</p>
          </div>
          <div
            data-testid="top-burners-widget"
            className="rounded-2xl border-2 border-stone-900 bg-white p-4 hard-shadow"
          >
            <p className="text-xs font-black uppercase tracking-wider text-stone-500">
              🔥 Top burners
            </p>
            <ul className="mt-2 space-y-1.5">
              {topBurners.map((user, index) => (
                <li key={user.id}>
                  <Link
                    to={`/u/${user.id}`}
                    data-testid={`top-burner-${index}`}
                    className="flex items-center gap-2 rounded-lg p-1 text-sm font-bold transition-transform hover:translate-x-1"
                  >
                    <span className="w-5 text-stone-400">#{index + 1}</span>
                    <UserAvatar avatar={user.avatar} color={user.color} size="sm" className="h-6 w-6 text-xs" />
                    <span className="truncate">{user.username}</span>
                    <span className="ml-auto text-[#F43F5E]">{user.burn_points} BP</span>
                  </Link>
                </li>
              ))}
              {topBurners.length === 0 && (
                <li className="text-sm text-stone-400">The board is cold — be the first burner.</li>
              )}
            </ul>
          </div>
        </div>
      </section>

      {/* Feed + side rail */}
      <section className="grid gap-8 lg:grid-cols-[1fr_300px]">
        <div className="space-y-4">
          {me && (
            <RoastComposer
              users={usersQuery.data ?? []}
              me={me}
              defaultTargetId={targetParam}
            />
          )}

          <div className="flex flex-wrap gap-1.5">
            {FEED_FILTERS.map((option) => (
              <button
                key={option.id}
                type="button"
                data-testid={`feed-filter-${option.id}`}
                onClick={() => setFilter(option.id)}
                className={cn(
                  "rounded-full border-2 border-stone-900 px-4 py-1.5 text-sm font-black transition-transform hover:-translate-y-0.5",
                  filter === option.id ? "bg-stone-900 text-[#FFFDF7]" : "bg-white",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>

          {roastsQuery.isLoading &&
            [1, 2, 3].map((index) => (
              <div
                key={index}
                className="h-44 animate-pulse rounded-2xl border-2 border-stone-900 bg-white/60"
              />
            ))}

          {roastsQuery.isError && !roastsQuery.data && (
            <div className="rounded-2xl border-2 border-dashed border-stone-400 bg-white p-8 text-center font-bold text-stone-500" data-testid="feed-error">
              The kitchen went quiet — the feed can't be reached right now. Check back soon.
            </div>
          )}

          {roastsQuery.data && roastsQuery.data.length === 0 && (
            <div className="rounded-2xl border-2 border-dashed border-stone-400 bg-white p-8 text-center font-bold text-stone-500" data-testid="feed-empty">
              No roasts yet — fire the first shot. 🔥
            </div>
          )}

          {(roastsQuery.data ?? []).map((roast) => (
            <RoastCard key={roast.id} roast={roast} />
          ))}
        </div>

        <aside className="space-y-4">
          <div
            data-testid="active-battles-widget"
            className="rounded-2xl border-2 border-stone-900 bg-white p-4 hard-shadow"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-black uppercase tracking-wider text-stone-500">
                ⚔️ Live arenas
              </p>
              <Link to="/battles" className="text-xs font-bold text-[#E11D48]">
                all →
              </Link>
            </div>
            <ul className="mt-2 space-y-2">
              {openBattles.map((battle) => (
                <li key={battle.id}>
                  <Link
                    to={`/battles/${battle.id}`}
                    data-testid={`open-battle-${battle.id}`}
                    className="block rounded-xl border-2 border-stone-900 bg-[#FFF7ED] p-2 text-sm font-bold transition-transform hover:-translate-y-0.5"
                  >
                    {battle.challenger.emoji} {battle.challenger.name}{" "}
                    <span className="text-[#F43F5E]">vs</span> {battle.defender.emoji}{" "}
                    {battle.defender.name}
                  </Link>
                </li>
              ))}
              {openBattles.length === 0 && (
                <li className="text-sm text-stone-400">No live battles. Start one!</li>
              )}
            </ul>
          </div>
        </aside>
      </section>
    </div>
  );
}
