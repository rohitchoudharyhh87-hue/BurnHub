import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Bell, Flame } from "lucide-react";
import { apiGet } from "@/lib/api";
import { useMe } from "@/lib/session";
import type { Notification } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import UserAvatar from "./UserAvatar";
import UsernameDialog from "./UsernameDialog";

const NAV_ITEMS = [
  { to: "/", label: "Feed", testid: "nav-feed" },
  { to: "/battles", label: "Battles", testid: "nav-battles" },
  { to: "/crews", label: "Crews", testid: "nav-crews" },
  { to: "/leaderboard", label: "Leaderboard", testid: "nav-leaderboard" },
];

export default function HeaderNav() {
  const { data: me } = useMe();
  const [loginOpen, setLoginOpen] = useState(false);

  const { data: notifications } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => apiGet<Notification[]>("/notifications"),
    enabled: !!me,
    refetchInterval: 20_000,
    retry: false,
  });
  const unread = notifications?.filter((n) => !n.read).length ?? 0;

  return (
    <header
      data-testid="header-nav"
      className="sticky top-0 z-40 border-b-2 border-stone-900 bg-[#FFFDF7]/90 backdrop-blur-md"
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
        <Link
          to="/"
          data-testid="header-logo"
          className="flex items-center gap-2 font-heading text-2xl font-black tracking-tight"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-xl border-2 border-stone-900 bg-[#F43F5E] hard-shadow-sm">
            <Flame className="h-5 w-5 text-white" />
          </span>
          BurnHub
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              data-testid={item.testid}
              className={({ isActive }) =>
                cn(
                  "rounded-full border-2 border-stone-900 px-4 py-1.5 text-sm font-bold transition-transform hover:-translate-y-0.5",
                  isActive ? "bg-stone-900 text-[#FFFDF7]" : "bg-white text-stone-800",
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {me ? (
            <>
              <Link
                to="/notifications"
                data-testid="nav-notifications"
                aria-label="notifications"
                className="relative flex h-10 w-10 items-center justify-center rounded-full border-2 border-stone-900 bg-white hard-shadow-sm hard-lift"
              >
                <Bell className="h-5 w-5" />
                {unread > 0 && (
                  <span
                    data-testid="notifications-unread-badge"
                    className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-stone-900 bg-[#F43F5E] px-1 text-[10px] font-black text-white"
                  >
                    {unread}
                  </span>
                )}
              </Link>
              <Link
                to={`/u/${me.id}`}
                data-testid="header-user-chip"
                className="flex items-center gap-2 rounded-full border-2 border-stone-900 bg-white py-1 pl-1 pr-3 hard-shadow-sm hard-lift"
              >
                <UserAvatar avatar={me.avatar} color={me.color} size="sm" />
                <span className="hidden text-sm font-bold sm:block">{me.username}</span>
                <span className="rounded-full bg-[#F43F5E] px-2 py-0.5 text-xs font-black text-white">
                  {me.burn_points} BP
                </span>
              </Link>
            </>
          ) : (
            <Button
              data-testid="header-login-button"
              onClick={() => setLoginOpen(true)}
              className="border-2 border-stone-900 font-black hard-shadow-sm hard-lift"
            >
              Pick your handle 🔥
            </Button>
          )}
        </div>
      </div>

      {/* Mobile nav rail */}
      <nav className="flex items-center justify-around border-t-2 border-stone-900 bg-white py-1.5 md:hidden">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            data-testid={`${item.testid}-mobile`}
            className={({ isActive }) =>
              cn(
                "rounded-full px-3 py-1 text-xs font-bold",
                isActive ? "bg-stone-900 text-[#FFFDF7]" : "text-stone-700",
              )
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      <UsernameDialog open={loginOpen} onOpenChange={setLoginOpen} />
    </header>
  );
}
