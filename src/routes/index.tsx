import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { AccountCard } from "@/components/AccountCard";
import { TotalsCard } from "@/components/TotalsCard";
import { InstallHint } from "@/components/InstallHint";
import { accountExists, fetchPortfolio, type PortfolioSnapshot } from "@/lib/hive";
import {
  loadAccounts,
  loadSnapshot,
  normalizeAccountName,
  saveAccounts,
  saveSnapshot,
} from "@/lib/tracked-accounts";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Hive Portfolio — VP, RC & Balances Widget" },
      {
        name: "description",
        content:
          "A phone home-screen widget for Hive: voting power, resource credits, HIVE, Hive Power and HBD balances with combined totals for every account you track.",
      },
      { property: "og:title", content: "Hive Portfolio — VP, RC & Balances Widget" },
      {
        property: "og:description",
        content:
          "Track voting power, resource credits and balances across all your Hive accounts in one glanceable screen.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: Index,
});

function Index() {
  const [accounts, setAccounts] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const [input, setInput] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cached, setCached] = useState<PortfolioSnapshot | null>(null);
  const [pull, setPull] = useState(0);
  const pullStart = useRef<number | null>(null);

  useEffect(() => {
    setAccounts(loadAccounts());
    setCached(loadSnapshot<PortfolioSnapshot>());
    setReady(true);
  }, []);

  const update = useCallback((next: string[]) => {
    setAccounts(next);
    saveAccounts(next);
  }, []);

  const query = useQuery({
    queryKey: ["portfolio", accounts],
    queryFn: () => fetchPortfolio(accounts),
    enabled: ready,
    refetchInterval: 60_000,
    placeholderData: (prev) => prev ?? cached ?? undefined,
  });

  useEffect(() => {
    if (query.data && !query.isPlaceholderData) saveSnapshot(query.data);
  }, [query.data, query.isPlaceholderData]);

  const snapshot = query.data ?? cached;

  const addAccount = async (event: React.FormEvent) => {
    event.preventDefault();
    const name = normalizeAccountName(input);
    if (!name) return;
    if (accounts.includes(name)) {
      setError(`@${name} is already tracked.`);
      return;
    }
    setAdding(true);
    setError(null);
    try {
      if (!(await accountExists(name))) {
        setError(`No Hive account named @${name}.`);
        return;
      }
      update([...accounts, name]);
      setInput("");
    } catch {
      setError("Couldn't reach Hive right now. Try again.");
    } finally {
      setAdding(false);
    }
  };

  const move = (index: number, delta: number) => {
    const next = [...accounts];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target]!, next[index]!];
    update(next);
  };

  // Pull to refresh
  const onTouchStart = (e: React.TouchEvent) => {
    if (window.scrollY <= 0) pullStart.current = e.touches[0]!.clientY;
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (pullStart.current === null) return;
    const distance = e.touches[0]!.clientY - pullStart.current;
    setPull(distance > 0 ? Math.min(80, distance * 0.5) : 0);
  };
  const onTouchEnd = () => {
    if (pull > 45) void query.refetch();
    pullStart.current = null;
    setPull(0);
  };

  return (
    <main
      className="mx-auto min-h-screen w-full max-w-md px-3 pb-24 pt-4"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      style={{ transform: pull ? `translateY(${pull}px)` : undefined }}
    >
      {pull > 0 && (
        <div className="mb-2 text-center text-[11px] text-muted-foreground">
          {pull > 45 ? "Release to refresh" : "Pull to refresh"}
        </div>
      )}

      <TotalsCard
        snapshot={snapshot ?? null}
        isFetching={query.isFetching}
        onRefresh={() => void query.refetch()}
        accountCount={accounts.length}
      />

      {query.isError && (
        <p className="mt-3 rounded-lg border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive">
          Couldn't reach the Hive network. Showing the last saved numbers.
        </p>
      )}

      <div className="mt-3 space-y-3">
        {snapshot?.accounts.map((account, index) => (
          <AccountCard
            key={account.name}
            account={account}
            onRemove={() => update(accounts.filter((a) => a !== account.name))}
            onMoveUp={() => move(index, -1)}
            onMoveDown={() => move(index, 1)}
            canMoveUp={index > 0}
            canMoveDown={index < accounts.length - 1}
          />
        ))}

        {ready && accounts.length === 0 && (
          <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Add a Hive account below to start tracking it.
          </div>
        )}

        {snapshot?.missing.map((name) => (
          <div
            key={name}
            className="flex items-center justify-between rounded-xl border border-border bg-card p-3 text-xs text-muted-foreground"
          >
            <span>@{name} not found on Hive</span>
            <button
              type="button"
              className="text-destructive"
              onClick={() => update(accounts.filter((a) => a !== name))}
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      <form onSubmit={addAccount} className="mt-4 flex gap-2">
        <input
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setError(null);
          }}
          placeholder="hive username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          aria-label="Hive account name"
          className="h-10 flex-1 rounded-lg border border-border bg-input px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-ring"
        />
        <button
          type="submit"
          disabled={adding || !input.trim()}
          className="flex h-10 items-center gap-1 rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground disabled:opacity-40"
        >
          {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Add
        </button>
      </form>
      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}

      <div className="mt-4">
        <InstallHint />
      </div>

      <p className="mt-6 text-center text-[10px] text-muted-foreground">
        Public read-only data from the Hive blockchain. Your account list stays on this device.
      </p>
    </main>
  );
}
