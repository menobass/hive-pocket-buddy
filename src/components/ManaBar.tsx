import { formatDuration } from "@/lib/hive";

export function ManaBar({
  label,
  percent,
  hoursToFull,
  tone,
}: {
  label: string;
  percent: number;
  hoursToFull: number;
  tone: "hive" | "hbd";
}) {
  const low = percent < 25;
  const barColor = low ? "bg-warn" : tone === "hive" ? "bg-hive" : "bg-hbd";
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</span>
        <span className={`tnum text-sm font-semibold ${low ? "text-warn" : "text-foreground"}`}>
          {percent.toFixed(1)}%
        </span>
      </div>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className={`h-full rounded-full transition-[width] duration-500 ${barColor}`}
          style={{ width: `${Math.max(1, percent)}%` }}
        />
      </div>
      <div className="mt-1 text-[10px] text-muted-foreground">{formatDuration(hoursToFull)}</div>
    </div>
  );
}
