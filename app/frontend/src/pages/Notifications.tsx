import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCheck } from "lucide-react";
import { apiGet, apiPost } from "@/lib/api";
import { useMe } from "@/lib/session";
import { timeAgo } from "@/lib/burn";
import { cn } from "@/lib/utils";
import type { Notification } from "@/lib/types";
import { Button } from "@/components/ui/button";

const TYPE_ICONS: Record<string, string> = {
  roast_received: "💀",
  battle_challenge: "⚔️",
  battle_result: "🏆",
  fire: "🔥",
  vote: "🗳️",
};

export default function Notifications() {
  const { data: me } = useMe();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const notificationsQuery = useQuery({
    queryKey: ["notifications"],
    queryFn: () => apiGet<Notification[]>("/notifications"),
    enabled: !!me,
    retry: false,
  });

  const markReadMutation = useMutation({
    mutationFn: () => apiPost<Notification[]>("/notifications/read-all"),
    onSuccess: (updated) => {
      queryClient.setQueryData(["notifications"], updated);
      toast.success("All caught up — the smoke has settled");
    },
    onError: () => toast.error("Could not mark read — try again"),
  });

  const notifications = notificationsQuery.data ?? [];
  const unread = notifications.filter((n) => !n.read).length;

  if (!me) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-stone-400 bg-white p-8 text-center font-bold text-stone-500" data-testid="notifications-login-prompt">
        Pick a handle first (top right) — then your roast pings land here.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-3xl font-black tracking-tight">Roast pings</h1>
          <p className="text-sm font-medium text-stone-500">
            Who roasted you, who lit your fire, who challenged your crew.
          </p>
        </div>
        {unread > 0 && (
          <Button
            data-testid="notifications-mark-read"
            onClick={() => markReadMutation.mutate()}
            disabled={markReadMutation.isPending}
            className="border-2 border-stone-900 bg-white font-black hard-shadow-sm hard-lift"
          >
            <CheckCheck className="h-4 w-4" />
            Mark all read ({unread})
          </Button>
        )}
      </div>

      {notificationsQuery.isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((index) => (
            <div key={index} className="h-20 animate-pulse rounded-2xl border-2 border-stone-900 bg-white/60" />
          ))}
        </div>
      )}

      {notificationsQuery.isError && !notificationsQuery.data && (
        <div className="rounded-2xl border-2 border-dashed border-stone-400 bg-white p-8 text-center font-bold text-stone-500">
          The pings can't be reached right now — check back soon.
        </div>
      )}

      {notifications.length === 0 && !notificationsQuery.isLoading && (
        <div className="rounded-2xl border-2 border-dashed border-stone-400 bg-white p-8 text-center font-bold text-stone-500" data-testid="notifications-empty">
          Silence. Suspiciously quiet — go roast somebody.
        </div>
      )}

      <ul className="space-y-3">
        {notifications.map((notification) => (
          <li key={notification.id}>
            <button
              type="button"
              data-testid={`notification-item-${notification.id}`}
              onClick={() => notification.link && navigate(notification.link)}
              className={cn(
                "flex w-full items-start gap-3 rounded-2xl border-2 border-stone-900 p-4 text-left transition-transform hover:-translate-y-0.5 hard-shadow-sm",
                notification.read ? "bg-white" : "bg-[#FFF7ED]",
              )}
            >
              <span className="text-2xl" aria-hidden>
                {TYPE_ICONS[notification.type] ?? "🔥"}
              </span>
              <span className="flex-1">
                <span className="block text-sm font-bold">{notification.message}</span>
                <span className="mt-0.5 block text-xs font-bold text-stone-400">
                  {notification.actor_name} · {timeAgo(notification.created_at)}
                </span>
              </span>
              {!notification.read && (
                <span
                  aria-hidden
                  className="mt-1 h-3 w-3 shrink-0 rounded-full border-2 border-stone-900 bg-[#F43F5E]"
                />
              )}
            </button>
          </li>
        ))}
      </ul>

      {notifications.some((n) => n.type === "roast_received") && (
        <p className="text-center text-sm font-bold text-stone-400">
          Someone burned you?{" "}
          <Link to="/" className="text-[#E11D48] underline">
            Roast back from the composer
          </Link>
        </p>
      )}
    </div>
  );
}
