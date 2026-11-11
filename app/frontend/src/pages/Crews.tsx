import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiGet, apiPost, ApiError } from "@/lib/api";
import { useMe } from "@/lib/session";
import type { Battle, Crew, User } from "@/lib/types";
import { CREW_EMOJIS } from "@/lib/themes";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import CrewCard from "@/components/CrewCard";
import { EmojiGrid } from "@/components/UsernameDialog";
import ThemeFlairPicker from "@/components/ThemeFlairPicker";

function FoundCrewDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState(CREW_EMOJIS[0]);
  const [tagline, setTagline] = useState("");
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: () => apiPost<Crew>("/crews", { name: name.trim(), emoji, tagline: tagline.trim() }),
    onSuccess: (crew) => {
      queryClient.invalidateQueries({ queryKey: ["crews"] });
      queryClient.invalidateQueries({ queryKey: ["crew"] });
      toast.success(`Crew founded: ${crew.name} ${crew.emoji}`);
      onOpenChange(false);
      setName("");
      setTagline("");
    },
    onError: (error) => {
      const detail =
        error instanceof ApiError
          ? ((error.body as { detail?: unknown } | null)?.detail ?? error.message)
          : "The crew nameplate fell off — try again";
      toast.error(typeof detail === "string" ? detail : "The crew nameplate fell off — try again");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" data-testid="create-crew-dialog">
        <DialogHeader>
          <DialogTitle>Found a crew</DialogTitle>
          <DialogDescription>
            Crews battle other crews in roast wars. Founding one makes you a member instantly.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="crew-name-input">Crew name</Label>
            <Input
              id="crew-name-input"
              data-testid="crew-name-input"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. The Slander Squad"
              maxLength={30}
            />
          </div>
          <div className="space-y-2">
            <Label>Crew flag</Label>
            <EmojiGrid emojis={CREW_EMOJIS} value={emoji} onChange={setEmoji} testPrefix="crew-emoji" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="crew-tagline-input">Tagline</Label>
            <Input
              id="crew-tagline-input"
              data-testid="crew-tagline-input"
              value={tagline}
              onChange={(event) => setTagline(event.target.value)}
              placeholder="We roast first and file paperwork never"
              maxLength={90}
            />
          </div>
          <Button
            data-testid="crew-create-submit"
            onClick={() => createMutation.mutate()}
            disabled={name.trim().length < 2 || createMutation.isPending}
            className="w-full border-2 border-stone-900 font-black hard-shadow-sm hard-lift"
          >
            {createMutation.isPending ? "Raising the flag…" : "Found the crew 🛡️"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Crews() {
  const { data: me } = useMe();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [challengeCrew, setChallengeCrew] = useState<Crew | null>(null);
  const [challengeTheme, setChallengeTheme] = useState("genz");

  const crewsQuery = useQuery({ queryKey: ["crews"], queryFn: () => apiGet<Crew[]>("/crews"), retry: false });
  const usersQuery = useQuery({ queryKey: ["users"], queryFn: () => apiGet<User[]>("/users"), retry: false });

  const users = usersQuery.data ?? [];
  const myCrew = me ? (crewsQuery.data ?? []).find((c) => c.member_ids.includes(me.id)) : undefined;

  const joinMutation = useMutation({
    mutationFn: (crew: Crew) => apiPost<Crew>(`/crews/${crew.id}/join`),
    onSuccess: (crew) => {
      queryClient.invalidateQueries({ queryKey: ["crews"] });
      queryClient.invalidateQueries({ queryKey: ["crew"] });
      toast.success(`Welcome to ${crew.name} ${crew.emoji}`);
    },
    onError: (error) => {
      const detail =
        error instanceof ApiError
          ? ((error.body as { detail?: unknown } | null)?.detail ?? error.message)
          : "The door was locked — try again";
      toast.error(typeof detail === "string" ? detail : "The door was locked — try again");
    },
  });

  const challengeMutation = useMutation({
    mutationFn: () =>
      apiPost<Battle>("/battles", {
        mode: "crew",
        defender_id: challengeCrew?.id ?? "",
        challenger_crew_id: myCrew?.id,
        theme: challengeTheme,
      }),
    onSuccess: (battle) => {
      queryClient.invalidateQueries({ queryKey: ["battles"] });
      toast.success("War declared — the arena is lit! 🔥");
      setChallengeCrew(null);
      navigate(`/battles/${battle.id}`);
    },
    onError: (error) => {
      const detail =
        error instanceof ApiError
          ? ((error.body as { detail?: unknown } | null)?.detail ?? error.message)
          : "The war horn sputtered — try again";
      toast.error(typeof detail === "string" ? detail : "The war horn sputtered — try again");
    },
  });

  function handleJoin(crew: Crew) {
    if (!me) {
      toast.error("Pick a handle first — top right!");
      return;
    }
    joinMutation.mutate(crew);
  }

  function handleChallenge(crew: Crew) {
    if (!me) {
      toast.error("Pick a handle first — top right!");
      return;
    }
    if (!myCrew) {
      toast.error("Join or found a crew first — you need an army to declare war");
      return;
    }
    setChallengeCrew(crew);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-3xl font-black tracking-tight">Crew headquarters</h1>
          <p className="text-sm font-medium text-stone-500">
            Bands of roasters fighting for burn supremacy. Join one — or raise your own flag.
          </p>
        </div>
        <Button
          data-testid="new-crew-button"
          onClick={() => {
            if (!me) {
              toast.error("Pick a handle first — top right!");
              return;
            }
            setCreateOpen(true);
          }}
          className="border-2 border-stone-900 font-black hard-shadow-sm hard-lift"
        >
          🛡️ Found a Crew
        </Button>
      </div>

      {crewsQuery.isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((index) => (
            <div key={index} className="h-64 animate-pulse rounded-2xl border-2 border-stone-900 bg-white/60" />
          ))}
        </div>
      )}

      {crewsQuery.isError && !crewsQuery.data && (
        <div className="rounded-2xl border-2 border-dashed border-stone-400 bg-white p-8 text-center font-bold text-stone-500">
          The crew hall is unreachable right now — check back soon.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(crewsQuery.data ?? []).map((crew) => (
         <CrewCard
            key={crew.id}
            crew={crew}
            members={users.filter((u) => crew.member_ids.includes(u.id))}
            me={me ?? null}
            onJoin={handleJoin}
            onChallenge={handleChallenge}
          />
        ))}
      </div>

      {crewsQuery.data && (crewsQuery.data ?? []).length === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-stone-400 bg-white p-8 text-center font-bold text-stone-500">
          No crews yet — found the first one.
        </div>
      )}

      <FoundCrewDialog open={createOpen} onOpenChange={setCreateOpen} />

      {/* Crew war challenge dialog */}
      <Dialog open={!!challengeCrew} onOpenChange={(open) => !open && setChallengeCrew(null)}>
        <DialogContent className="max-w-md" data-testid="challenge-crew-dialog">
          <DialogHeader>
            <DialogTitle>
              Declare war on {challengeCrew?.emoji} {challengeCrew?.name}
            </DialogTitle>
            <DialogDescription>
              Your crew {myCrew?.emoji} {myCrew?.name} vs {challengeCrew?.name}. Pick the battle
              theme — each side roasts, The Judge scores, the crowd votes.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <ThemeFlairPicker value={challengeTheme} onChange={setChallengeTheme} testPrefix="challenge-theme-chip" />
            <Button
              data-testid="challenge-crew-submit"
              onClick={() => challengeMutation.mutate()}
              disabled={challengeMutation.isPending}
              className="w-full border-2 border-stone-900 font-black hard-shadow-sm hard-lift"
            >
              {challengeMutation.isPending ? "Sound the horns…" : "Declare war ⚔️"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
