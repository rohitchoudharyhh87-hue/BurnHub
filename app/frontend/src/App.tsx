import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "@/components/Layout";
import Home from "@/pages/Home";
import Battles from "@/pages/Battles";
import BattleArena from "@/pages/BattleArena";
import Crews from "@/pages/Crews";
import Leaderboard from "@/pages/Leaderboard";
import Profile from "@/pages/Profile";
import Notifications from "@/pages/Notifications";

// One <Route> per page in src/pages; BrowserRouter already wraps this in main.tsx.
export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/battles" element={<Battles />} />
        <Route path="/battles/:id" element={<BattleArena />} />
        <Route path="/crews" element={<Crews />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/u/:id" element={<Profile />} />
        <Route path="/notifications" element={<Notifications />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
