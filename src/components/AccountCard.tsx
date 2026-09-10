import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { ManaBar } from "./ManaBar";
import { formatNumber, formatUsd, type AccountSnapshot } from "@/lib/hive";

function Stat({ label, value, tone }: { label: string; value: string; tone?: "hive" | "hbd" }) {
  const color = tone === "hive" ? "text-hive" : tone === "hbd" ? "text-hbd" : "text-foreground";
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className={`tnum text-sm font-semibold ${color}`}>{value}</div>
    </div>
  );
}

export function AccountCard({
  account,
  onRemove,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
}: {
  account: AccountSnapshot;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
}) {
  const rewards = account.rewardHive + account.rewardHbd + account.rewardHp;
  const savings = account.hiveSavings + account.hbdSavings;

  return (
    <article className="rounded-xl border border-border bg-card p-3">
      <header className="flex items-center gap-2">
        <img
          src={`https://images.hive.blog/u/${account.name}/avatar/small`}
          alt=""
          loading="lazy"
          className="h-8 w-8 rounded-full bg-secondary object-cover"
        />
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-semibold">@{account.name}</h2>
          <p className="tnum text-[11px] text-muted-foreground">{formatUsd(account.usd)}</p>
        </div>
        <div className="flex items-center gap-0.5 text-muted-foreground">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={!canMoveUp}
            aria-label={`Move ${account.name} up`}
            className="rounded p-1.5 transition-colors hover:bg-accent disabled:opacity-25"
          >
            <ChevronUp className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={!canMoveDown}
            aria-label={`Move ${account.name} down`}
            className="rounded p-1.5 transition-colors hover:bg-accent disabled:opacity-25"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onRemove}
            aria-label={`Stop tracking ${account.name}`}
            className="rounded p-1.5 transition-colors hover:bg-accent hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </header>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <ManaBar
          label="Voting power"
          percent={account.votingPower}
          hoursToFull={account.votingFullInHours}
          tone="hive"
        />
        <ManaBar
          label="Resource credits"
          percent={account.rcPercent}
          hoursToFull={account.rcFullInHours}
          tone="hbd"
        />
      </div>

      <div className="mt-3 grid grid-cols-3 gap-3 border-t border-border pt-3">
        <Stat label="HIVE" value={formatNumber(account.hive)} tone="hive" />
        <Stat label="Hive Power" value={formatNumber(account.hivePower)} />
        <Stat label="HBD" value={formatNumber(account.hbd)} tone="hbd" />
      </div>

      {savings > 0 && (
        <div className="mt-3 grid grid-cols-3 gap-3 border-t border-border pt-3">
          <Stat label="HIVE savings" value={formatNumber(account.hiveSavings)} />
          <Stat label="HBD savings" value={formatNumber(account.hbdSavings)} />
        </div>
      )}

      {rewards > 0 && (
        <div className="mt-3 rounded-lg border border-warn/40 bg-warn/10 p-2">
          <div className="text-[10px] uppercase tracking-widest text-warn">Unclaimed rewards</div>
          <div className="tnum mt-0.5 text-xs text-foreground">
            {formatNumber(account.rewardHive)} HIVE · {formatNumber(account.rewardHp)} HP ·{" "}
            {formatNumber(account.rewardHbd)} HBD
          </div>
        </div>
      )}
    </article>
  );
}
