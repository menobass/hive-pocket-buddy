import { RefreshCw } from "lucide-react";
import { formatNumber, formatUsd, type PortfolioSnapshot } from "@/lib/hive";

export function TotalsCard({
  snapshot,
  isFetching,
  onRefresh,
  accountCount,
}: {
  snapshot: PortfolioSnapshot | null;
  isFetching: boolean;
  onRefresh: () => void;
  accountCount: number;
}) {
  const totals = snapshot?.totals;
  const updated = snapshot
    ? new Date(snapshot.fetchedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "—";

  return (
    <section className="rounded-2xl border border-border bg-gradient-to-b from-surface to-card p-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Hive portfolio
          </h1>
          <p className="tnum mt-1 text-3xl font-bold leading-none">
            {formatUsd(totals?.usd ?? 0)}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {accountCount} account{accountCount === 1 ? "" : "s"} · updated {updated}
          </p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          aria-label="Refresh balances"
          className="rounded-full border border-border p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3 border-t border-border pt-3">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Hive Power
          </div>
          <div className="tnum text-base font-semibold">{formatNumber(totals?.hivePower ?? 0, 0)}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">HIVE</div>
          <div className="tnum text-base font-semibold text-hive">
            {formatNumber(totals?.hive ?? 0, 0)}
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">HBD</div>
          <div className="tnum text-base font-semibold text-hbd">
            {formatNumber(totals?.hbd ?? 0, 0)}
          </div>
        </div>
      </div>

      {snapshot && (
        <p className="tnum mt-3 text-[10px] text-muted-foreground">
          HIVE {formatUsd(snapshot.hiveUsd)} · HBD {formatUsd(snapshot.hbdUsd)}
        </p>
      )}
    </section>
  );
}
