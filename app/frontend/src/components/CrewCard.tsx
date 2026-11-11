import type { Crew, User } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import UserAvatar from "./UserAvatar";

export default function CrewCard({
  crew,
  members,
  me,
  onJoin,
  onChallenge,
}: {
  crew: Crew;
  members: User[];
  me: User | null;
  onJoin: (crew: Crew) => void;
  onChallenge: (crew: Crew) => void;
}) {
  const isMember = !!me && crew.member_ids.includes(me.id);

  return (
    <div
      data-testid={`crew-card-${crew.id}`}
      className="overflow-hidden rounded-2xl border-2 border-stone-900 bg-white hard-shadow"
    >
      <div
        className="flex items-center justify-between border-b-2 border-stone-900 px-4 py-3"
        style={{ backgroundColor: crew.color }}
      >
        <span className="text-3xl">{crew.emoji}</span>
        {isMember && (
          <Badge className="border-2 border-stone-900 bg-white text-stone-900">Your crew</Badge>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-heading text-lg font-black tracking-tight">{crew.name}</h3>
        <p className="mt-0.5 min-h-5 text-sm text-stone-500">{crew.tagline}</p>

        <div className="mt-3 flex items-center gap-2 text-sm font-bold text-stone-700">
          <span className="rounded-full border-2 border-stone-900 bg-[#FFEDD5] px-2.5 py-0.5">
            {crew.wins}W · {crew.losses}L
          </span>
          <span className="rounded-full border-2 border-stone-900 bg-[#FFE4E6] px-2.5 py-0.5">
            🔥 {crew.burn_points} BP
          </span>
        </div>

        <div className="mt-3 flex items-center gap-1.5">
          {members.slice(0, 5).map((member) => (
            <UserAvatar key={member.id} avatar={member.avatar} color={member.color} size="sm" className="-ml-2 first:ml-0" />
          ))}
          <span className="ml-1 text-xs font-bold text-stone-500">
            {crew.member_ids.length} member{crew.member_ids.length === 1 ? "" : "s"}
          </span>
        </div>

        <div className="mt-4 flex gap-2">
          {!isMember && (
            <Button
              data-testid={`crew-join-button-${crew.id}`}
              size="sm"
              onClick={() => onJoin(crew)}
              className="flex-1 border-2 border-stone-900 bg-white font-black hard-shadow-sm hard-lift"
            >
              Join crew
            </Button>
          )}
          <Button
            data-testid={`crew-challenge-button-${crew.id}`}
            size="sm"
            onClick={() => onChallenge(crew)}
            disabled={isMember}
            className="flex-1 border-2 border-stone-900 font-black hard-shadow-sm hard-lift"
            variant={isMember ? "secondary" : "default"}
          >
            {isMember ? "Your crew ⚔️" : "Challenge"}
          </Button>
        </div>
      </div>
    </div>
  );
}
