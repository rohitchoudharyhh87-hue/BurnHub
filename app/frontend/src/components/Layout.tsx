import { Outlet } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import HeaderNav from "./HeaderNav";

export default function Layout() {
  return (
    <div className="flex min-h-svh flex-col">
      <HeaderNav />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <Outlet />
      </main>
      <footer className="border-t-2 border-stone-900 bg-[#FFF1F2] py-6 text-center text-sm font-bold text-stone-600">
        BurnHub — roast responsibly 🖤
      </footer>
      <Toaster richColors position="bottom-right" />
    </div>
  );
}
