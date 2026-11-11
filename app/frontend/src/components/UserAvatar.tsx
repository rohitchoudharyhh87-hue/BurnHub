import { cn } from "@/lib/utils";

const SIZES = {
  sm: "h-8 w-8 text-base",
  md: "h-10 w-10 text-xl",
  lg: "h-14 w-14 text-2xl",
  xl: "h-20 w-20 text-4xl",
} as const;

export default function UserAvatar({
  avatar,
  color,
  size = "md",
  className,
}: {
  avatar: string;
  color: string;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  return (
    <div
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full border-2 border-stone-900",
        SIZES[size],
        className,
      )}
      style={{ backgroundColor: color }}
    >
      {avatar}
    </div>
  );
}
