// Hand-written mirrors of the Pydantic models in backend/models/* — nothing infers
// across the Python boundary, so this file IS the contract. Keep the pairs in sync.

export interface User {
  id: string;
  username: string;
  avatar: string;
  color: string;
  bio: string;
  burn_points: number;
  wins: number;
  losses: number;
  streak: number;
  best_streak: number;
  roast_count: number;
  created_at: string;
}

export interface ProfileResponse {
  user: User;
  rank: number;
  best_roast: string | null;
}

export interface Crew {
  id: string;
  name: string;
  emoji: string;
  tagline: string;
  color: string;
  creator_id: string;
  member_ids: string[];
  wins: number;
  losses: number;
  burn_points: number;
  created_at: string;
}

export interface CrewDetail extends Crew {
  members: User[];
}

export interface SideRef {
  kind: "user" | "crew";
  id: string;
  name: string;
  emoji: string;
}

export interface Battle {
  id: string;
  mode: "solo" | "crew";
  theme: string;
  challenger: SideRef;
  defender: SideRef;
  challenger_member_ids: string[];
  defender_member_ids: string[];
  status: "open" | "closed";
  winner_id: string | null;
  verdict: string | null;
  challenger_score: number | null;
  defender_score: number | null;
  created_at: string;
  closed_at: string | null;
}

export interface BattleDetail extends Battle {
  roasts: Roast[];
}

export interface Roast {
  id: string;
  author_id: string;
  author_name: string;
  author_avatar: string;
  text: string;
  theme: string;
  ai_generated: boolean;
  target_user_id: string | null;
  target_name: string | null;
  target_avatar: string | null;
  battle_id: string | null;
  side: "challenger" | "defender" | null;
  ai_score: number | null;
  critique: string | null;
  fires: number;
  fired_by: string[];
  voters: string[];
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  actor_name: string;
  message: string;
  link: string | null;
  read: boolean;
  created_at: string;
}
