import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiGet, apiPost, ApiError } from "@/lib/api";
import { useMe } from "@/lib/session";
import type { Battle, Crew, User } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import BattleCard from "@/components/BattleCard";
import ThemeFlairPicker from "@/components/ThemeFlairPicker";

const BATTLE_FILTERS = [
  { id: "all", label: "All" },
  { id: "solo", label: "1v1 Duels" },
  { id: "crew", label: "Crew Wars" },
] as const;

type BattleFilter = (typeof BATTLE_FILTERS)[number]["id"];

function CreateBattleDialog({
  open,
  onOpenChange,
  users,
  crews,
  me,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  users: User[];
  crews: Crew[];
  me: User | null;
}) {
  const [mode, setMode] = useState<"solo" | "crew">("solo");
  const [defenderId, setDefenderId] = useState("");
  const [theme, setTheme] = useState("genz");
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const myCrew = me ? crews.find((c) => c.member_ids.includes(me.id)) : undefined;
  const options =
    mode === "solo"
      ? users.filter((u) => u.id !== me?.id)
      : crews.filter((c) => c.id !== myCrew?.id);

  const createMutation = useMutation({
    mutationFn: () =>
      apiPost<Battle>("/battles", {
        mode,
        defender_id: defenderId,
        theme,
        challenger_crew_id: mode === "crew" ? myCrew?.id : undefined,
      }),
    onSuccess: (battle) => {
      queryClient.invalidateQueries({ queryKey: ["battles"] });
      toast.success("The arena is lit! 🔥");
      onOpenChange(false);
      navigate(`/battles/${battle.id}`);
    },
    onError: (error) => {
      const detail =
        error instanceof ApiError
          ? ((error.body as { detail?: unknown } | null)?.detail ?? error.message)
          : "The matchmaker coughed — try again";
      toast.error(typeof detail === "string" ? detail : "The matchmaker coughed — try again");
    },
  });

  const canSubmit = !!defenderId && (mode === "solo" || !!myCrew) && !createMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" data-testid="create-battle-dialog">
        <DialogHeader>
          <DialogTitle>Light a new arena</DialogTitle>
          <DialogDescription>
            Challenge a rival to roast war. The AI Judge scores every roast; the crowd votes on top.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              data-testid="battle-mode-solo"
              onClick={() => {
                setMode("solo");
                setDefenderId("");
              }}
              className={cn(
                "rounded-xl border-2 border-stone-900 p-3 font-black transition-transform hover:-translate-y-0.5",
                mode === "solo" ? "bg-[#F43F5E] text-white" : "bg-white",
              )}
            >
              🤜 1v1 Duel
            </button>
            <button
              type="button"
              data-testid="battle-mode-crew"
              onClick={() => {
                setMode("crew");
                setDefenderId("");
              }}
              className={cn(
                "rounded-xl border-2 border-stone-900 p-3 font-black transition-transform hover:-translate-y-0.5",
                mode === "crew" ? "bg-[#F43F5E] text-white" : "bg-white",
              )}
            >
              🛡️ Crew War
            </button>
          </div>

          {mode === "crew" && !myCrew && (
            <p className="rounded-xl border-2 border-stone-900 bg-[#FEF3C7] p-3 text-sm font-bold text-stone-700">
              You're not in a crew — join or found one on the Crews page first.
            </p>
          )}

          <div className="space-y-2">
            <label className="text-sm font-bold">
              {mode === "solo" ? "Your opponent" : "Rival crew"}
            </label>
            <Select value={defenderId} onValueChange={(value: string) => setDefenderId(value)}>
              <SelectTrigger
                data-testid="battle-opponent-select"
                className="w-full border-2 border-stone-900 bg-white"
              >
                <SelectValue
                  placeholder={mode === "solo" ? "Pick your opponent" : "Pick the rival crew"}
                />
              </SelectTrigger>
              <SelectContent>
                {options.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {"username" in option
                      ? `${option.avatar} ${option.username}`
                      : `${option.emoji} ${option.name}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold">Battle theme</label>
            <ThemeFlairPicker value={theme} onChange={setTheme} testPrefix="battle-theme-chip" />
          </div>

          <Button
            data-testid="battle-create-submit"
            onClick={() => createMutation.mutate()}
            disabled={!canSubmit}
            className="w-full border-2 border-stone-900 font-black hard-shadow-sm hard-lift"
          >
            {createMutation.isPending ? "Lighting the arena…" : "Light the arena 🔥"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Battles() {
  const { data: me } = useMe();
  const [filter, setFilter] = useState<BattleFilter>("all");
  const [createOpen, setCreateOpen] = useState(false);

  const battlesQuery = useQuery({
    queryKey: ["battles"],
    queryFn: () => apiGet<Battle[]>("/battles"),
    retry: false,
  });
  const usersQuery = useQuery({ queryKey: ["users"], queryFn: () => apiGet<User[]>("/users"), retry: false });
  const crewsQuery = useQuery({ queryKey: ["crews"], queryFn: () => apiGet<Crew[]>("/crews"), retry: false });

  const battles = (battlesQuery.data ?? []).filter(
    (b) => filter === "all" || b.mode === filter,
  );

  function handleCreateClick() {
    if (!me) {
      toast.error("Pick a handle first — top right!");
      return;
    }
    setCreateOpen(true);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-3xl font-black tracking-tight">Battle arenas</h1>
          <p className="text-sm font-medium text-stone-500">
            1v1 duels and crew wars — every roast scored by The Judge, every vote counts.
          </p>
        </div>
        <Button
          data-testid="new-battle-button"
          onClick={handleCreateClick}
          className="border-2 border-stone-900 font-black hard-shadow-sm hard-lift"
        >
          ⚔️ New Battle
        </Button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {BATTLE_FILTERS.map((option) => (
          <button
            key={option.id}
            type="button"
            data-testid={`battle-filter-${option.id}`}
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

      {battlesQuery.isLoading && (
        <div className="grid gap-4 sm:grid-cols-2">
          {[1, 2, 3, 4].map((index) => (
            <div key={index} className="h-48 animate-pulse rounded-2xl border-2 border-stone-900 bg-white/60" />
          ))}
        </div>
      )}

      {battlesQuery.isError && !battlesQuery.data && (
        <div className="rounded-2xl border-2 border-dashed border-stone-400 bg-white p-8 text-center font-bold text-stone-500">
          The arenas can't be reached right now — check back soon.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {battles.map((battle) => (
          <BattleCard key={battle.id} battle={battle} />
        ))}
      </div>

      {battlesQuery.data && battles.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-stone-400 bg-white p-8 text-center font-bold text-stone-500">
          No battles here yet — light the first arena.
        </div>
      )}

           <CreateBattleDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        users={usersQuery.data ?? []}
        crews={crewsQuery.data ?? []}
        me={me ?? null}
      />
    </div>
  );
}
