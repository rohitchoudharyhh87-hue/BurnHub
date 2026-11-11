import { ROAST_THEMES } from "@/lib/themes";
import { cn } from "@/lib/utils";

export default function ThemeFlairPicker({
  value,
  onChange,
  testPrefix = "theme-chip",
}: {
  value: string;
  onChange: (id: string) => void;
  testPrefix?: string;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {ROAST_THEMES.map((theme) => (
        <button
          key={theme.id}
          type="button"
          data-testid={`${testPrefix}-${theme.id}`}
          onClick={() => onChange(theme.id)}
          className={cn(
            "rounded-full border-2 border-stone-900 px-3 py-1 text-xs font-bold transition-transform hover:-translate-y-0.5",
            value === theme.id ? "bg-[#F43F5E] text-white" : "bg-white text-stone-800",
          )}
        >
          {theme.emoji} {theme.label}
        </button>
      ))}
    </div>
  );
}
