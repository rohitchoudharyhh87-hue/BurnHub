import { useState } from "react";
import { toast } from "sonner";
import { apiPost, ApiError } from "@/lib/api";
import { beginSession } from "@/lib/session";
import type { User } from "@/lib/types";
import { AVATAR_COLORS, AVATAR_EMOJIS } from "@/lib/themes";
import { cn } from "@/lib/utils";
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

export function EmojiGrid({
  emojis,
  value,
  onChange,
  testPrefix,
}: {
  emojis: string[];
  value: string;
  onChange: (emoji: string) => void;
  testPrefix: string;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {emojis.map((emoji, index) => (
        <button
          key={emoji}
          type="button"
          data-testid={`${testPrefix}-${index}`}
          onClick={() => onChange(emoji)}
          className={cn(
            "h-10 w-10 rounded-xl border-2 border-stone-900 text-xl transition-transform hover:-translate-y-0.5",
            value === emoji ? "bg-[#FFE4E6]" : "bg-white",
          )}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}

function detailOf(error: unknown): string {
  if (error instanceof ApiError) {
    const detail = (error.body as { detail?: unknown } | null)?.detail;
    if (typeof detail === "string") return detail;
  }
  return "Could not light the torch — try again";
}

// Reusable pick-a-handle card: used inline in the hero and inside the dialog.
// Reusable pick-a-handle card: used inline in the hero (no prefix) and inside the
// dialog (idPrefix="dialog-") — the prefix keeps every data-testid unique.
export function UsernameCard({ idPrefix = "", onDone }: { idPrefix?: string; onDone?: () => void }) {
  const [username, setUsername] = useState("");
  const [avatar, setAvatar] = useState(AVATAR_EMOJIS[0]);
  const [color, setColor] = useState(AVATAR_COLORS[0]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    if (username.trim().length < 2) {
      setError("2+ characters, champion");
      return;
    }
    setPending(true);
    setError("");
    try {
      const user = await apiPost<User>("/auth/login", {
        username: username.trim(),
        avatar,
        color,
      });
      beginSession();
      toast.success(`Welcome, ${user.username} — the flames await`);
      onDone?.();
    } catch (submitError) {
      setError(detailOf(submitError));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}username-input`}>Your handle</Label>
        <Input
          id={`${idPrefix}username-input`}
          data-testid={`${idPrefix}username-input`}
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          placeholder="e.g. FlamingMarshmallow"
          maxLength={24}
          onKeyDown={(event) => event.key === "Enter" && submit()}
        />
        {error && (
          <p data-testid={`${idPrefix}username-error`} className="text-sm font-bold text-[#BE123C]">
            {error}
          </p>
        )}
      </div>
      <div className="space-y-2">
        <Label>Pick your fighter</Label>
        <EmojiGrid
          emojis={AVATAR_EMOJIS}
          value={avatar}
          onChange={setAvatar}
          testPrefix={`${idPrefix}avatar-emoji`}
        />
      </div>
      <div className="space-y-2">
        <Label>Ring color</Label>
        <div className="flex gap-1.5">
          {AVATAR_COLORS.map((swatch, index) => (
            <button
              key={swatch}
              type="button"
              data-testid={`${idPrefix}avatar-color-${index}`}
              aria-label={`color ${index + 1}`}
              onClick={() => setColor(swatch)}
              className={cn(
                "h-8 w-8 rounded-full border-2 border-stone-900 transition-transform hover:-translate-y-0.5",
                color === swatch && "ring-2 ring-stone-900 ring-offset-2",
              )}
              style={{ backgroundColor: swatch }}
            />
          ))}
        </div>
      </div>
      <Button
        data-testid={`${idPrefix}username-submit`}
        onClick={submit}
        disabled={pending}
        className="w-full border-2 border-stone-900 font-heading text-base font-black hard-shadow-sm hard-lift"
      >
        {pending ? "Lighting the torch…" : "Enter the burn unit 🔥"}
      </Button>
    </div>
  );
}

export default function UsernameDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" data-testid="username-dialog">
        <DialogHeader>
          <DialogTitle>Join the burn unit</DialogTitle>
          <DialogDescription>
            Pick a handle — no password, no paperwork. That handle is your identity; type it again
            anytime to return to your record.
          </DialogDescription>
        </DialogHeader>
       <UsernameCard idPrefix="dialog-" onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}
