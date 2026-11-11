import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
import { apiPost, apiStream, ApiError } from "@/lib/api";
import type { Battle, Roast, User } from "@/lib/types";
import { INTENSITIES, themeEmoji, themeLabel } from "@/lib/themes";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import ThemeFlairPicker from "./ThemeFlairPicker";

interface FirePayload {
  text: string;
  theme: string;
  target_user_id?: string;
  battle_id?: string;
  ai_generated: boolean;
}

export default function RoastComposer({
  users,
  me,
  defaultTargetId,
  battle,
}: {
  users: User[];
  me: User | null;
  defaultTargetId?: string;
  battle?: Battle;
}) {
  const [targetId, setTargetId] = useState(defaultTargetId ?? "");
  const [theme, setTheme] = useState(battle?.theme ?? "genz");
  const [intensity, setIntensity] = useState<"mild" | "savage" | "nuclear">("savage");
  const [context, setContext] = useState("");
  const [text, setText] = useState("");
  const [assisting, setAssisting] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (defaultTargetId) setTargetId(defaultTargetId);
  }, [defaultTargetId]);

  const mySide =
    battle && me
      ? battle.challenger_member_ids.includes(me.id)
        ? "challenger"
        : battle.defender_member_ids.includes(me.id)
          ? "defender"
          : null
      : null;

  const opponents = users.filter((u) => u.id !== me?.id);

  const fireMutation = useMutation({
    mutationFn: (payload: FirePayload) => apiPost<Roast>("/roasts", payload),
    onSuccess: (roast) => {
      toast.success(`Roasted! The Judge scored it ${roast.ai_score}/100`, {
        description: roast.critique ?? undefined,
      });
      setText("");
      setContext("");
      queryClient.invalidateQueries({ queryKey: ["roasts"] });
      queryClient.invalidateQueries({ queryKey: ["battle"] });
      queryClient.invalidateQueries({ queryKey: ["battles"] });
      queryClient.invalidateQueries({ queryKey: ["me"] });
      queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
      queryClient.invalidateQueries({ queryKey: ["user"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: (error) => {
      const detail =
        error instanceof ApiError
          ? ((error.body as { detail?: unknown } | null)?.detail ?? error.message)
          : "The roast fizzled mid-air";
      toast.error(typeof detail === "string" ? detail : "The roast fizzled mid-air");
    },
  });

  async function handleAssist() {
    if (!me) {
      toast.error("Pick a handle first — top right!");
      return;
    }
    const targetName = battle
      ? mySide === "challenger"
        ? battle.defender.name
        : battle.challenger.name
      : opponents.find((u) => u.id === targetId)?.username;
    if (!targetName) {
      toast.error("Pick a target first");
      return;
    }
    setAssisting(true);
    setText("");
    try {
      await apiStream(
        "/ai/roast-assist",
        { target_name: targetName, theme, context, intensity },
        (delta) => setText((prev) => prev + delta),
      );
    } catch {
      toast.error("BurnBot tripped on its cable — write your own heat");
    } finally {
      setAssisting(false);
    }
  }

  function handleFire() {
    if (!me) {
      toast.error("Pick a handle first — top right!");
      return;
    }
    const trimmed = text.trim();
    if (!trimmed) {
      toast.error("An empty roast burns nobody");
      return;
    }
    if (battle) {
      fireMutation.mutate({ text: trimmed, theme, battle_id: battle.id, ai_generated: false });
      return;
    }
    if (!targetId) {
      toast.error("Pick your victim first");
      return;
    }
    fireMutation.mutate({ text: trimmed, theme, target_user_id: targetId, ai_generated: false });
  }

  return (
    <section
      data-testid="roast-composer"
      className="rounded-2xl border-2 border-stone-900 bg-white p-4 hard-shadow sm:p-5"
    >
      <h2 className="font-heading text-xl font-black tracking-tight">
        {battle ? `⚔️ Fire into the arena` : "🔥 Roast somebody"}
      </h2>
      <p className="mt-0.5 text-sm text-stone-500">
        {battle
          ? "Your roast gets an AI Judge score — the crowd votes too."
          : "Write your own heat or let BurnBot draft it. The Judge scores everything."}
      </p>

      <div className="mt-4 space-y-4">
        {!battle && (
          <div className="space-y-2">
            <Label>Pick your victim</Label>
            <Select value={targetId} onValueChange={(value: string) => setTargetId(value)}>
              <SelectTrigger
                data-testid="roast-composer-target"
                className="w-full border-2 border-stone-900 bg-white"
              >
                <SelectValue placeholder="Pick your victim" />
              </SelectTrigger>
              <SelectContent>
                {opponents.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.avatar} {user.username}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {!battle && (
          <>
            <div className="space-y-2">
              <Label>Theme flair</Label>
              <ThemeFlairPicker value={theme} onChange={setTheme} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="roast-composer-ammo">Ammo — anything about them (optional)</Label>
              <Input
                id="roast-composer-ammo"
                data-testid="roast-composer-ammo"
                value={context}
                onChange={(event) => setContext(event.target.value)}
                placeholder="e.g. microwaves fish in the office kitchen"
                maxLength={240}
              />
            </div>
          </>
        )}

        <div className="space-y-2">
          <Label>Intensity</Label>
          <div className="flex gap-1.5">
            {INTENSITIES.map((level) => (
              <button
                key={level.id}
                type="button"
                data-testid={`intensity-chip-${level.id}`}
                onClick={() => setIntensity(level.id)}
                className={cn(
                  "rounded-full border-2 border-stone-900 px-3 py-1 text-xs font-bold transition-transform hover:-translate-y-0.5",
                  intensity === level.id ? "bg-stone-900 text-[#FFFDF7]" : "bg-white",
                )}
              >
                {level.emoji} {level.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="roast-composer-text">The roast</Label>
            {battle && (
              <span className="rounded-full border-2 border-stone-900 bg-[#FFEDD5] px-2.5 py-0.5 text-xs font-bold">
                {themeEmoji(battle.theme)} {themeLabel(battle.theme)} — arena theme
              </span>
            )}
          </div>
          <Textarea
            id="roast-composer-text"
            data-testid="roast-composer-text"
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder={assisting ? "BurnBot is stoking the flames…" : "Write the burn…"}
            rows={4}
            maxLength={500}
            className={cn("border-2 border-stone-900 bg-white", assisting && "ai-shimmer")}
          />
          <div className="flex items-center justify-between text-xs font-bold text-stone-400">
            <span>{assisting ? "🤖 BurnBot drafting — edit anything before firing" : ""}</span>
            <span>{text.length}/500</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            data-testid="ai-assist-button"
            variant="outline"
            onClick={handleAssist}
            disabled={assisting || fireMutation.isPending}
            className="border-2 border-stone-900 bg-[#FEF3C7] font-black hard-shadow-sm hard-lift"
          >
            <Sparkles className="h-4 w-4" />
            {assisting ? "Stoking the flames…" : "AI Roast Assist"}
          </Button>
          <Button
            data-testid="roast-fire-button"
            onClick={handleFire}
            disabled={assisting || fireMutation.isPending}
            className="border-2 border-stone-900 font-black hard-shadow-sm hard-lift"
          >
            {fireMutation.isPending ? "The Judge is deliberating…" : "Fire the roast 🔥"}
          </Button>
        </div>
      </div>
    </section>
  );
}
