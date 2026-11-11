import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Flame } from "lucide-react";
import { apiGet } from "@/lib/api";
import { burnLevel } from "@/lib/burn";
import { cn } from "@/lib/utils";
import type { User } from "@/lib/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import UserAvatar from "@/components/UserAvatar";

const PODIUM = [
  { place: 1, medal: "👑", bg: "#FEF3C7", tilt: "" },
  { place: 2, medal: "🥈", bg: "#FFE4E6", tilt: "tilt-l" },
  { place: 3, medal: "🥉", bg: "#FFEDD5", tilt: "tilt-r" },
];

export default function Leaderboard() {
  const leadersQuery = useQuery({
    queryKey: ["leaderboard"],
    queryFn: () => apiGet<User[]>("/leaderboard"),
    retry: false,
  });
  const leaders = leadersQuery.data ?? [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-3xl font-black tracking-tight">Burn Points leaderboard</h1>
        <p className="text-sm font-medium text-stone-500">
          Roasts, fires, votes and battle wins all feed the flame.
        </p>
      </div>

      {leadersQuery.isLoading && (
        <div className="h-56 animate-pulse rounded-2xl border-2 border-stone-900 bg-white/60" />
      )}

      {leadersQuery.isError && !leadersQuery.data && (
        <div className="rounded-2xl border-2 border-dashed border-stone-400 bg-white p-8 text-center font-bold text-stone-500">
          The scoreboard is unreachable right now — check back soon.
        </div>
      )}

      {leaders.length > 0 && (
        <>
          {/* Podium */}
          <div className="grid grid-cols-3 items-end gap-3" data-testid="leaderboard-podium">
            {PODIUM.map(({ place, medal, bg, tilt }) => {
              const user = leaders[place - 1];
              if (!user) return <div key={place} />;
              return (
                <Link
                  key={place}
                  to={`/u/${user.id}`}
                  data-testid={`podium-place-${place}`}
                  className={cn(
                    "rounded-2xl border-2 border-stone-900 p-4 text-center hard-shadow hard-lift",
                    tilt,
                    place === 1 && "sm:-translate-y-4",
                  )}
                  style={{ backgroundColor: bg }}
                >
                  <div className="text-2xl">{medal}</div>
                  <UserAvatar avatar={user.avatar} color={user.color} size="lg" className="mx-auto mt-2" />
                  <div className="mt-2 truncate font-heading text-base font-black tracking-tight">
                    {user.username}
                  </div>
                  <div className="text-sm font-black text-[#BE123C]">{user.burn_points} BP</div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                    {burnLevel(user.burn_points).emoji} {burnLevel(user.burn_points).label}
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Full table */}
          <div className="rounded-2xl border-2 border-stone-900 bg-white hard-shadow">
            <Table>
              <TableHeader>
                <TableRow className="border-stone-900">
                  <TableHead className="w-14">#</TableHead>
                  <TableHead>Roaster</TableHead>
                  <TableHead>Burn level</TableHead>
                  <TableHead className="text-right">Burn Points</TableHead>
                  <TableHead className="text-right">W / L</TableHead>
                  <TableHead className="text-right">Streak</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaders.map((user, index) => (
                  <TableRow key={user.id} data-testid={`leaderboard-row-${user.id}`} className="border-stone-900">
                    <TableCell className="font-black">{index + 1}</TableCell>
                    <TableCell>
                      <Link to={`/u/${user.id}`} className="flex items-center gap-2 font-bold hover:underline">
                        <UserAvatar avatar={user.avatar} color={user.color} size="sm" className="h-7 w-7 text-sm" />
                        {user.username}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm font-bold">
                      {burnLevel(user.burn_points).emoji} {burnLevel(user.burn_points).label}
                    </TableCell>
                    <TableCell className="text-right font-black text-[#F43F5E]">{user.burn_points}</TableCell>
                    <TableCell className="text-right font-bold">
                      {user.wins} / {user.losses}
                    </TableCell>
                    <TableCell className="text-right font-bold">
                      {user.streak > 0 ? (
                        <span className="inline-flex items-center gap-1 text-[#EA580C]">
                          <Flame className="h-3.5 w-3.5" />×{user.streak}
                        </span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}
